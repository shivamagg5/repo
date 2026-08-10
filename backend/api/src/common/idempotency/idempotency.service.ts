import { Injectable, ConflictException, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { idempotencyRecords } from '../../database/schema/index';

export interface IdempotencyRecord {
  id: string;
  idempotencyKey: string;
  userId: string;
  requestPath: string;
  requestHash: string;
  responseStatus: number;
  responseBody: unknown;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger('IdempotencyService');

  constructor(private readonly db: DatabaseService) {}

  /**
   * Hash payload deterministically.
   */
  hashPayload(payload: unknown): string {
    const str = JSON.stringify(payload ?? {});
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Check if an idempotency record exists for user + key.
   */
  async findRecord(idempotencyKey: string, userId: string): Promise<IdempotencyRecord | null> {
    const existing = await this.db.db.query.idempotencyRecords.findFirst({
      where: and(
        eq(idempotencyRecords.idempotencyKey, idempotencyKey),
        eq(idempotencyRecords.userId, userId),
      ),
    });

    if (!existing) return null;

    return {
      id: existing.id,
      idempotencyKey: existing.idempotencyKey,
      userId: existing.userId,
      requestPath: existing.requestPath,
      requestHash: existing.requestHash,
      responseStatus: existing.responseStatus,
      responseBody: existing.responseBody,
    };
  }

  /**
   * Save sanitized idempotency record using DB UNIQUE constraint.
   */
  async saveRecord(
    idempotencyKey: string,
    userId: string,
    requestPath: string,
    requestHash: string,
    responseStatus: number,
    responseBody: unknown,
  ): Promise<void> {
    const sanitized = this.sanitizeResponseBody(responseBody);
    try {
      await this.db.db.insert(idempotencyRecords).values({
        idempotencyKey,
        userId,
        requestPath,
        requestHash,
        responseStatus,
        responseBody: sanitized as any,
      });
    } catch (err: any) {
      // Unique constraint conflict
      if (err.code === '23505') {
        this.logger.warn(`Idempotency key collision for key=${idempotencyKey} user=${userId}`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Ensure no sensitive tokens, payment credentials, or secrets are persisted.
   */
  private sanitizeResponseBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const clone = JSON.parse(JSON.stringify(body));

    const sensitiveFields = ['accessToken', 'refreshToken', 'cardToken', 'secret', 'cvv'];
    const scrub = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (sensitiveFields.includes(key)) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          scrub(obj[key]);
        }
      }
    };
    scrub(clone);
    return clone;
  }
}
