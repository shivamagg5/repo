import { ScannerService } from './scanner.service';
import { ScannerCryptoService } from './scanner-crypto.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ScannerService — Hardened Device Operations & Tamper Testing Suite', () => {
  let scannerService: ScannerService;
  let cryptoService: ScannerCryptoService;
  let mockDb: any;
  let mockDatabaseService: any;

  beforeEach(() => {
    delete process.env.NODE_ENV;
    cryptoService = new ScannerCryptoService();

    mockDb = {
      query: {
        checkinDevices: {
          findFirst: jest.fn(),
        },
        events: {
          findFirst: jest.fn(),
        },
        checkinGates: {
          findFirst: jest.fn(),
        },
        tickets: {
          findFirst: jest.fn(),
        },
        ticketTypes: {
          findFirst: jest.fn().mockResolvedValue({ name: 'General Admission' }),
        },
        users: {
          findFirst: jest.fn().mockResolvedValue({ name: 'Rahul Verma' }),
        },
        orders: {
          findFirst: jest.fn().mockResolvedValue({ purchaserName: 'Rahul Verma' }),
        },
        checkins: {
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            { id: 'dev-123', deviceIdentifier: 'HARDWARE-UUID-01', status: 'active', lastSeenAt: new Date() },
          ]),
        }),
      }),
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
                ticketTypeId: 'tkt-ga',
                eventId: 'evt-summer-2026',
                ticketNumber: 'TKT-100-XYZ',
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

  it('Registers new scanner device hardware public key', async () => {
    mockDb.query.checkinDevices.findFirst.mockResolvedValue(null);

    const res = await scannerService.registerDevice(
      { deviceIdentifier: 'HARDWARE-UUID-01', publicKeyPem: '-----BEGIN PUBLIC KEY-----\n...' },
      'org-123',
    );

    expect(res.deviceId).toBe('dev-123');
    expect(res.deviceIdentifier).toBe('HARDWARE-UUID-01');
    expect(res.status).toBe('active');
  });

  it('DEVICE REGISTRATION: Updates public key for existing active device', async () => {
    mockDb.query.checkinDevices.findFirst.mockResolvedValue({
      id: 'dev-123',
      deviceIdentifier: 'HARDWARE-UUID-01',
      status: 'active',
      lastSeenAt: new Date(),
    });

    const res = await scannerService.registerDevice(
      { deviceIdentifier: 'HARDWARE-UUID-01', publicKeyPem: '-----BEGIN PUBLIC KEY-----\nNEW_KEY...' },
      'org-123',
    );

    expect(res.deviceId).toBe('dev-123');
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('DEVICE REGISTRATION: Rejects re-registration attempt of revoked device', async () => {
    mockDb.query.checkinDevices.findFirst.mockResolvedValue({
      id: 'dev-revoked',
      deviceIdentifier: 'HARDWARE-UUID-REVOKED',
      status: 'revoked',
    });

    await expect(
      scannerService.registerDevice(
        { deviceIdentifier: 'HARDWARE-UUID-REVOKED', publicKeyPem: '-----BEGIN PUBLIC KEY-----\n...' },
        'org-123',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('CROSS-ORG REJECTION: Rejects pairing when device org != staff org', async () => {
    mockDb.query.checkinDevices.findFirst.mockResolvedValue({
      id: 'dev-org-2',
      status: 'active',
      organizationId: 'org-2',
    });

    await expect(
      scannerService.pairDevice(
        { deviceId: 'dev-org-2', eventId: 'evt-1', gateId: 'gate-1' },
        'user-staff-1',
        'org-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('DEVICE AUTHENTICATION: Pairs device and returns signed Event Authorization Package', async () => {
    mockDb.query.checkinDevices.findFirst.mockResolvedValue({ id: 'dev-123', status: 'active', organizationId: 'org-1' });
    mockDb.query.events.findFirst.mockResolvedValue({ id: 'evt-1', startsAt: new Date(), endsAt: new Date(), organizerOrganizationId: 'org-1' });
    mockDb.query.checkinGates.findFirst.mockResolvedValue({ id: 'gate-1', eventId: 'evt-1' });

    const pkg = await scannerService.pairDevice(
      { deviceId: 'dev-123', eventId: 'evt-1', gateId: 'gate-1' },
      'user-staff-1',
      'org-1',
    );

    expect(pkg.deviceId).toBe('dev-123');
    expect(pkg.eventId).toBe('evt-1');
    expect(pkg.gateId).toBe('gate-1');
    expect(pkg.publicVerificationKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
    expect(pkg.packageSignature).toBeDefined();

    // Verify package signature using Root Trust Key
    const isValid = cryptoService.verifyEventAuthorizationPackage(pkg, pkg.packageSignature);
    expect(isValid).toBe(true);
  });

  it('DEVICE REVOCATION: Rejects revoked device during pairing attempt', async () => {
    mockDb.query.checkinDevices.findFirst.mockResolvedValue({ id: 'dev-revoked', status: 'revoked', organizationId: 'org-1' });

    await expect(
      scannerService.pairDevice({ deviceId: 'dev-revoked', eventId: 'evt-1', gateId: 'gate-1' }, 'staff-1', 'org-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('DEVICE AUTHENTICATION: Rejects unknown device during pairing attempt', async () => {
    mockDb.query.checkinDevices.findFirst.mockResolvedValue(null);

    await expect(
      scannerService.pairDevice({ deviceId: 'dev-unknown', eventId: 'evt-1', gateId: 'gate-1' }, 'staff-1', 'org-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('AUTHORIZATION PACKAGE TAMPERING: Rejects package with tampered eventId or gateId', async () => {
    mockDb.query.checkinDevices.findFirst.mockResolvedValue({ id: 'dev-123', status: 'active', organizationId: 'org-1' });
    mockDb.query.events.findFirst.mockResolvedValue({ id: 'evt-1', startsAt: new Date(), endsAt: new Date(), organizerOrganizationId: 'org-1' });
    mockDb.query.checkinGates.findFirst.mockResolvedValue({ id: 'gate-1', eventId: 'evt-1' });

    const pkg = await scannerService.pairDevice(
      { deviceId: 'dev-123', eventId: 'evt-1', gateId: 'gate-1' },
      'user-staff-1',
      'org-1',
    );

    // Tamper event ID in package
    const tamperedPkg = { ...pkg, eventId: 'evt-HACKED-EVENT' };
    const isValid = cryptoService.verifyEventAuthorizationPackage(tamperedPkg, pkg.packageSignature);
    expect(isValid).toBe(false);
  });

  it('Validates QR ticket token and executes atomic check-in transaction', async () => {
    const payload = {
      version: 'v1',
      ticketId: 'tck-100',
      eventId: 'evt-summer-2026',
      ticketTypeId: 'tkt-ga',
      issuedAt: new Date().toISOString(),
      expiresAt: null,
      keyVersion: 'v1-2026',
    };

    const qrToken = cryptoService.signTicketCredential(payload);

    const res = await scannerService.scanTicket(
      {
        qrPayload: qrToken,
        eventId: 'evt-summer-2026',
        gateId: 'gate-1',
        deviceId: 'dev-123',
      },
      'user-staff-1',
    );

    expect(res.result).toBe('success');
    expect(res.ticketId).toBe('tck-100');
    expect(res.purchaserName).toBe('Rahul Verma');
  });

  it('Rejects wrong event ticket scan (result: wrong_event)', async () => {
    const payload = {
      version: 'v1',
      ticketId: 'tck-100',
      eventId: 'evt-DIFFERENT-EVENT',
      ticketTypeId: 'tkt-ga',
      issuedAt: new Date().toISOString(),
      expiresAt: null,
      keyVersion: 'v1-2026',
    };

    const qrToken = cryptoService.signTicketCredential(payload);

    const res = await scannerService.scanTicket(
      {
        qrPayload: qrToken,
        eventId: 'evt-summer-2026',
        gateId: 'gate-1',
        deviceId: 'dev-123',
      },
      'user-staff-1',
    );

    expect(res.result).toBe('wrong_event');
    expect(res.message).toContain('different event');
  });
});
