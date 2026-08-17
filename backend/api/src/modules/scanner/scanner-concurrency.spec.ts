import { ScannerService } from './scanner.service';
import { ScannerCryptoService } from './scanner-crypto.service';
import { ConflictException } from '@nestjs/common';

describe('ScannerService — Concurrency, Duplicate Scans, and Offline Sync Audit Suite', () => {
  let scannerService: ScannerService;
  let cryptoService: ScannerCryptoService;
  let mockDb: any;
  let mockDatabaseService: any;
  let insertedCheckins: any[] = [];

  beforeEach(() => {
    delete process.env.NODE_ENV;
    cryptoService = new ScannerCryptoService();
    insertedCheckins = [];

    mockDb = {
      query: {
        checkinDevices: { findFirst: jest.fn() },
        events: { findFirst: jest.fn() },
        checkinGates: { findFirst: jest.fn() },
        tickets: { findFirst: jest.fn() },
        ticketTypes: { findFirst: jest.fn().mockResolvedValue({ name: 'VIP Access' }) },
        users: { findFirst: jest.fn().mockResolvedValue({ name: 'Simran K' }) },
        orders: { findFirst: jest.fn().mockResolvedValue({ purchaserName: 'Simran K' }) },
        checkins: { findFirst: jest.fn() },
      },
      insert: jest.fn().mockImplementation(() => ({
        values: jest.fn().mockImplementation((val) => {
          insertedCheckins.push(val);
          return {
            returning: jest.fn().mockResolvedValue([val]),
          };
        }),
      })),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(true),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            for: jest.fn().mockResolvedValue([
              {
                id: 'tck-100',
                orderId: 'ord-1',
                ticketTypeId: 'tkt-vip',
                eventId: 'evt-summer-2026',
                ticketNumber: 'TKT-100-VIP',
                status: 'issued',
                checkedInAt: null,
              },
            ]),
          }),
        }),
      }),
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockDb)),
    };

    mockDatabaseService = {
      db: mockDb,
    };

    scannerService = new ScannerService(mockDatabaseService as any, cryptoService);
  });

  it('OFFLINE DUPLICATE CONFLICT AUDIT: Preserves full audit trail for multiple offline scans of ticket X', async () => {
    const payload = {
      version: 'v1',
      ticketId: 'tck-100',
      eventId: 'evt-summer-2026',
      ticketTypeId: 'tkt-vip',
      issuedAt: new Date().toISOString(),
      expiresAt: null,
      keyVersion: 'v1-2026',
    };

    const qrToken = cryptoService.signTicketCredential(payload);
    const syncIdA = '00000000-0000-0000-0000-000000000001';
    const syncIdB = '00000000-0000-0000-0000-000000000002';

    // Scanner A syncs first -> Authoritative SUCCESS
    const batchInputA = {
      deviceId: 'dev-A',
      eventId: 'evt-summer-2026',
      records: [
        {
          syncId: syncIdA,
          qrPayload: qrToken,
          eventId: 'evt-summer-2026',
          gateId: 'gate-1',
          deviceId: 'dev-A',
          deviceScannedAt: new Date().toISOString(),
          localVerificationResult: 'valid',
        },
      ],
    };

    const resA = await scannerService.syncOfflineScans(batchInputA, 'staff-A');
    expect(resA.successCount).toBe(1);
    expect(resA.results[0]!.result).toBe('success');

    // Simulate ticket updated to checked_in state in DB for Scanner B's subsequent sync
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValueOnce({
        where: jest.fn().mockReturnValueOnce({
          for: jest.fn().mockResolvedValueOnce([
            {
              id: 'tck-100',
              orderId: 'ord-1',
              ticketTypeId: 'tkt-vip',
              eventId: 'evt-summer-2026',
              ticketNumber: 'TKT-100-VIP',
              status: 'checked_in',
              checkedInAt: new Date(),
            },
          ]),
        }),
      }),
    });

    // Scanner B syncs second -> CONFLICT / ALREADY_USED
    const batchInputB = {
      deviceId: 'dev-B',
      eventId: 'evt-summer-2026',
      records: [
        {
          syncId: syncIdB,
          qrPayload: qrToken,
          eventId: 'evt-summer-2026',
          gateId: 'gate-2',
          deviceId: 'dev-B',
          deviceScannedAt: new Date().toISOString(),
          localVerificationResult: 'valid',
        },
      ],
    };

    const resB = await scannerService.syncOfflineScans(batchInputB, 'staff-B');
    expect(resB.conflictCount).toBe(1);
    expect(resB.results[0]!.result).toBe('already_used');

    // Verify AUDIT TRAIL INTEGRITY: Both scan records (syncIdA and syncIdB) are preserved in checkins table
    expect(insertedCheckins.length).toBeGreaterThanOrEqual(2);
    const syncIds = insertedCheckins.map((c) => c.syncId);
    expect(syncIds).toContain(syncIdA);
    expect(syncIds).toContain(syncIdB);
  });

  it('Batch syncs offline scans idempotently using sync_id', async () => {
    const payload = {
      version: 'v1',
      ticketId: 'tck-100',
      eventId: 'evt-summer-2026',
      ticketTypeId: 'tkt-vip',
      issuedAt: new Date().toISOString(),
      expiresAt: null,
      keyVersion: 'v1-2026',
    };

    const qrToken = cryptoService.signTicketCredential(payload);
    const syncId1 = '00000000-0000-0000-0000-000000000001';

    const batchInput = {
      deviceId: 'dev-1',
      eventId: 'evt-summer-2026',
      records: [
        {
          syncId: syncId1,
          qrPayload: qrToken,
          eventId: 'evt-summer-2026',
          gateId: 'gate-1',
          deviceId: 'dev-1',
          deviceScannedAt: new Date().toISOString(),
          localVerificationResult: 'valid',
        },
      ],
    };

    const res = await scannerService.syncOfflineScans(batchInput, 'staff-1');
    expect(res.processedCount).toBe(1);
    expect(res.successCount).toBe(1);
    expect(res.results[0]!.result).toBe('success');
  });

  it('Replays original result when same syncId with identical payload is re-submitted', async () => {
    const syncId1 = '00000000-0000-0000-0000-000000000001';
    mockDb.query.checkins.findFirst.mockResolvedValueOnce({
      syncId: syncId1,
      ticketId: 'tck-100',
      eventId: 'evt-summer-2026',
      result: 'success',
    });

    const batchInput = {
      deviceId: 'dev-1',
      eventId: 'evt-summer-2026',
      records: [
        {
          syncId: syncId1,
          qrPayload: 'TICKET.mock.sig',
          eventId: 'evt-summer-2026',
          gateId: 'gate-1',
          deviceId: 'dev-1',
          deviceScannedAt: new Date().toISOString(),
          localVerificationResult: 'valid',
        },
      ],
    };

    const res = await scannerService.syncOfflineScans(batchInput, 'staff-1');
    expect(res.duplicateCount).toBe(1);
    expect(res.results[0]!.result).toBe('success');
  });

  it('Rejects sync when same syncId is re-submitted with DIFFERENT payload (409 Conflict)', async () => {
    const syncId1 = '00000000-0000-0000-0000-000000000001';
    mockDb.query.checkins.findFirst.mockResolvedValueOnce({
      syncId: syncId1,
      ticketId: 'tck-100',
      eventId: 'evt-DIFFERENT-EVENT',
      result: 'success',
    });

    const batchInput = {
      deviceId: 'dev-1',
      eventId: 'evt-summer-2026',
      records: [
        {
          syncId: syncId1,
          qrPayload: 'TICKET.mock.sig',
          eventId: 'evt-summer-2026',
          gateId: 'gate-1',
          deviceId: 'dev-1',
          deviceScannedAt: new Date().toISOString(),
          localVerificationResult: 'valid',
        },
      ],
    };

    await expect(scannerService.syncOfflineScans(batchInput, 'staff-1')).rejects.toThrow(ConflictException);
  });
});
