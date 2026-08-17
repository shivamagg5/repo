import { Injectable, Logger } from '@nestjs/common';
import type { INotificationProvider, ProviderSendInput, ProviderSendResult } from './notification-provider.interface';
import type { NotificationChannel } from '@platform/types';

@Injectable()
export class EmailProviderService implements INotificationProvider {
  readonly channel: NotificationChannel = 'email';
  readonly providerName = 'SendGrid_Email_Adapter';
  private readonly logger = new Logger(EmailProviderService.name);

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    this.logger.log(`[EmailProvider] Sending email to ${input.recipient}`);

    const providerMessageId = `sg-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    return {
      status: 'provider_accepted',
      providerMessageId,
      failureReason: null,
    };
  }
}
