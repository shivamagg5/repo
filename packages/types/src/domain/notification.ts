export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';

export type NotificationCategory = 'transactional' | 'marketing' | 'reminders';

export type OutboxStatus = 'pending' | 'processing' | 'processed' | 'failed';

export type DeliveryStatus =
  | 'queued'
  | 'sending'
  | 'provider_accepted'
  | 'delivered'
  | 'retryable_failure'
  | 'permanent_failure'
  | 'bounced'
  | 'cancelled';

export type CmsContentStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface NotificationOutboxDto {
  id: string;
  eventId: string | null;
  notificationType: string;
  userId: string;
  payloadJson: string;
  status: OutboxStatus;
  idempotencyKey: string;
  retryCount: number;
  lockedAt: string | null;
  lockedBy: string | null;
  nextAttemptAt: string | null;
  processedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface DeviceTokenDto {
  id: string;
  userId: string;
  deviceId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  active: boolean;
  lastActiveAt: string;
  createdAt: string;
}

export interface RegisterDeviceTokenInput {
  deviceId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
}

export interface NotificationPreferenceDto {
  id: string;
  userId: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  enabled: boolean;
}

export interface UpdateNotificationPreferencesInput {
  preferences: {
    channel: NotificationChannel;
    category: NotificationCategory;
    enabled: boolean;
  }[];
}

export interface NotificationTemplateDto {
  id: string;
  notificationType: string;
  locale: string;
  channel: NotificationChannel;
  version: number;
  subject: string;
  bodyTemplate: string;
  variablesJson: string;
}

export interface NotificationDeliveryAttemptDto {
  id: string;
  logId: string;
  attemptNumber: number;
  provider: string;
  providerMessageId: string | null;
  status: DeliveryStatus;
  failureReason: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface NotificationLogDto {
  id: string;
  outboxId: string | null;
  userId: string;
  notificationType: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  status: DeliveryStatus;
  providerMessageId: string | null;
  failureReason: string | null;
  retryCount: number;
  createdAt: string;
  attempts?: NotificationDeliveryAttemptDto[];
}

export interface InAppNotificationDto {
  id: string;
  userId: string;
  title: string;
  body: string;
  metadata: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface CmsBannerDto {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  displayOrder: number;
  status: CmsContentStatus;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
}

export interface CreateCmsBannerInput {
  title: string;
  imageUrl: string;
  targetUrl: string;
  displayOrder?: number;
  status?: CmsContentStatus;
  startAt?: string;
  endAt?: string;
}

export interface CmsFeaturedEventDto {
  id: string;
  eventId: string;
  displayOrder: number;
  badgeText: string | null;
  status: CmsContentStatus;
  createdAt: string;
}

export interface CmsCollectionEventDto {
  id: string;
  collectionId: string;
  eventId: string;
  displayOrder: number;
}

export interface CmsCollectionDto {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  status: CmsContentStatus;
  publishedAt: string | null;
  createdAt: string;
  events?: CmsCollectionEventDto[];
}

export interface CreateCmsCollectionInput {
  title: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  eventIds?: string[];
  status?: CmsContentStatus;
}

export interface CmsEditorialBlockDto {
  id: string;
  blockType: string;
  headline: string;
  bodyMarkdown: string;
  mediaUrl: string | null;
  displayOrder: number;
  status: CmsContentStatus;
  createdAt: string;
}
