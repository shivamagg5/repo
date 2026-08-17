import type { DeliveryStatus, NotificationChannel } from '@platform/types';

export interface ProviderSendInput {
  recipient: string;
  subject: string;
  body: string;
  payload?: Record<string, any>;
}

export interface ProviderSendResult {
  status: DeliveryStatus;
  providerMessageId: string | null;
  failureReason: string | null;
  invalidToken?: boolean;
}

export interface INotificationProvider {
  readonly channel: NotificationChannel;
  readonly providerName: string;
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
}
