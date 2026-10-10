import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeService } from './realtime.service';
import { RealtimeController } from './realtime.controller';
import { firstValueFrom, toArray, take } from 'rxjs';

describe('RealtimeModule (SSE & Event Streaming)', () => {
  let service: RealtimeService;
  let controller: RealtimeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RealtimeController],
      providers: [RealtimeService],
    }).compile();

    service = module.get<RealtimeService>(RealtimeService);
    controller = module.get<RealtimeController>(RealtimeController);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });

  describe('Inventory Stream SSE', () => {
    it('should stream real-time inventory updates for matching eventId', async () => {
      const eventId = '00000000-0000-0000-0000-000000000001';
      const otherEventId = '00000000-0000-0000-0000-000000000002';

      const stream = controller.streamInventoryUpdates(eventId);

      // Listen for the first event
      const eventPromise = firstValueFrom(stream);

      // Publish to other event (should not be received)
      service.publishInventoryUpdate(otherEventId, {
        eventId: otherEventId,
        ticketTypeId: 'tier-other',
        remainingCapacity: 50,
        heldCapacity: 10,
        totalCapacity: 60,
        timestamp: new Date().toISOString(),
      });

      // Publish to targeted event
      service.publishInventoryUpdate(eventId, {
        eventId,
        ticketTypeId: 'tier-vip',
        remainingCapacity: 19,
        heldCapacity: 1,
        totalCapacity: 20,
        timestamp: new Date().toISOString(),
      });

      const received = await eventPromise;
      expect(received).toBeDefined();
      expect(received.type).toBe('inventory_update');
      expect((received.data as any).ticketTypeId).toBe('tier-vip');
      expect((received.data as any).remainingCapacity).toBe(19);
      expect((received.data as any).heldCapacity).toBe(1);
    });
  });

  describe('Gate Scan Stream SSE', () => {
    it('should stream real-time gate scan admissions for matching eventId', async () => {
      const eventId = '00000000-0000-0000-0000-000000000001';
      const stream = controller.streamGateScans(eventId);

      const eventPromise = firstValueFrom(stream);

      service.publishScanEvent(eventId, {
        eventId,
        ticketId: 'tkt-123',
        ticketNumber: 'TKT-LIVE-001',
        tierName: 'VIP Pass',
        attendeeName: 'Alex Rivera',
        gate: 'North Gate',
        scannedAt: new Date().toISOString(),
        status: 'admitted',
      });

      const received = await eventPromise;
      expect(received).toBeDefined();
      expect(received.type).toBe('gate_scan');
      expect((received.data as any).ticketNumber).toBe('TKT-LIVE-001');
      expect((received.data as any).status).toBe('admitted');
      expect((received.data as any).attendeeName).toBe('Alex Rivera');
    });

    it('should stream duplicate scan warnings in real-time', async () => {
      const eventId = '00000000-0000-0000-0000-000000000001';
      const stream = controller.streamGateScans(eventId);

      const eventPromise = firstValueFrom(stream);

      service.publishScanEvent(eventId, {
        eventId,
        ticketId: 'tkt-123',
        ticketNumber: 'TKT-LIVE-001',
        tierName: 'VIP Pass',
        attendeeName: 'Alex Rivera',
        gate: 'South Gate',
        scannedAt: new Date().toISOString(),
        status: 'duplicate',
      });

      const received = await eventPromise;
      expect(received).toBeDefined();
      expect(received.type).toBe('gate_scan');
      expect((received.data as any).status).toBe('duplicate');
    });
  });

  describe('Turnstile Telemetry Stream SSE & Snapshot', () => {
    it('should aggregate and stream turnstile telemetry upon scan events', async () => {
      const eventId = '00000000-0000-0000-0000-000000000001';
      const stream = controller.streamTurnstileTelemetry(eventId);

      const telemetryPromise = firstValueFrom(stream);

      service.publishScanEvent(eventId, {
        eventId,
        ticketId: 'tkt-vip-1',
        ticketNumber: 'TKT-VIP-001',
        tierName: 'VIP Pass',
        attendeeName: 'Alex Rivera',
        gate: 'North Gate',
        scannedAt: new Date().toISOString(),
        status: 'admitted',
      });

      const received = await telemetryPromise;
      expect(received).toBeDefined();
      expect(received.type).toBe('turnstile_telemetry');
      const data = received.data as any;
      expect(data.eventId).toBe(eventId);
      expect(data.totalAdmitted).toBe(1);
      expect(data.ingressVelocityPerMin).toBeGreaterThanOrEqual(1);
      expect(data.gateBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ gate: 'North Gate', admittedCount: 1 }),
        ]),
      );
      expect(data.tierBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tierName: 'VIP Pass', admittedCount: 1 }),
        ]),
      );
    });

    it('should return snapshot with accurate gate breakdown and alert count', () => {
      const eventId = '00000000-0000-0000-0000-000000000009';

      // 1 successful scan + 1 alert
      service.publishScanEvent(eventId, {
        eventId,
        ticketId: 'tkt-ga-1',
        ticketNumber: 'TKT-GA-001',
        tierName: 'General Admission',
        attendeeName: 'Attendee 1',
        gate: 'East Turnstile',
        scannedAt: new Date().toISOString(),
        status: 'admitted',
      });

      service.publishScanEvent(eventId, {
        eventId,
        ticketId: 'tkt-ga-1',
        ticketNumber: 'TKT-GA-001',
        tierName: 'General Admission',
        attendeeName: 'Attendee 1',
        gate: 'East Turnstile',
        scannedAt: new Date().toISOString(),
        status: 'duplicate',
      });

      const snapshot = controller.getTurnstileTelemetrySnapshot(eventId);
      expect(snapshot.eventId).toBe(eventId);
      expect(snapshot.totalAdmitted).toBe(1);
      expect(snapshot.recentAlertsCount).toBe(1);
      expect(snapshot.gateBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ gate: 'East Turnstile', admittedCount: 1 }),
        ]),
      );
    });
  });
});

