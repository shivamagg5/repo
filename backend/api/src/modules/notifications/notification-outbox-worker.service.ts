import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { NotificationOutboxService } from './notification-outbox.service';

/**
 * NOTIFICATION OUTBOX WORKER SERVICE
 *
 * Runs on a periodic schedule (every 15 seconds) to drain the `notification_outbox`
 * table, claim pending or stale-locked notification events using `FOR UPDATE SKIP LOCKED`,
 * and dispatch them asynchronously through the appropriate notification channel
 * (Push/FCM, Email, SMS, In-App).
 *
 * Honors the CRON_WORKER environment variable so that only the designated worker
 * instance processes notifications in multi-instance production environments.
 */
@Injectable()
export class NotificationOutboxWorkerService {
  private readonly logger = new Logger(NotificationOutboxWorkerService.name);
  private isProcessing = false;
  private readonly isCronWorker: boolean;

  constructor(
    private readonly outboxService: NotificationOutboxService,
    private readonly configService: ConfigService,
  ) {
    // In production, only the instance with CRON_WORKER=true runs the scheduled worker.
    // Defaults to true in development/test so local workflows function without extra env setup.
    const cronWorkerEnv = this.configService.get<string>('CRON_WORKER');
    this.isCronWorker = cronWorkerEnv === undefined || cronWorkerEnv === 'true' || cronWorkerEnv === '1';

    if (this.isCronWorker) {
      this.logger.log('NotificationOutboxWorker initialized and ACTIVE (interval: 15s, batch: 25).');
    } else {
      this.logger.log('NotificationOutboxWorker INACTIVE (CRON_WORKER != true on this instance).');
    }
  }

  /**
   * Main cron job: runs every 15 seconds.
   * Uses an in-flight guard (`isProcessing`) to prevent overlapping runs if a previous batch is slow.
   */
  @Cron('*/15 * * * * *')
  async runOutboxWorker(): Promise<void> {
    if (!this.isCronWorker) {
      return;
    }

    if (this.isProcessing) {
      this.logger.debug('Previous notification outbox batch is still running; skipping tick.');
      return;
    }

    this.isProcessing = true;
    try {
      await this.outboxService.processOutboxBatch('worker-main', 25);
    } catch (err: any) {
      this.logger.error(`Notification outbox worker tick failed: ${err?.message ?? err}`, err?.stack);
    } finally {
      this.isProcessing = false;
    }
  }
}
