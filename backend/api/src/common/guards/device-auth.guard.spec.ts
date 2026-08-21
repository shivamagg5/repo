import { UnauthorizedException, ForbiddenException, ExecutionContext } from '@nestjs/common';
import * as crypto from 'crypto';
import { DeviceAuthGuard } from './device-auth.guard';
import { DatabaseService } from '../../database/database.service';

describe('DeviceAuthGuard (Trust Chain Verification)', () => {
  let guard: DeviceAuthGuard;
  let mockDb: any;
  let keyPair: crypto.KeyPairSyncResult<string, string>;

  beforeAll(() => {
    keyPair = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
  });

  beforeEach(() => {
    mockDb = {
      db: {
        query: {
          checkinDevices: {
            findFirst: jest.fn(),
          },
        },
      },
    };
    guard = new DeviceAuthGuard(mockDb as DatabaseService);
  });

  function createMockContext(headers: Record<string, string>, path = '/scanner/scan', method = 'POST'): ExecutionContext {
    const request = {
      headers: { ...headers },
      path,
      method,
      device: undefined,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  }

  function signRequest(deviceId: string, timestamp: string, method: string, path: string, dsaEncoding: 'ieee-p1363' | 'der' = 'ieee-p1363'): string {
    const canonicalStr = `${deviceId}|${timestamp}|${method.toUpperCase()}|${path}`;
    const sigBuf = crypto.sign('SHA256', Buffer.from(canonicalStr, 'utf8'), {
      key: keyPair.privateKey,
      dsaEncoding,
    });
    return sigBuf.toString('base64url');
  }

  it('allows /scanner/register without device auth headers', async () => {
    const ctx = createMockContext({}, '/api/v1/scanner/register', 'POST');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('rejects requests missing required device headers with 401', async () => {
    const ctx = createMockContext({
      'x-device-id': 'dev-123',
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects expired request timestamp (> 5 minutes) with 401', async () => {
    const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const ctx = createMockContext({
      'x-device-id': 'dev-123',
      'x-device-timestamp': oldTimestamp,
      'x-device-signature': 'any-sig',
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects unregistered device with 403 ForbiddenException', async () => {
    mockDb.db.query.checkinDevices.findFirst.mockResolvedValue(null);
    const timestamp = new Date().toISOString();
    const ctx = createMockContext({
      'x-device-id': 'unknown-dev-id',
      'x-device-timestamp': timestamp,
      'x-device-signature': 'some-sig',
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('rejects revoked device with 403 ForbiddenException', async () => {
    mockDb.db.query.checkinDevices.findFirst.mockResolvedValue({
      id: 'revoked-dev',
      status: 'revoked',
      publicKeyPem: keyPair.publicKey,
    });
    const timestamp = new Date().toISOString();
    const sig = signRequest('revoked-dev', timestamp, 'POST', '/scanner/scan');
    const ctx = createMockContext({
      'x-device-id': 'revoked-dev',
      'x-device-timestamp': timestamp,
      'x-device-signature': sig,
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('rejects device without registered public key with 401 UnauthorizedException', async () => {
    mockDb.db.query.checkinDevices.findFirst.mockResolvedValue({
      id: 'no-key-dev',
      status: 'active',
      publicKeyPem: null,
    });
    const timestamp = new Date().toISOString();
    const ctx = createMockContext({
      'x-device-id': 'no-key-dev',
      'x-device-timestamp': timestamp,
      'x-device-signature': 'sig',
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects tampered or forged device signature with 401', async () => {
    mockDb.db.query.checkinDevices.findFirst.mockResolvedValue({
      id: 'dev-valid',
      status: 'active',
      publicKeyPem: keyPair.publicKey,
    });
    const timestamp = new Date().toISOString();
    const badSig = Buffer.from('bad_signature_bytes_that_fail_verification_32_bytes_long_12345678').toString('base64url');
    const ctx = createMockContext({
      'x-device-id': 'dev-valid',
      'x-device-timestamp': timestamp,
      'x-device-signature': badSig,
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('authenticates valid device with IEEE P1363 (64-byte raw) signature', async () => {
    const deviceId = 'dev-valid-1';
    mockDb.db.query.checkinDevices.findFirst.mockResolvedValue({
      id: deviceId,
      status: 'active',
      publicKeyPem: keyPair.publicKey,
    });
    const timestamp = new Date().toISOString();
    const sig = signRequest(deviceId, timestamp, 'POST', '/scanner/scan', 'ieee-p1363');
    const ctx = createMockContext({
      'x-device-id': deviceId,
      'x-device-timestamp': timestamp,
      'x-device-signature': sig,
    }, '/scanner/scan', 'POST');

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect((ctx.switchToHttp().getRequest() as any).device).toEqual(expect.objectContaining({ id: deviceId }));
  });

  it('authenticates valid device with standard DER signature', async () => {
    const deviceId = 'dev-valid-2';
    mockDb.db.query.checkinDevices.findFirst.mockResolvedValue({
      id: deviceId,
      status: 'active',
      publicKeyPem: keyPair.publicKey,
    });
    const timestamp = new Date().toISOString();
    const sig = signRequest(deviceId, timestamp, 'POST', '/scanner/scan', 'der');
    const ctx = createMockContext({
      'x-device-id': deviceId,
      'x-device-timestamp': timestamp,
      'x-device-signature': sig,
    }, '/scanner/scan', 'POST');

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
