import { Injectable, Logger } from '@nestjs/common';
import type { INotificationProvider, ProviderSendInput, ProviderSendResult } from './notification-provider.interface';
import type { NotificationChannel } from '@platform/types';

@Injectable()
export class SmsProviderService implements INotificationProvider {
  readonly channel: NotificationChannel = 'sms';
  readonly providerName = 'Twilio_SMS_Adapter';
  private readonly logger = new Logger(SmsProviderService.name);

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      this.logger.warn('[SmsProvider] Twilio credentials missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER)');
      return {
        status: 'permanent_failure',
        providerMessageId: null,
        failureReason: 'SMS_PROVIDER_UNCONFIGURED: Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER',
      };
    }

    try {
      this.logger.log(`[SmsProvider] Dispatching SMS to ${input.recipient} via Twilio REST API`);
      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const params = new URLSearchParams({
        To: input.recipient,
        From: fromNumber,
        Body: input.body,
      });

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data: any = await res.json().catch(() => ({}));

      if (res.status === 201 || res.status === 200) {
        return {
          status: 'provider_accepted',
          providerMessageId: data.sid || null,
          failureReason: null,
        };
      }

      const isRetryable = res.status >= 500 || res.status === 429;
      this.logger.error(`[SmsProvider] Twilio API error (${res.status}): ${JSON.stringify(data)}`);
      return {
        status: isRetryable ? 'retryable_failure' : 'permanent_failure',
        providerMessageId: null,
        failureReason: `Twilio HTTP ${res.status}: [Code ${data.code}] ${data.message || res.statusText}`,
      };
    } catch (err: any) {
      this.logger.error(`[SmsProvider] Twilio network error: ${err.message}`);
      return {
        status: 'retryable_failure',
        providerMessageId: null,
        failureReason: `Twilio Network Error: ${err.message}`,
      };
    }
  }
}
