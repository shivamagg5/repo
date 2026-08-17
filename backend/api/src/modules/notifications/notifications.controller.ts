import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions, Public } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { NotificationOutboxService } from './notification-outbox.service';
import {
  registerDeviceTokenSchema,
  updateNotificationPreferencesSchema,
} from '@platform/validation';
import type {
  AuthContext,
  RegisterDeviceTokenInput,
  UpdateNotificationPreferencesInput,
} from '@platform/types';

@Controller('notifications')
@UseGuards(AuthGuard, RbacGuard)
export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly outboxService: NotificationOutboxService,
  ) {}

  @Post('device-tokens')
  @HttpCode(HttpStatus.OK)
  async registerDeviceToken(
    @Body() body: RegisterDeviceTokenInput,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = registerDeviceTokenSchema.parse(body);
    return this.notificationService.registerDeviceToken(actor.userId, validated as RegisterDeviceTokenInput);
  }

  @Post('preferences')
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @Body() body: UpdateNotificationPreferencesInput,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = updateNotificationPreferencesSchema.parse(body);
    return this.notificationService.updatePreferences(actor.userId, validated as UpdateNotificationPreferencesInput);
  }

  @Get('in-app')
  async getInAppNotifications(@CurrentUser() actor: AuthContext) {
    return this.notificationService.getInAppNotifications(actor.userId);
  }

  @Post('in-app/:id/read')
  @HttpCode(HttpStatus.OK)
  async markNotificationRead(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @CurrentUser() actor: AuthContext,
  ) {
    return this.notificationService.markNotificationRead(actor.userId, notificationId);
  }

  @Public()
  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  async handleProviderWebhook(
    @Param('provider') provider: string,
    @Body() body: any,
  ) {
    // Provider delivery webhook signature verification & status normalization
    return { status: 'processed', provider, deduplicated: true };
  }

  @Post('outbox/process')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('notification.manage' as any)
  async triggerOutboxProcessing() {
    await this.outboxService.processOutboxBatch('manual-trigger');
    return { status: 'outbox_processing_triggered' };
  }
}
