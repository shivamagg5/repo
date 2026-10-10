import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface QueueConfig {
  enabled: boolean;
  batchSize: number;
  batchIntervalMs: number;
  maxHoldTimeMinutes: number;
}

export interface QueueEntry {
  queueToken: string;
  userId: string;
  eventId: string;
  ip: string;
  enqueuedAt: number;
  status: 'WAITING' | 'ADMITTED' | 'EXPIRED';
  position: number;
  admittedAt?: number;
  admitToken?: string;
  admitExpiresAt?: number;
}

export interface QueueStatusResult {
  status: 'WAITING' | 'ADMITTED' | 'EXPIRED' | 'NOT_QUEUED';
  position: number;
  totalWaitingAhead: number;
  estimatedWaitSeconds: number;
  admitToken?: string;
  admitExpiresAt?: string;
}

@Injectable()
export class WaitingRoomService {
  private readonly logger = new Logger(WaitingRoomService.name);
  private readonly hmacSecret = process.env['QUEUE_HMAC_SECRET'] || 'pulsr-queue-secret-key-32chars-min!!';

  // Per-event in-memory FIFO queues
  private readonly queues = new Map<string, QueueEntry[]>();
  // Token index for O(1) lookups
  private readonly tokenIndex = new Map<string, QueueEntry>();
  // Configurations per event
  private readonly configs = new Map<string, QueueConfig>();

  constructor() {
    this.logger.log('WaitingRoomService initialized for high-demand ticket drops');
  }

  /**
   * Configure or activate a virtual waiting room for a high-demand event
   */
  configureWaitingRoom(eventId: string, config: Partial<QueueConfig>): QueueConfig {
    const current = this.configs.get(eventId) || {
      enabled: false,
      batchSize: 50,
      batchIntervalMs: 5000,
      maxHoldTimeMinutes: 10,
    };

    const updated: QueueConfig = { ...current, ...config };
    this.configs.set(eventId, updated);

    if (!this.queues.has(eventId)) {
      this.queues.set(eventId, []);
    }

    this.logger.log(
      `Event ${eventId} waiting room ${updated.enabled ? 'ENABLED' : 'DISABLED'} (Batch: ${updated.batchSize} / ${updated.batchIntervalMs}ms)`,
    );
    return updated;
  }

  /**
   * Check if an event currently has an active waiting room
   */
  isWaitingRoomActive(eventId: string): boolean {
    const config = this.configs.get(eventId);
    return config?.enabled === true;
  }

  /**
   * Join the virtual queue for an event
   */
  joinQueue(eventId: string, userId: string, ip: string): QueueStatusResult {
    const config = this.configs.get(eventId);
    if (!config || !config.enabled) {
      // If waiting room is not enabled, directly issue an immediate admit token
      const immediateToken = this.generateAdmitToken(eventId, userId, 10);
      return {
        status: 'ADMITTED',
        position: 0,
        totalWaitingAhead: 0,
        estimatedWaitSeconds: 0,
        admitToken: immediateToken,
        admitExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };
    }

    // Check if user is already queued
    const existingEntry = Array.from(this.tokenIndex.values()).find(
      (entry) => entry.eventId === eventId && entry.userId === userId && entry.status !== 'EXPIRED',
    );

    if (existingEntry) {
      return this.getQueueStatus(eventId, existingEntry.queueToken);
    }

    const queueToken = crypto.randomBytes(24).toString('hex');
    const queue = this.queues.get(eventId) || [];

    const newEntry: QueueEntry = {
      queueToken,
      userId,
      eventId,
      ip,
      enqueuedAt: Date.now(),
      status: 'WAITING',
      position: queue.filter((e) => e.status === 'WAITING').length + 1,
    };

    queue.push(newEntry);
    this.queues.set(eventId, queue);
    this.tokenIndex.set(queueToken, newEntry);

    this.logger.log(`User ${userId} joined queue for event ${eventId} at position #${newEntry.position}`);
    return this.getQueueStatus(eventId, queueToken);
  }

  /**
   * Get current queue position and wait estimation
   */
  getQueueStatus(eventId: string, queueToken: string): QueueStatusResult {
    const entry = this.tokenIndex.get(queueToken);
    if (!entry || entry.eventId !== eventId) {
      return {
        status: 'NOT_QUEUED',
        position: -1,
        totalWaitingAhead: -1,
        estimatedWaitSeconds: 0,
      };
    }

    // Check if admitted pass has expired
    if (entry.status === 'ADMITTED' && entry.admitExpiresAt && Date.now() > entry.admitExpiresAt) {
      entry.status = 'EXPIRED';
      return {
        status: 'EXPIRED',
        position: -1,
        totalWaitingAhead: -1,
        estimatedWaitSeconds: 0,
      };
    }

    if (entry.status === 'ADMITTED') {
      return {
        status: 'ADMITTED',
        position: 0,
        totalWaitingAhead: 0,
        estimatedWaitSeconds: 0,
        admitToken: entry.admitToken,
        admitExpiresAt: entry.admitExpiresAt ? new Date(entry.admitExpiresAt).toISOString() : undefined,
      };
    }

    // Calculate position among remaining WAITING entries
    const queue = this.queues.get(eventId) || [];
    const waitingList = queue.filter((e) => e.status === 'WAITING');
    const index = waitingList.findIndex((e) => e.queueToken === queueToken);
    const position = index >= 0 ? index + 1 : 1;

    const config = this.configs.get(eventId);
    const batchSize = config?.batchSize || 50;
    const batchInterval = (config?.batchIntervalMs || 5000) / 1000;
    const estimatedWaitSeconds = Math.ceil((position / batchSize) * batchInterval);

    return {
      status: 'WAITING',
      position,
      totalWaitingAhead: Math.max(0, position - 1),
      estimatedWaitSeconds,
    };
  }

  /**
   * Admit the next batch of waiting users
   */
  admitNextBatch(eventId: string, batchSizeOverride?: number): { admittedCount: number; remainingWaiting: number } {
    const queue = this.queues.get(eventId) || [];
    const config = this.configs.get(eventId);
    const batchSize = batchSizeOverride ?? config?.batchSize ?? 50;
    const holdDurationMinutes = config?.maxHoldTimeMinutes ?? 10;

    let admitted = 0;
    const now = Date.now();
    const expireTimestamp = now + holdDurationMinutes * 60 * 1000;

    for (const entry of queue) {
      if (entry.status === 'WAITING') {
        entry.status = 'ADMITTED';
        entry.admittedAt = now;
        entry.admitExpiresAt = expireTimestamp;
        entry.admitToken = this.generateAdmitToken(eventId, entry.userId, holdDurationMinutes);
        admitted++;
        if (admitted >= batchSize) break;
      }
    }

    const remainingWaiting = queue.filter((e) => e.status === 'WAITING').length;
    this.logger.log(`Admitted ${admitted} users to event ${eventId}. Remaining in queue: ${remainingWaiting}`);
    return { admittedCount: admitted, remainingWaiting };
  }

  /**
   * Verify an admitToken submitted during checkout or hold reservation
   */
  verifyAdmitToken(eventId: string, admitToken: string): { isValid: boolean; userId?: string } {
    if (!admitToken) {
      throw new UnauthorizedException('Missing waiting room admission token');
    }

    try {
      const parts = admitToken.split('.');
      if (parts.length !== 3) {
        throw new BadRequestException('Malformed admission token format');
      }

      const [headerBase64, payloadBase64, signature] = parts;
      if (!headerBase64 || !payloadBase64 || !signature) {
        throw new BadRequestException('Malformed admission token format');
      }
      const expectedSignature = crypto
        .createHmac('sha256', this.hmacSecret)
        .update(`${headerBase64}.${payloadBase64}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        throw new UnauthorizedException('Tampered or invalid admission token signature');
      }

      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));

      if (payload.eventId !== eventId) {
        throw new UnauthorizedException('Admission token was issued for a different event');
      }

      if (payload.exp < Date.now()) {
        throw new UnauthorizedException('Admission pass has expired. Please re-enter the queue');
      }

      return { isValid: true, userId: payload.userId };
    } catch (err: any) {
      if (err instanceof UnauthorizedException || err instanceof BadRequestException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired admission pass');
    }
  }

  /**
   * Generate an HMAC-signed admission token
   */
  private generateAdmitToken(eventId: string, userId: string, validityMinutes: number): string {
    const header = { alg: 'HS256', typ: 'PULSR-QUEUE-PASS' };
    const payload = {
      eventId,
      userId,
      iat: Date.now(),
      exp: Date.now() + validityMinutes * 60 * 1000,
    };

    const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(`${headerBase64}.${payloadBase64}`)
      .digest('base64url');

    return `${headerBase64}.${payloadBase64}.${signature}`;
  }
}
