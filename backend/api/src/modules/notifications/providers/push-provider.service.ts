import { Injectable, Logger } from '@nestjs/common';
import type { INotificationProvider, ProviderSendInput, ProviderSendResult } from './notification-provider.interface';
import type { NotificationChannel } from '@platform/types';

@Injectable()
export class PushProviderService implements INotificationProvider {
  readonly channel: NotificationChannel = 'push';
  readonly providerName = 'FCM_Push_Adapter';
  private readonly logger = new Logger(PushProviderService.name);

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    this.logger.log(`[PushProvider] Sending push notification to token ${input.recipient.substring(0, 10)}...`);

    // Simulated provider error for revoked token testing
    if (input.recipient.includes('invalid_token')) {
      return {
        status: 'permanent_failure',
        providerMessageId: null,
        failureReason: 'messaging/registration-token-not-registered',
        invalidToken: true,
      };
    }

    const providerMessageId = `fcm-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    return {
      status: 'provider_accepted',
      providerMessageId,
      failureReason: null,
    };
  }
}
