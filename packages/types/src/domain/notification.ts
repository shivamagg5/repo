import type { NotificationStatus } from './enums.js';

export interface NotificationPreference {
  id: string;
  userId: string;
  channel: string;
  category: string;
  enabled: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  dataReference: string | null;
  status: NotificationStatus;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface DeviceToken {
  id: string;
  userId: string;
  platform: string;
  token: string;
  status: string;
  updatedAt: string;
}
