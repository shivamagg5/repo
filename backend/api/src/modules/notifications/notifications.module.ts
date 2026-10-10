import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationService } from './notification.service';
import { NotificationOutboxService } from './notification-outbox.service';
import { NotificationOutboxWorkerService } from './notification-outbox-worker.service';
import { PushProviderService } from './providers/push-provider.service';
import { EmailProviderService } from './providers/email-provider.service';
import { SmsProviderService } from './providers/sms-provider.service';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuditModule],
  controllers: [NotificationsController],
  providers: [
    NotificationService,
    NotificationOutboxService,
    NotificationOutboxWorkerService,
    PushProviderService,
    EmailProviderService,
    SmsProviderService,
  ],
  exports: [
    NotificationService,
    NotificationOutboxService,
    NotificationOutboxWorkerService,
    PushProviderService,
    EmailProviderService,
    SmsProviderService,
  ],
})
export class NotificationsModule {}
