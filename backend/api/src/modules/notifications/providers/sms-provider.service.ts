import { Injectable, Logger } from '@nestjs/common';
import type { INotificationProvider, ProviderSendInput, ProviderSendResult } from './notification-provider.interface';
import type { NotificationChannel } from '@platform/types';

@Injectable()
export class SmsProviderService implements INotificationProvider {
  readonly channel: NotificationChannel = 'sms';
  readonly providerName = 'Twilio_SMS_Adapter';
  private readonly logger = new Logger(SmsProviderService.name);

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    this.logger.log(`[SmsProvider] Sending SMS to ${input.recipient}`);

    const providerMessageId = `tw-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    return {
      status: 'provider_accepted',
      providerMessageId,
      failureReason: null,
    };
  }
}
