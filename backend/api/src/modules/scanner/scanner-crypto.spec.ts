import { ScannerCryptoService } from './scanner-crypto.service';

describe('ScannerCryptoService — Hardened Cryptographic Security Suite', () => {
  let service: ScannerCryptoService;

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.SERVER_SIGNING_KEYS_JSON;
    service = new ScannerCryptoService();
  });

  it('FAIL FAST: Throws fatal error in NODE_ENV=production if persistent keys are missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SERVER_SIGNING_KEYS_JSON;
    delete process.env.SERVER_SIGNING_PRIVATE_KEY_V1;

    expect(() => new ScannerCryptoService()).toThrow(
      '[FATAL SECURITY ERROR] NODE_ENV=production but no persistent server signing keys'
    );
  });

  it('Generates active key info and pinned root trust key info', () => {
    const keyInfo = service.getPublicVerificationKeyPem();
    expect(keyInfo.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
    expect(keyInfo.keyVersion).toBe('v1-2026');
    expect(keyInfo.rootTrustPublicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
    expect(keyInfo.rootKeyVersion).toBe('root-v1-2026');
  });

  it('Canonicalizes ticket payload into deterministic string', () => {
    const payload = {
      version: 'v1',
      ticketId: 'tck-100',
      eventId: 'evt-200',
      ticketTypeId: 'tkt-vip',
      issuedAt: '2026-08-10T12:00:00.000Z',
      expiresAt: null,
      keyVersion: 'v1-2026',
    };

    const canonicalStr = service.canonicalizePayload(payload);
    expect(canonicalStr).toBe('v1|tck-100|evt-200|tkt-vip|2026-08-10T12:00:00.000Z|none|v1-2026');
  });

  it('Signs ticket credential and verifies token with active key version v1-2026', () => {
    const payload = {
      version: 'v1',
      ticketId: 'tck-100',
      eventId: 'evt-200',
      ticketTypeId: 'tkt-vip',
      issuedAt: '2026-08-10T12:00:00.000Z',
      expiresAt: null,
      keyVersion: 'v1-2026',
    };

    const token = service.signTicketCredential(payload);
    expect(token).toContain('TICKET.v1|tck-100|evt-200|tkt-vip|2026-08-10T12:00:00.000Z|none|v1-2026.');

    const verifyResult = service.verifyTicketCredential(token);
    expect(verifyResult.isValid).toBe(true);
    expect(verifyResult.payload?.ticketId).toBe('tck-100');
    expect(verifyResult.payload?.keyVersion).toBe('v1-2026');
  });

  it('KEY ROTATION: Historical v0-2025 tickets remain verifiable', () => {
    const historicalPayload = {
      version: 'v1',
      ticketId: 'tck-old-2025',
      eventId: 'evt-old-2025',
      ticketTypeId: 'tkt-ga',
      issuedAt: '2025-12-01T10:00:00.000Z',
      expiresAt: null,
      keyVersion: 'v0-2025',
    };

    const token = service.signTicketCredential(historicalPayload);
    const verifyResult = service.verifyTicketCredential(token);
    expect(verifyResult.isValid).toBe(true);
    expect(verifyResult.payload?.keyVersion).toBe('v0-2025');
  });

  it('KEY ROTATION: Rejects ticket credentials with unknown key version v99-unknown', () => {
    const unknownPayload = {
      version: 'v1',
      ticketId: 'tck-999',
      eventId: 'evt-999',
      ticketTypeId: 'tkt-ga',
      issuedAt: '2026-08-10T12:00:00.000Z',
      expiresAt: null,
      keyVersion: 'v99-unknown',
    };

    // Construct token with fake v99-unknown key version
    const canonicalStr = 'v1|tck-999|evt-999|tkt-ga|2026-08-10T12:00:00.000Z|none|v99-unknown';
    const fakeToken = `TICKET.${canonicalStr}.fakeSigBase64Url`;

    const verifyResult = service.verifyTicketCredential(fakeToken);
    expect(verifyResult.isValid).toBe(false);
    expect(verifyResult.error).toContain('Unknown or unsupported key version: v99-unknown');
  });

  it('Rejects tampered ticket payload', () => {
    const payload = {
      version: 'v1',
      ticketId: 'tck-100',
      eventId: 'evt-200',
      ticketTypeId: 'tkt-vip',
      issuedAt: '2026-08-10T12:00:00.000Z',
      expiresAt: null,
      keyVersion: 'v1-2026',
    };

    const token = service.signTicketCredential(payload);
    const tamperedToken = token.replace('tck-100', 'tck-HACKED');

    const verifyResult = service.verifyTicketCredential(tamperedToken);
    expect(verifyResult.isValid).toBe(false);
    expect(verifyResult.error).toContain('Cryptographic signature verification failed');
  });

  it('Signs and verifies Event Authorization Package using Root Trust Key', () => {
    const pkg = {
      version: 'v1',
      deviceId: 'dev-1',
      eventId: 'evt-1',
      gateId: 'gate-1',
      authorizationIssuedAt: '2026-08-10T10:00:00.000Z',
    };

    const signature = service.signEventAuthorizationPackage(pkg);
    const isValid = service.verifyEventAuthorizationPackage(pkg, signature);
    expect(isValid).toBe(true);

    // Tamper package gate ID
    const tamperedPkg = { ...pkg, gateId: 'gate-2-HACKED' };
    const isTamperedValid = service.verifyEventAuthorizationPackage(tamperedPkg, signature);
    expect(isTamperedValid).toBe(false);
  });
});
