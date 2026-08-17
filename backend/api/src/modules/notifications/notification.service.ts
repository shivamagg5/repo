import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { deviceTokens, notificationPreferences, inAppNotifications } from '../../database/schema/index';
import { eq, and, desc, lt } from 'drizzle-orm';
import type {
  RegisterDeviceTokenInput,
  UpdateNotificationPreferencesInput,
  DeviceTokenDto,
  NotificationPreferenceDto,
  InAppNotificationDto,
} from '@platform/types';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * REGISTER DEVICE TOKEN (IDEMPOTENT UNIQUE(platform, token))
   */
  async registerDeviceToken(userId: string, input: RegisterDeviceTokenInput): Promise<DeviceTokenDto> {
    const db = this.databaseService.db;

    // Check if token already exists for platform
    const existing = await db.query.deviceTokens.findFirst({
      where: and(
        eq(deviceTokens.platform, input.platform),
        eq(deviceTokens.token, input.token),
      ),
    });

    if (existing) {
      await db
        .update(deviceTokens)
        .set({
          userId,
          deviceId: input.deviceId,
          active: true,
          lastActiveAt: new Date(),
        })
        .where(eq(deviceTokens.id, existing.id));

      const updated = await db.query.deviceTokens.findFirst({
        where: eq(deviceTokens.id, existing.id),
      });
      return this.mapDeviceTokenDto(updated!);
    }

    const [created] = await db
      .insert(deviceTokens)
      .values({
        userId,
        deviceId: input.deviceId,
        token: input.token,
        platform: input.platform,
        active: true,
      })
      .returning();

    return this.mapDeviceTokenDto(created!);
  }

  /**
   * UPDATE NOTIFICATION PREFERENCES
   */
  async updatePreferences(
    userId: string,
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferenceDto[]> {
    const db = this.databaseService.db;
    const results: NotificationPreferenceDto[] = [];

    for (const p of input.preferences) {
      const existing = await db.query.notificationPreferences.findFirst({
        where: and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.channel, p.channel),
          eq(notificationPreferences.category, p.category),
        ),
      });

      if (existing) {
        await db
          .update(notificationPreferences)
          .set({ enabled: p.enabled })
          .where(eq(notificationPreferences.id, existing.id));

        results.push({
          id: existing.id,
          userId,
          channel: p.channel,
          category: p.category,
          enabled: p.enabled,
        });
      } else {
        const [inserted] = await db
          .insert(notificationPreferences)
          .values({
            userId,
            channel: p.channel,
            category: p.category,
            enabled: p.enabled,
          })
          .returning();

        results.push({
          id: inserted!.id,
          userId,
          channel: p.channel,
          category: p.category,
          enabled: p.enabled,
        });
      }
    }

    return results;
  }

  /**
   * GET IN-APP NOTIFICATIONS INBOX
   */
  async getInAppNotifications(userId: string, limit = 20): Promise<InAppNotificationDto[]> {
    const db = this.databaseService.db;
    const rows = await db.query.inAppNotifications.findMany({
      where: eq(inAppNotifications.userId, userId),
      limit,
      orderBy: [desc(inAppNotifications.createdAt)],
    });

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      title: r.title,
      body: r.body,
      metadata: r.metadata,
      read: r.read,
      readAt: r.readAt ? r.readAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /**
   * MARK IN-APP NOTIFICATION AS READ
   */
  async markNotificationRead(userId: string, notificationId: string): Promise<InAppNotificationDto> {
    const db = this.databaseService.db;
    const notif = await db.query.inAppNotifications.findFirst({
      where: eq(inAppNotifications.id, notificationId),
    });

    if (!notif) {
      throw new NotFoundException(`In-app notification ${notificationId} not found`);
    }

    if (notif.userId !== userId) {
      throw new ForbiddenException('Cannot mark notification as read for another user');
    }

    await db
      .update(inAppNotifications)
      .set({ read: true, readAt: new Date() })
      .where(eq(inAppNotifications.id, notificationId));

    return {
      id: notif.id,
      userId: notif.userId,
      title: notif.title,
      body: notif.body,
      metadata: notif.metadata,
      read: true,
      readAt: new Date().toISOString(),
      createdAt: notif.createdAt.toISOString(),
    };
  }

  private mapDeviceTokenDto(dt: typeof deviceTokens.$inferSelect): DeviceTokenDto {
    return {
      id: dt.id,
      userId: dt.userId,
      deviceId: dt.deviceId,
      token: dt.token,
      platform: dt.platform as any,
      active: dt.active,
      lastActiveAt: dt.lastActiveAt.toISOString(),
      createdAt: dt.createdAt.toISOString(),
    };
  }
}
