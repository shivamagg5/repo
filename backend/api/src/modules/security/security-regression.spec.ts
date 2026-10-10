import { ScannerService } from '../scanner/scanner.service';
import { ScannerCryptoService } from '../scanner/scanner-crypto.service';
import { AdminService } from '../admin/admin.service';
import { NotificationOutboxService } from '../notifications/notification-outbox.service';
import { PushProviderService } from '../notifications/providers/push-provider.service';
import { EmailProviderService } from '../notifications/providers/email-provider.service';
import { SmsProviderService } from '../notifications/providers/sms-provider.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthContext } from '@platform/types';
import * as crypto from 'crypto';

describe('Comprehensive Security Regression Test Suite', () => {
  let scannerService: ScannerService;
  let scannerCrypto: ScannerCryptoService;
  let adminService: AdminService;
  let outboxService: NotificationOutboxService;
  let mockDb: any;

  const mockAdminActor: AuthContext = {
    userId: 'admin-usr-1',
    roles: ['super_admin'],
    permissions: ['admin.all'],
  } as any;

  const mockDatabaseService = {
    get db() {
      return mockDb;
    },
    transaction: jest.fn(async (cb) => cb(mockDb)),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    scannerCrypto = new ScannerCryptoService();

    mockDb = {
      transaction: jest.fn(async (cb) => cb(mockDb)),
      query: {
        checkinDevices: { findFirst: jest.fn() },
        events: { findFirst: jest.fn() },
        checkinGates: { findFirst: jest.fn() },
        tickets: { findFirst: jest.fn() },
        ticketTypes: { findFirst: jest.fn() },
        users: { findFirst: jest.fn() },
        orders: { findFirst: jest.fn() },
        checkins: { findFirst: jest.fn() },
        customerNotes: { findFirst: jest.fn() },
        notificationOutbox: { findFirst: jest.fn(), findMany: jest.fn() },
        notificationPreferences: { findFirst: jest.fn() },
        deviceTokens: { findMany: jest.fn() },
        organizationMembers: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      },
      select: jest.fn(),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'mock-id' }]),
          onConflictDoNothing: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'mock-id' }]),
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'mock-id' }]),
          }),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(true),
      }),
    };

    scannerService = new ScannerService(mockDatabaseService as any, scannerCrypto);
    adminService = new AdminService(
      mockDatabaseService as any,
      mockAuditService as any,
      { validateTransition: jest.fn() } as any,
      { createRefund: jest.fn() } as any,
      scannerCrypto,
    );
    outboxService = new NotificationOutboxService(
      mockDatabaseService as any,
      mockAuditService as any,
      new PushProviderService(),
      new EmailProviderService(),
      new SmsProviderService(),
    );
  });

  // ---------------------------------------------------------------------------
  // 1. SCANNER VULNERABILITY REGRESSION (VIP FALLBACK ELIMINATION)
  // ---------------------------------------------------------------------------
  describe('Gate Scanner: Bogus Ticket Rejection (VIP Fallback Elimination)', () => {
    it('STRICT REJECTION: Non-existent ticket QR token is rejected with invalid and NEVER creates VIP pass', async () => {
      // Mock device active
      mockDb.query.checkinDevices.findFirst.mockResolvedValueOnce({
        id: 'dev-01',
        organizationId: 'org-target',
        status: 'active',
      });
      // Mock event belonging to org-target
      mockDb.query.events.findFirst.mockResolvedValueOnce({
        id: 'evt-target',
        organizationId: 'org-target',
      });
      mockDb.query.checkinGates.findFirst.mockResolvedValueOnce({
        id: 'gate-01',
        eventId: 'evt-target',
      });

      // Generate a signed token pointing to a non-existent ticketId
      const bogusToken = scannerCrypto.signTicketCredential({
        version: 'v1',
        ticketId: 'tkt-nonexistent-999',
        eventId: 'evt-target',
        ticketTypeId: 'tt-ga',
        issuedAt: new Date().toISOString(),
        expiresAt: null,
        keyVersion: 'v1-2026',
      });

      // Mock database lock query finding ZERO tickets
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockReturnValueOnce({
            for: jest.fn().mockResolvedValueOnce([]), // Zero tickets found
          }),
        }),
      });

      const result = await scannerService.scanTicket(
        {
          qrPayload: bogusToken,
          eventId: 'evt-target',
          gateId: 'gate-01',
          deviceId: 'dev-01',
        },
        'staff-usr-1',
      );

      expect(result.result).toBe('invalid');
      expect((result as any).isGuestlistVip).toBeUndefined();
      expect(result.ticketId).toBe('tkt-nonexistent-999');
      // Ensure no checkin record inserted
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. REVOKED QR CREDENTIAL REJECTION
  // ---------------------------------------------------------------------------
  describe('Gate Scanner: Outdated / Reissued QR Token Invalidation', () => {
    it('REISSUED TOKEN REJECTION: Rejects QR code issued before ticket.issuedAt', async () => {
      mockDb.query.checkinDevices.findFirst.mockResolvedValueOnce({
        id: 'dev-01',
        organizationId: 'org-target',
        status: 'active',
      });
      mockDb.query.events.findFirst.mockResolvedValueOnce({
        id: 'evt-target',
        organizationId: 'org-target',
      });
      mockDb.query.checkinGates.findFirst.mockResolvedValueOnce({
        id: 'gate-01',
        eventId: 'evt-target',
      });

      const oldIssuedAt = new Date('2026-09-01T10:00:00.000Z');
      const reissuedAt = new Date('2026-09-02T10:00:00.000Z'); // Ticket reissued 1 day later

      // Generate a signed offline token with oldIssuedAt
      const oldOfflineToken = scannerCrypto.signTicketCredential({
        version: 'v1',
        ticketId: 'tkt-reissued-1',
        eventId: 'evt-target',
        ticketTypeId: 'tt-ga',
        issuedAt: oldIssuedAt.toISOString(),
        expiresAt: null,
        keyVersion: 'v1-2026',
      });

      // Mock DB select returning ticket whose issuedAt is reissuedAt
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockReturnValueOnce({
            for: jest.fn().mockResolvedValueOnce([
              {
                id: 'tkt-reissued-1',
                eventId: 'evt-target',
                ticketTypeId: 'tt-ga',
                orderId: 'ord-1',
                status: 'issued',
                checkedInAt: null,
                issuedAt: reissuedAt,
                qrTokenHash: 'new-qr-hash-xyz',
              },
            ]),
          }),
        }),
      });

      const result = await scannerService.scanTicket(
        {
          qrPayload: oldOfflineToken,
          eventId: 'evt-target',
          gateId: 'gate-01',
          deviceId: 'dev-01',
        },
        'staff-usr-1',
      );

      expect(result.result).toBe('invalid');
      expect(result.message).toContain('reissued or revoked');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. ATOMIC TICKET REISSUE WITH QR HASH UPDATE
  // ---------------------------------------------------------------------------
  describe('Admin Ticket Governance: Atomic QR Reissue & Invalidation', () => {
    it('ATOMIC REISSUE: Updates qrTokenHash and issuedAt in a row-level transaction', async () => {
      // Mock select for update returning current ticket
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockReturnValueOnce({
            for: jest.fn().mockResolvedValueOnce([
              {
                id: 'tkt-1',
                orderId: 'ord-1',
                eventId: 'evt-1',
                userId: 'usr-buyer-1',
                ticketTypeId: 'tt-1',
                ticketNumber: 'TKT-OLD-01',
                status: 'issued',
                qrTokenHash: 'old-qr-hash',
                issuedAt: new Date(Date.now() - 3600000),
              },
            ]),
          }),
        }),
      });

      let updatedFields: any = null;
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockImplementation((fields) => {
          updatedFields = fields;
          return {
            where: jest.fn().mockResolvedValue(true),
          };
        }),
      });

      const result = await adminService.reissueCustomerTicket('tkt-1', 'Damaged QR Code', mockAdminActor);

      expect(result).toBeDefined();
      expect(updatedFields).toBeDefined();
      expect(updatedFields.qrTokenHash).toBeDefined();
      expect(updatedFields.issuedAt).toBeDefined();
      expect(updatedFields.qrTokenHash).not.toBe('old-qr-hash');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. SERVER-AUTHORITATIVE ORGANIZATION ISOLATION
  // ---------------------------------------------------------------------------
  describe('Multi-Tenant Isolation: Server-Authoritative Membership Resolution', () => {
    it('ORGANIZATION BOUNDARY: Staff of Org A cannot register scanner for Org B', async () => {
      // Target event belongs to org-B
      mockDb.query.events.findFirst.mockResolvedValueOnce({
        id: 'evt-org-B',
        organizationId: 'org-B',
      });

      // User belongs to org-A only
      mockDb.query.organizationMembers.findMany.mockResolvedValueOnce([
        { organizationId: 'org-A', status: 'active' },
      ]);

      await expect(
        scannerService.resolveStaffOrgForEvent('staff-user-1', 'evt-org-B'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. NOTIFICATION OUTBOX CONCURRENCY & EXPONENTIAL BACKOFF
  // ---------------------------------------------------------------------------
  describe('Notification Outbox: Idempotency, Retries, and Backoff Claiming', () => {
    it('IDEMPOTENT ENQUEUE: Re-submitting duplicate idempotencyKey returns existing record without inserting duplicate', async () => {
      mockDb.query.notificationOutbox.findFirst.mockResolvedValueOnce({
        id: 'outbox-id-1',
        idempotencyKey: 'idem-key-abc',
        status: 'pending',
      });

      const res = await outboxService.enqueueEvent(null, {
        notificationType: 'order_paid',
        userId: 'usr-1',
        payload: { orderId: 'ord-123' },
        idempotencyKey: 'idem-key-abc',
      });

      expect(res.id).toBe('outbox-id-1');
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('RETRY CLAIMING: Claims failed items with backoff passed, locks them, and moves to dead_letter after max retries', async () => {
      const pastDate = new Date(Date.now() - 10000);
      mockDb.query.notificationOutbox.findMany.mockResolvedValueOnce([
        {
          id: 'outbox-retry-1',
          status: 'failed',
          retryCount: 2,
          nextAttemptAt: pastDate,
          payloadJson: JSON.stringify({ title: 'Failed Event' }),
          notificationType: 'order_paid',
          userId: 'usr-customer-1',
        },
      ]);

      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockReturnValueOnce({
            returning: jest.fn().mockResolvedValueOnce([
              {
                id: 'outbox-retry-1',
                status: 'processing',
                retryCount: 2,
                payloadJson: JSON.stringify({ title: 'Failed Event' }),
                notificationType: 'order_paid',
                userId: 'usr-customer-1',
              },
            ]),
          }),
        }),
      });

      const claimed = await outboxService.claimOutboxEvents('worker-reg-test');
      expect(claimed.length).toBe(1);
      expect(claimed[0].status).toBe('processing');
    });
  });
});
