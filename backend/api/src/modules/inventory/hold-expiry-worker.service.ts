import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HoldExpirationService } from './hold-expiration.service';
import { ConfigService } from '@nestjs/config';

/**
 * Hold Expiry Worker
 *
 * Runs on a 2-minute cron to process expired inventory reservation holds.
 * Uses FOR UPDATE SKIP LOCKED inside HoldExpirationService so concurrent
 * Render instances do not double-process the same hold.
 *
 * In multi-replica environments, set CRON_WORKER=true on exactly ONE instance
 * (the dedicated worker dyno). All other replicas will skip processing.
 */
@Injectable()
export class HoldExpiryWorkerService {
  private readonly logger = new Logger('HoldExpiryWorker');
  private readonly isCronWorker: boolean;

  constructor(
    private readonly holdExpirationService: HoldExpirationService,
    private readonly config: ConfigService,
  ) {
    // Default: run cron on every instance unless CRON_WORKER env is explicitly set
    // When CRON_WORKER is defined, only instances with CRON_WORKER=true execute.
    const cronWorkerEnv = this.config.get<string>('CRON_WORKER');
    this.isCronWorker = cronWorkerEnv === undefined || cronWorkerEnv === 'true';

    if (this.isCronWorker) {
      this.logger.log('[HoldExpiryWorker] Cron worker is ACTIVE — will process expired holds every 2 minutes.');
    } else {
      this.logger.log('[HoldExpiryWorker] Cron worker is DISABLED on this instance (CRON_WORKER!=true).');
    }
  }

  /**
   * Runs every 2 minutes.
   * Releases expired inventory holds, updating ticket-type reserved quantities
   * and marking associated orders as expired.
   *
   * Idempotent: safe to run on overlapping schedules due to SKIP LOCKED.
   */
  @Cron('*/2 * * * *', { name: 'hold_expiry_worker' })
  async runHoldExpiry(): Promise<void> {
    if (!this.isCronWorker) return;

    try {
      const { expiredCount } = await this.holdExpirationService.processExpiredHolds();
      if (expiredCount > 0) {
        this.logger.log(`[HoldExpiryWorker] Released ${expiredCount} expired hold(s).`);
      }
    } catch (err: any) {
      this.logger.error(`[HoldExpiryWorker] Cron run failed: ${err.message}`, err.stack);
    }
  }
}
