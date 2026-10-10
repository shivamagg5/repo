import { WaitingRoomService } from './waiting-room.service';
import { UnauthorizedException } from '@nestjs/common';

describe('WaitingRoomService — High-Concurrency Virtual Queue & Waiting Room Engine', () => {
  let service: WaitingRoomService;
  const eventId = 'colplay-mumbai-2026-arena';

  beforeEach(() => {
    service = new WaitingRoomService();
  });

  describe('Direct Admission (Waiting Room Inactive)', () => {
    it('should immediately admit users with signed tokens when waiting room is not enabled', () => {
      const res = service.joinQueue(eventId, 'usr-fan-1', '192.168.1.1');
      expect(res.status).toBe('ADMITTED');
      expect(res.admitToken).toBeDefined();

      // Verify the generated token
      const verification = service.verifyAdmitToken(eventId, res.admitToken!);
      expect(verification.isValid).toBe(true);
      expect(verification.userId).toBe('usr-fan-1');
    });
  });

  describe('FIFO Queue Ordering & Admission Flow', () => {
    beforeEach(() => {
      service.configureWaitingRoom(eventId, {
        enabled: true,
        batchSize: 2,
        batchIntervalMs: 10000,
        maxHoldTimeMinutes: 10,
      });
    });

    it('should place incoming users into FIFO queue with accurate positions and wait times', () => {
      const fan1 = service.joinQueue(eventId, 'usr-fan-1', '10.0.0.1');
      expect(fan1.status).toBe('WAITING');
      expect(fan1.position).toBe(1);
      expect(fan1.totalWaitingAhead).toBe(0);

      const fan2 = service.joinQueue(eventId, 'usr-fan-2', '10.0.0.2');
      expect(fan2.status).toBe('WAITING');
      expect(fan2.position).toBe(2);
      expect(fan2.totalWaitingAhead).toBe(1);

      const fan3 = service.joinQueue(eventId, 'usr-fan-3', '10.0.0.3');
      expect(fan3.status).toBe('WAITING');
      expect(fan3.position).toBe(3);
      expect(fan3.totalWaitingAhead).toBe(2);
    });

    it('should preserve queue position if user checks status or reconnects without losing their place', () => {
      const fan1 = service.joinQueue(eventId, 'usr-fan-1', '10.0.0.1');
      const fan2 = service.joinQueue(eventId, 'usr-fan-2', '10.0.0.2');

      // Fan 1 polls status again
      const repoll = service.joinQueue(eventId, 'usr-fan-1', '10.0.0.1');
      expect(repoll.position).toBe(1);
      expect(repoll.status).toBe('WAITING');
    });

    it('should admit users in exact batches and grant cryptographically signed tokens', () => {
      service.joinQueue(eventId, 'usr-fan-1', '10.0.0.1');
      service.joinQueue(eventId, 'usr-fan-2', '10.0.0.2');
      service.joinQueue(eventId, 'usr-fan-3', '10.0.0.3');

      // Batch size configured to 2
      const batch1 = service.admitNextBatch(eventId);
      expect(batch1.admittedCount).toBe(2);
      expect(batch1.remainingWaiting).toBe(1);

      // Check status of admitted fan 1
      const fan1Token: any = Array.from((service as any).tokenIndex.values()).find(
        (e: any) => e.userId === 'usr-fan-1',
      );
      expect(fan1Token.status).toBe('ADMITTED');
      expect(fan1Token.admitToken).toBeDefined();

      const verification = service.verifyAdmitToken(eventId, fan1Token.admitToken!);
      expect(verification.isValid).toBe(true);
      expect(verification.userId).toBe('usr-fan-1');
    });
  });

  describe('Cryptographic Token Security & Anti-Tamper Safeguards', () => {
    it('should reject tampered admission token signatures', () => {
      const valid = service.joinQueue(eventId, 'usr-hacker', '10.0.0.9');
      const token = valid.admitToken!;

      // Tamper with payload
      const parts = token.split('.');
      parts[1] = Buffer.from(JSON.stringify({ eventId, userId: 'fake-vip', exp: Date.now() + 999999 })).toString('base64url');
      const tamperedToken = parts.join('.');

      expect(() => service.verifyAdmitToken(eventId, tamperedToken)).toThrow(UnauthorizedException);
    });

    it('should reject token submitted for a different event', () => {
      const token = service.joinQueue(eventId, 'usr-fan', '10.0.0.1').admitToken!;
      expect(() => service.verifyAdmitToken('different-festival-id', token)).toThrow(UnauthorizedException);
    });
  });
});
