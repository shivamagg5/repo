import { Injectable, Logger } from '@nestjs/common';
import type { INotificationProvider, ProviderSendInput, ProviderSendResult } from './notification-provider.interface';
import type { NotificationChannel } from '@platform/types';
import crypto from 'node:crypto';

@Injectable()
export class PushProviderService implements INotificationProvider {
  readonly channel: NotificationChannel = 'push';
  readonly providerName = 'FCM_HTTP_v1_Adapter';
  private readonly logger = new Logger(PushProviderService.name);

  // Cached OAuth 2.0 access token for FCM HTTP v1
  private cachedAccessToken: { token: string; expiresAt: number } | null = null;

  /**
   * Dispatches push notification via Firebase Cloud Messaging HTTP v1 API:
   * POST https://fcm.googleapis.com/v1/projects/{projectId}/messages:send
   */
  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.FCM_PROJECT_ID;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const directAccessToken = process.env.FCM_ACCESS_TOKEN;

    if (!projectId && !serviceAccountJson && !directAccessToken) {
      this.logger.warn('[PushProvider] FCM HTTP v1 credentials missing (FIREBASE_PROJECT_ID / FIREBASE_SERVICE_ACCOUNT_JSON)');
      return {
        status: 'permanent_failure',
        providerMessageId: null,
        failureReason: 'PUSH_PROVIDER_UNCONFIGURED: Missing FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_JSON for FCM HTTP v1 API',
      };
    }

    try {
      let activeProjectId = projectId;
      let accessToken = directAccessToken;

      // If Service Account JSON is provided, parse and obtain OAuth 2.0 Bearer Token
      if (serviceAccountJson) {
        try {
          const sa = JSON.parse(serviceAccountJson);
          activeProjectId = activeProjectId || sa.project_id;
          accessToken = await this.getServiceAccountAccessToken(sa);
        } catch (err: any) {
          this.logger.error(`[PushProvider] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${err.message}`);
          return {
            status: 'permanent_failure',
            providerMessageId: null,
            failureReason: `FCM Auth Error: Invalid Service Account JSON - ${err.message}`,
          };
        }
      }

      if (!activeProjectId || !accessToken) {
        return {
          status: 'permanent_failure',
          providerMessageId: null,
          failureReason: 'PUSH_PROVIDER_UNCONFIGURED: Unable to resolve FCM Project ID or OAuth2 Access Token',
        };
      }

      this.logger.log(`[PushProvider] Dispatching FCM HTTP v1 push notification to token ${input.recipient.substring(0, 10)}...`);

      // Convert all payload values to strings for FCM data payload
      const stringData: Record<string, string> = {};
      if (input.payload) {
        for (const [key, val] of Object.entries(input.payload)) {
          stringData[key] = typeof val === 'string' ? val : JSON.stringify(val);
        }
      }

      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${activeProjectId}/messages:send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: input.recipient,
            notification: {
              title: input.subject,
              body: input.body,
            },
            data: stringData,
          },
        }),
      });

      const data: any = await res.json().catch(() => ({}));

      // HTTP 200 OK: returns { "name": "projects/{projectId}/messages/{messageId}" }
      if (res.ok && data.name) {
        return {
          status: 'provider_accepted',
          providerMessageId: data.name,
          failureReason: null,
        };
      }

      // Check for FCM HTTP v1 error details
      const errorCode = data.error?.details?.[0]?.errorCode || data.error?.status || res.statusText;
      const errorMessage = data.error?.message || res.statusText;

      // Detect revoked / unregistered device tokens for automated database deactivation
      const isUnregistered =
        errorCode === 'UNREGISTERED' ||
        errorCode === 'INVALID_ARGUMENT' ||
        errorMessage?.toLowerCase().includes('not registered') ||
        errorMessage?.toLowerCase().includes('invalid registration');

      if (isUnregistered) {
        this.logger.warn(`[PushProvider] FCM HTTP v1 token unregistered/invalid: ${input.recipient}`);
        return {
          status: 'permanent_failure',
          providerMessageId: null,
          failureReason: `FCM HTTP v1 Token Invalid: ${errorCode} - ${errorMessage}`,
          invalidToken: true,
        };
      }

      const isRetryable = res.status >= 500 || res.status === 429 || errorCode === 'UNAVAILABLE';
      this.logger.error(`[PushProvider] FCM HTTP v1 API error (${res.status}): ${JSON.stringify(data)}`);
      return {
        status: isRetryable ? 'retryable_failure' : 'permanent_failure',
        providerMessageId: null,
        failureReason: `FCM HTTP v1 Error (${res.status}): ${errorCode} - ${errorMessage}`,
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

  /**
   * Generates Google OAuth 2.0 Access Token from Service Account private key using standard RSA-SHA256 JWT
   */
  private async getServiceAccountAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    // Return cached token if valid for more than 60 seconds
    if (this.cachedAccessToken && this.cachedAccessToken.expiresAt > now + 60) {
      return this.cachedAccessToken.token;
    }

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: sa.client_email,
      sub: sa.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600, // 1 hour
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    };

    const base64UrlEncode = (obj: any) =>
      Buffer.from(JSON.stringify(obj)).toString('base64url');

    const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedToken);
    const signature = signer.sign(sa.private_key, 'base64url');
    const jwt = `${unsignedToken}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
    });

    const tokenData: any = await res.json().catch(() => ({}));
    if (!res.ok || !tokenData.access_token) {
      throw new Error(`Google OAuth2 Token Exchange Failed: ${tokenData.error_description || res.statusText}`);
    }

    this.cachedAccessToken = {
      token: tokenData.access_token,
      expiresAt: now + (tokenData.expires_in || 3600),
    };

    return tokenData.access_token;
  }
}
