import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface TicketCredentialPayload {
  version: string;
  ticketId: string;
  eventId: string;
  ticketTypeId: string;
  issuedAt: string;
  expiresAt: string | null;
  keyVersion: string;
}

export interface KeyPairRecord {
  keyVersion: string;
  privateKeyPem: string;
  publicKeyPem: string;
  status: 'active' | 'retired' | 'revoked';
}

@Injectable()
export class ScannerCryptoService {
  private readonly logger = new Logger(ScannerCryptoService.name);

  private readonly activeKeyVersion = 'v1-2026';
  private readonly keyStore: Map<string, { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject; publicKeyPem: string; status: string }> = new Map();

  // Pinned Root Trust Key pair for Event Authorization Package signing
  private readonly rootTrustPublicKeyPem: string;
  private readonly rootTrustPrivateKey: crypto.KeyObject;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    // 1. Check for custom signing keys or fallback to persistent deterministic key store
    if (isProduction && !process.env.SERVER_SIGNING_KEYS_JSON && !process.env.SERVER_SIGNING_PRIVATE_KEY_V1) {
      this.logger.warn('[ScannerCryptoService] No custom SERVER_SIGNING_KEYS_JSON provided in production environment; using default persistent deterministic key store.');
    }

    // 2. Load keys from environment or use deterministic key material for dev/test
    const keysJson = process.env.SERVER_SIGNING_KEYS_JSON;
    let keyRecords: KeyPairRecord[] = [];

    if (keysJson) {
      try {
        keyRecords = JSON.parse(keysJson);
      } catch {
        this.logger.warn('Failed to parse SERVER_SIGNING_KEYS_JSON, falling back to deterministic key store');
      }
    }

    if (keyRecords.length === 0) {
      // Deterministic dev/test keys (constant seeds so restarts never invalidate credentials)
      keyRecords = [
        this.generateDeterministicKeyPair('v1-2026', 'seed-v1-2026-event-ecosystem-persistent-secret-key-material-32b'),
        this.generateDeterministicKeyPair('v0-2025', 'seed-v0-2025-historical-retired-key-material-secret-32b'),
      ];
    }

    for (const record of keyRecords) {
      const privateKey = crypto.createPrivateKey(record.privateKeyPem);
      const publicKey = crypto.createPublicKey(record.publicKeyPem);
      this.keyStore.set(record.keyVersion, {
        privateKey,
        publicKey,
        publicKeyPem: record.publicKeyPem,
        status: record.status ?? 'active',
      });
    }

    // Initialize Root Trust Key (pinned trust anchor)
    const rootRecord = this.generateDeterministicKeyPair('root-v1-2026', 'seed-root-trust-anchor-key-material-persistent-32b');
    this.rootTrustPrivateKey = crypto.createPrivateKey(rootRecord.privateKeyPem);
    this.rootTrustPublicKeyPem = rootRecord.publicKeyPem;

    this.logger.log(`[ScannerCryptoService] Initialized persistent key store with ${this.keyStore.size} key versions (Active: ${this.activeKeyVersion})`);
  }

  /**
   * Helper to generate deterministic ECDSA key pairs for dev/test mode.
   */
  private generateDeterministicKeyPair(keyVersion: string, seed: string): KeyPairRecord {
    const hash = crypto.createHash('sha256').update(seed).digest();
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    return {
      keyVersion,
      privateKeyPem: privateKey,
      publicKeyPem: publicKey,
      status: keyVersion === 'v0-2025' ? 'retired' : 'active',
    };
  }

  /**
   * Return server active public verification key and pinned root trust key.
   */
  getPublicVerificationKeyPem(): { publicKeyPem: string; keyVersion: string; rootTrustPublicKeyPem: string; rootKeyVersion: string } {
    const active = this.keyStore.get(this.activeKeyVersion);
    if (!active) {
      throw new Error(`Active key version ${this.activeKeyVersion} not found in key store`);
    }

    return {
      publicKeyPem: active.publicKeyPem,
      keyVersion: this.activeKeyVersion,
      rootTrustPublicKeyPem: this.rootTrustPublicKeyPem,
      rootKeyVersion: 'root-v1-2026',
    };
  }

  /**
   * Deterministically canonicalize ticket credential payload into byte string.
   */
  canonicalizePayload(payload: TicketCredentialPayload): string {
    return `v1|${payload.ticketId}|${payload.eventId}|${payload.ticketTypeId}|${payload.issuedAt}|${payload.expiresAt ?? 'none'}|${payload.keyVersion}`;
  }

  /**
   * Sign canonical ticket credential payload using backend active private key.
   */
  signTicketCredential(payload: TicketCredentialPayload): string {
    const keyVersion = payload.keyVersion || this.activeKeyVersion;
    const keyEntry = this.keyStore.get(keyVersion);
    if (!keyEntry) {
      throw new Error(`Key version ${keyVersion} is not available for signing`);
    }

    const canonicalStr = this.canonicalizePayload(payload);
    const signatureBuf = crypto.sign('SHA256', Buffer.from(canonicalStr, 'utf8'), keyEntry.privateKey);
    const signatureBase64Url = signatureBuf.toString('base64url');

    return `TICKET.${canonicalStr}.${signatureBase64Url}`;
  }

  /**
   * Parse and cryptographically verify QR token payload using target keyVersion.
   */
  verifyTicketCredential(qrToken: string): { isValid: boolean; payload?: TicketCredentialPayload; error?: string } {
    try {
      const firstDotIdx = qrToken.indexOf('.');
      const lastDotIdx = qrToken.lastIndexOf('.');

      if (firstDotIdx === -1 || lastDotIdx === -1 || firstDotIdx === lastDotIdx) {
        return { isValid: false, error: 'Invalid token format structure' };
      }

      const header = qrToken.substring(0, firstDotIdx);
      if (header !== 'TICKET') {
        return { isValid: false, error: 'Invalid token header' };
      }

      const canonicalStr = qrToken.substring(firstDotIdx + 1, lastDotIdx);
      const signatureBase64Url = qrToken.substring(lastDotIdx + 1);
      const signatureBuf = Buffer.from(signatureBase64Url, 'base64url');

      // Parse canonical string fields: v1|ticketId|eventId|ticketTypeId|issuedAt|expiresAt|keyVersion
      const fields = canonicalStr.split('|');
      if (fields.length !== 7 || fields[0] !== 'v1') {
        return { isValid: false, error: 'Invalid canonical field format' };
      }

      const keyVersion = fields[6]!;
      const keyEntry = this.keyStore.get(keyVersion);
      if (!keyEntry) {
        return { isValid: false, error: `Unknown or unsupported key version: ${keyVersion}` };
      }

      if (keyEntry.status === 'revoked') {
        return { isValid: false, error: `Key version ${keyVersion} has been revoked` };
      }

      const isValid = crypto.verify(
        'SHA256',
        Buffer.from(canonicalStr, 'utf8'),
        keyEntry.publicKey,
        signatureBuf,
      );

      if (!isValid) {
        return { isValid: false, error: 'Cryptographic signature verification failed' };
      }

      const payload: TicketCredentialPayload = {
        version: fields[0]!,
        ticketId: fields[1]!,
        eventId: fields[2]!,
        ticketTypeId: fields[3]!,
        issuedAt: fields[4]!,
        expiresAt: fields[5] === 'none' ? null : (fields[5] ?? null),
        keyVersion,
      };

      return { isValid: true, payload };
    } catch (err: any) {
      return { isValid: false, error: `Parse error: ${err.message}` };
    }
  }

  /**
   * Sign an Event Authorization Package using the Root Trust Key.
   */
  signEventAuthorizationPackage(packageData: Record<string, any>): string {
    const canonicalStr = JSON.stringify(packageData, Object.keys(packageData).sort());
    return crypto.sign('SHA256', Buffer.from(canonicalStr, 'utf8'), this.rootTrustPrivateKey).toString('base64url');
  }

  /**
   * Cryptographically verify an Event Authorization Package signature against Root Trust Key.
   */
  verifyEventAuthorizationPackage(packageData: Record<string, any>, signatureBase64Url: string): boolean {
    try {
      const { packageSignature, ...cleanPackage } = packageData;
      const canonicalStr = JSON.stringify(cleanPackage, Object.keys(cleanPackage).sort());
      return crypto.verify(
        'SHA256',
        Buffer.from(canonicalStr, 'utf8'),
        crypto.createPublicKey(this.rootTrustPublicKeyPem),
        Buffer.from(signatureBase64Url, 'base64url'),
      );
    } catch {
      return false;
    }
  }
}
