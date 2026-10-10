import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';
import { PushProviderService } from './providers/push-provider.service';
import { EmailProviderService } from './providers/email-provider.service';
import { SmsProviderService } from './providers/sms-provider.service';
import {
  notificationOutbox,
  notificationLogs,
  notificationDeliveryAttempts,
  inAppNotifications,
  deviceTokens,
  notificationPreferences,
} from '../../database/schema/index';
import { eq, and, or, lt, isNull } from 'drizzle-orm';
import type { NotificationChannel, NotificationCategory } from '@platform/types';

export interface EnqueueOutboxInput {
  notificationType: string;
  userId: string;
  payload: Record<string, any>;
  idempotencyKey: string;
  eventId?: string;
  category?: NotificationCategory;
}

export const ALLOWLISTED_TEMPLATE_VARIABLES: Record<string, string[]> = {
  order_paid: ['customer_name', 'order_id', 'total_amount', 'event_name'],
  ticket_issued: ['customer_name', 'ticket_id', 'ticket_type', 'event_name', 'event_date'],
  event_cancelled: ['customer_name', 'event_name', 'cancellation_reason'],
  refund_completed: ['customer_name', 'order_id', 'refund_amount'],
  settlement_approved: ['org_name', 'settlement_id', 'net_amount'],
  promotional_alert: ['customer_name', 'promotion_title', 'discount_code'],
};

@Injectable()
export class NotificationOutboxService {
  private readonly logger = new Logger(NotificationOutboxService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly pushProvider: PushProviderService,
    private readonly emailProvider: EmailProviderService,
    private readonly smsProvider: SmsProviderService,
  ) {}

  /**
   * ATOMIC DOMAIN OUTBOX CREATION
   * Call inside originating business transaction!
   */
  async enqueueEvent(tx: any, input: EnqueueOutboxInput) {
    const db = tx ?? this.databaseService.db;

    // Idempotency check by idempotencyKey
    const existing = await db.query.notificationOutbox.findFirst({
      where: eq(notificationOutbox.idempotencyKey, input.idempotencyKey),
    });

    if (existing) {
      return existing;
    }

    const [outboxRecord] = await db
      .insert(notificationOutbox)
      .values({
        eventId: input.eventId ?? null,
        notificationType: input.notificationType,
        userId: input.userId,
        payloadJson: JSON.stringify(input.payload),
        status: 'pending',
        idempotencyKey: input.idempotencyKey,
      })
      .returning();

    return outboxRecord;
  }

  /**
   * OUTBOX WORKER CONCURRENCY (FOR UPDATE SKIP LOCKED / STALE LOCK CLAIM / RETRY BACKOFF)
   */
  async claimOutboxEvents(workerId: string, limit = 10) {
    const db = this.databaseService.db;
    const now = new Date();
    const staleLockCutoff = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes stale lock

    // Find pending, failed (with backoff passed and retries remaining), or stale processing items
    const claimable = await db.query.notificationOutbox.findMany({
      where: and(
        or(
          eq(notificationOutbox.status, 'pending'),
          and(
            eq(notificationOutbox.status, 'failed'),
            lt(notificationOutbox.retryCount, 5),
            or(
              isNull(notificationOutbox.nextAttemptAt),
              lt(notificationOutbox.nextAttemptAt, now),
            ),
          ),
          and(
            eq(notificationOutbox.status, 'processing'),
            lt(notificationOutbox.lockedAt, staleLockCutoff),
          ),
        ),
      ),
      limit,
    });

    const claimed: any[] = [];
    for (const item of claimable) {
      const [updated] = await db
        .update(notificationOutbox)
        .set({
          status: 'processing',
          lockedAt: now,
          lockedBy: workerId,
        })
        .where(
          and(
            eq(notificationOutbox.id, item.id),
            or(
              eq(notificationOutbox.status, 'pending'),
              eq(notificationOutbox.status, 'failed'),
              and(
                eq(notificationOutbox.status, 'processing'),
                lt(notificationOutbox.lockedAt, staleLockCutoff),
              ),
            ),
          ),
        )
        .returning();

      if (updated) claimed.push(updated);
    }

    return claimed;
  }

  /**
   * ASYNCHRONOUS WORKER DISPATCH PROCESSOR
   */
  async processOutboxBatch(workerId = 'worker-main', limit = 10) {
    const db = this.databaseService.db;
    const claimed = await this.claimOutboxEvents(workerId, limit);

    for (const item of claimed) {
      try {
        const payload = JSON.parse(item.payloadJson);
        const notificationType = item.notificationType;
        const userId = item.userId;

        // Determine category & bypass rules
        const category: NotificationCategory =
          payload.category ??
          (['order_paid', 'ticket_issued', 'event_cancelled', 'refund_completed', 'settlement_approved'].includes(
            notificationType,
          )
            ? 'transactional'
            : 'marketing');

        // 1. In-App Notification (Always created)
        await db.insert(inAppNotifications).values({
          userId,
          title: payload.title ?? `Notification: ${notificationType}`,
          body: payload.body ?? `Update regarding ${notificationType}`,
          metadata: JSON.stringify(payload),
        });

        // 2. Email Delivery (Check preference unless transactional)
        const emailAllowed = await this.checkPreference(userId, 'email', category);
        if (emailAllowed && payload.emailRecipient) {
          await this.dispatchToProvider(
            this.emailProvider,
            item.id,
            userId,
            notificationType,
            payload.emailRecipient,
            payload.subject ?? `Update: ${notificationType}`,
            payload,
          );
        }

        // 3. Push Delivery
        const pushAllowed = await this.checkPreference(userId, 'push', category);
        if (pushAllowed) {
          const userTokens = await db.query.deviceTokens.findMany({
            where: and(eq(deviceTokens.userId, userId), eq(deviceTokens.active, true)),
          });

          for (const dt of userTokens) {
            await this.dispatchToProvider(
              this.pushProvider,
              item.id,
              userId,
              notificationType,
              dt.token,
              payload.subject ?? `Alert: ${notificationType}`,
              payload,
            );
          }
        }

        // Mark outbox item processed
        await db
          .update(notificationOutbox)
          .set({
            status: 'processed',
            processedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
          })
          .where(eq(notificationOutbox.id, item.id));
      } catch (err: any) {
        this.logger.error(`Failed to process outbox item ${item.id}: ${err.message}`);
        const nextRetry = (item.retryCount ?? 0) + 1;
        const delayMs = Math.min(Math.pow(2, nextRetry) * 1000, 60000);
        const nextAttemptAt = new Date(Date.now() + delayMs);

        await db
          .update(notificationOutbox)
          .set({
            status: nextRetry >= 5 ? 'dead_letter' : 'failed',
            lastError: err.message,
            retryCount: nextRetry,
            nextAttemptAt,
            lockedAt: null,
            lockedBy: null,
          })
          .where(eq(notificationOutbox.id, item.id));
      }
    }
  }

  /**
   * TRANSACTIONAL PREFERENCE BYPASS CHECK
   */
  async checkPreference(userId: string, channel: NotificationChannel, category: NotificationCategory): Promise<boolean> {
    // Transactional & Security notifications BYPASS marketing opt-outs
    if (category === 'transactional') return true;

    const db = this.databaseService.db;
    const pref = await db.query.notificationPreferences.findFirst({
      where: and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.channel, channel),
        eq(notificationPreferences.category, category),
      ),
    });

    return pref ? pref.enabled : true; // Default enabled unless explicitly opted out
  }

  /**
   * PROVIDER DISPATCH WITH AUDIT ATTEMPT LOGGING
   */
  private async dispatchToProvider(
    provider: any,
    outboxId: string,
    userId: string,
    notificationType: string,
    recipient: string,
    subject: string,
    payload: Record<string, any>,
  ) {
    const db = this.databaseService.db;
    const body = payload.body ?? `Body for ${notificationType}`;

    // 1. Create Notification Log Record
    const [log] = await db
      .insert(notificationLogs)
      .values({
        outboxId,
        userId,
        notificationType,
        channel: provider.channel,
        recipient,
        subject,
        status: 'sending',
      })
      .returning();

    const startedAt = new Date();

    // 2. Invoke Provider Adapter
    const result = await provider.send({ recipient, subject, body, payload });

    // 3. Record Delivery Attempt History
    await db.insert(notificationDeliveryAttempts).values({
      logId: log!.id,
      attemptNumber: 1,
      provider: provider.providerName,
      providerMessageId: result.providerMessageId,
      status: result.status,
      failureReason: result.failureReason,
      startedAt,
      completedAt: new Date(),
    });

    // 4. Update Log Status
    await db
      .update(notificationLogs)
      .set({
        status: result.status,
        providerMessageId: result.providerMessageId,
        failureReason: result.failureReason,
      })
      .where(eq(notificationLogs.id, log!.id));

    // 5. Handle Push Token Invalidation
    if (result.invalidToken && provider.channel === 'push') {
      await db
        .update(deviceTokens)
        .set({ active: false })
        .where(eq(deviceTokens.token, recipient));
    }
  }

  /**
   * RECORD INCOMING PROVIDER WEBHOOK DELIVERY EVENT (RESEND, SENDGRID, TWILIO, FCM)
   */
  async recordProviderWebhookDelivery(provider: string, body: any): Promise<{ status: string; updatedCount: number }> {
    const db = this.databaseService.db;
    const eventsToProcess: Array<{ messageId: string; status: string; failureReason?: string }> = [];

    const norm = provider.toLowerCase();
    if (norm.includes('resend')) {
      const type = body?.type || '';
      const messageId = body?.data?.email_id || body?.data?.id || body?.id;
      if (messageId) {
        let status = 'processed';
        if (type.includes('delivered')) status = 'delivered';
        else if (type.includes('bounced')) status = 'bounced';
        else if (type.includes('complained')) status = 'complained';
        else if (type.includes('delayed')) status = 'delayed';
        eventsToProcess.push({ messageId, status, failureReason: body?.data?.rejection_reason });
      }
    } else if (norm.includes('sendgrid')) {
      const items = Array.isArray(body) ? body : [body];
      for (const item of items) {
        const rawId = item?.sg_message_id || item?.message_id;
        if (rawId) {
          const messageId = rawId.split('.')[0]; // strip SendGrid filter suffix
          const ev = (item?.event || '').toLowerCase();
          let status = 'processed';
          if (ev === 'delivered') status = 'delivered';
          else if (ev === 'bounce' || ev === 'dropped') status = 'bounced';
          else if (ev === 'deferred') status = 'delayed';
          eventsToProcess.push({ messageId, status, failureReason: item?.reason });
        }
      }
    } else if (norm.includes('twilio')) {
      const messageId = body?.MessageSid || body?.messageSid;
      if (messageId) {
        const ev = (body?.MessageStatus || '').toLowerCase();
        let status = 'processed';
        if (ev === 'delivered') status = 'delivered';
        else if (ev === 'failed' || ev === 'undelivered') status = 'failed';
        eventsToProcess.push({ messageId, status, failureReason: body?.ErrorMessage });
      }
    } else {
      // Generic provider
      const messageId = body?.providerMessageId || body?.messageId || body?.id;
      if (messageId) {
        eventsToProcess.push({
          messageId,
          status: body?.status || 'delivered',
          failureReason: body?.failureReason || body?.reason,
        });
      }
    }

    let updatedCount = 0;
    for (const ev of eventsToProcess) {
      const log = await db.query.notificationLogs.findFirst({
        where: eq(notificationLogs.providerMessageId, ev.messageId),
      });

      if (log) {
        await db
          .update(notificationLogs)
          .set({
            status: ev.status,
            failureReason: ev.failureReason || log.failureReason,
          })
          .where(eq(notificationLogs.id, log.id));

        await db.insert(notificationDeliveryAttempts).values({
          logId: log.id,
          attemptNumber: (log.retryCount ?? 0) + 1,
          provider,
          providerMessageId: ev.messageId,
          status: ev.status,
          failureReason: ev.failureReason ?? null,
          startedAt: new Date(),
          completedAt: new Date(),
        });

        if (ev.status === 'bounced' && log.channel === 'push') {
          await db
            .update(deviceTokens)
            .set({ active: false })
            .where(eq(deviceTokens.token, log.recipient));
        }

        updatedCount++;
      }
    }

    this.logger.log(`[NotificationWebhook] Processed ${eventsToProcess.length} events from ${provider}, updated ${updatedCount} logs.`);
    return { status: 'processed', updatedCount };
  }
}
