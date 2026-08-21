import { Injectable, Logger } from '@nestjs/common';
import type { INotificationProvider, ProviderSendInput, ProviderSendResult } from './notification-provider.interface';
import type { NotificationChannel } from '@platform/types';

@Injectable()
export class EmailProviderService implements INotificationProvider {
  readonly channel: NotificationChannel = 'email';
  readonly providerName = 'Resend_SendGrid_Email_Adapter';
  private readonly logger = new Logger(EmailProviderService.name);

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const isProduction = process.env.NODE_ENV === 'production';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || (isProduction ? null : 'onboarding@resend.dev');

    if (!fromAddress) {
      this.logger.error('[EmailProvider] Production sender email missing (EMAIL_FROM_ADDRESS must be set to a verified domain)');
      return {
        status: 'permanent_failure',
        providerMessageId: null,
        failureReason: 'EMAIL_PROVIDER_UNCONFIGURED: Missing verified EMAIL_FROM_ADDRESS for production sending domain',
      };
    }

    // 1. Resend API Integration
    if (resendApiKey) {
      try {
        this.logger.log(`[EmailProvider] Dispatching email to ${input.recipient} via Resend`);
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [input.recipient],
            subject: input.subject,
            html: input.body,
            text: input.body.replace(/<[^>]*>?/gm, ''),
          }),
        });

        const data: any = await res.json().catch(() => ({}));
        if (!res.ok) {
          const isRetryable = res.status >= 500 || res.status === 429;
          this.logger.error(`[EmailProvider] Resend API error (${res.status}): ${JSON.stringify(data)}`);
          return {
            status: isRetryable ? 'retryable_failure' : 'permanent_failure',
            providerMessageId: null,
            failureReason: `Resend HTTP ${res.status}: ${data.message || data.name || res.statusText}`,
          };
        }

        return {
          status: 'provider_accepted',
          providerMessageId: data.id || `res_${Date.now()}`,
          failureReason: null,
        };
      } catch (err: any) {
        this.logger.error(`[EmailProvider] Resend network error: ${err.message}`);
        return {
          status: 'retryable_failure',
          providerMessageId: null,
          failureReason: `Resend Network Error: ${err.message}`,
        };
      }
    }

    // 2. SendGrid v3 API Integration
    if (sendgridApiKey) {
      try {
        this.logger.log(`[EmailProvider] Dispatching email to ${input.recipient} via SendGrid`);
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: input.recipient }] }],
            from: { email: fromAddress },
            subject: input.subject,
            content: [{ type: 'text/html', value: input.body }],
          }),
        });

        if (res.status === 200 || res.status === 202) {
          const messageId = res.headers.get('X-Message-Id') || `sg_${Date.now()}`;
          return {
            status: 'provider_accepted',
            providerMessageId: messageId,
            failureReason: null,
          };
        }

        const data: any = await res.json().catch(() => ({}));
        const isRetryable = res.status >= 500 || res.status === 429;
        this.logger.error(`[EmailProvider] SendGrid API error (${res.status}): ${JSON.stringify(data)}`);
        return {
          status: isRetryable ? 'retryable_failure' : 'permanent_failure',
          providerMessageId: null,
          failureReason: `SendGrid HTTP ${res.status}: ${JSON.stringify(data.errors || data)}`,
        };
      } catch (err: any) {
        this.logger.error(`[EmailProvider] SendGrid network error: ${err.message}`);
        return {
          status: 'retryable_failure',
          providerMessageId: null,
          failureReason: `SendGrid Network Error: ${err.message}`,
        };
      }
    }

    // 3. Unconfigured / Missing Credentials
    this.logger.warn(`[EmailProvider] No email API key configured (RESEND_API_KEY / SENDGRID_API_KEY missing)`);
    return {
      status: 'permanent_failure',
      providerMessageId: null,
      failureReason: 'EMAIL_PROVIDER_UNCONFIGURED: Missing RESEND_API_KEY or SENDGRID_API_KEY',
    };
  }
}
