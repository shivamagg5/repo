import { Injectable, Logger } from '@nestjs/common';
import type { INotificationProvider, ProviderSendInput, ProviderSendResult } from './notification-provider.interface';
import type { NotificationChannel } from '@platform/types';

@Injectable()
export class PushProviderService implements INotificationProvider {
  readonly channel: NotificationChannel = 'push';
  readonly providerName = 'FCM_Push_Adapter';
  private readonly logger = new Logger(PushProviderService.name);

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    const fcmServerKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;

    if (!fcmServerKey) {
      this.logger.warn('[PushProvider] FCM credentials missing (FCM_SERVER_KEY missing)');
      return {
        status: 'permanent_failure',
        providerMessageId: null,
        failureReason: 'PUSH_PROVIDER_UNCONFIGURED: Missing FCM_SERVER_KEY',
      };
    }

    try {
      this.logger.log(`[PushProvider] Dispatching FCM push notification to token ${input.recipient.substring(0, 10)}...`);
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${fcmServerKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: input.recipient,
          notification: {
            title: input.subject,
            body: input.body,
          },
          data: input.payload || {},
          priority: 'high',
        }),
      });

      const data: any = await res.json().catch(() => ({}));

      if (res.ok && data.success === 1 && data.results?.[0]?.message_id) {
        return {
          status: 'provider_accepted',
          providerMessageId: data.results[0].message_id,
          failureReason: null,
        };
      }

      // Check for revoked/unregistered token errors
      const errorStr = data.results?.[0]?.error || data.error || res.statusText;
      const isUnregistered =
        errorStr === 'NotRegistered' ||
        errorStr === 'InvalidRegistration' ||
        errorStr === 'messaging/registration-token-not-registered';

      if (isUnregistered) {
        this.logger.warn(`[PushProvider] FCM token unregistered/invalid: ${input.recipient}`);
        return {
          status: 'permanent_failure',
          providerMessageId: null,
          failureReason: `FCM Token Invalid: ${errorStr}`,
          invalidToken: true,
        };
      }

      const isRetryable = res.status >= 500 || errorStr === 'Unavailable' || errorStr === 'InternalServerError';
      this.logger.error(`[PushProvider] FCM API error (${res.status}): ${JSON.stringify(data)}`);
      return {
        status: isRetryable ? 'retryable_failure' : 'permanent_failure',
        providerMessageId: null,
        failureReason: `FCM HTTP ${res.status}: ${errorStr}`,
      };
    } catch (err: any) {
      this.logger.error(`[PushProvider] FCM network error: ${err.message}`);
      return {
        status: 'retryable_failure',
        providerMessageId: null,
        failureReason: `FCM Network Error: ${err.message}`,
      };
    }
  }
}
