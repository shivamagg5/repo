import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import {
  adminEventReviewSchema,
  adminRefundOrderSchema,
  adminAuditLogQuerySchema,
} from '@platform/validation';
import type {
  AuthContext,
  AdminEventReviewInput,
  AdminRefundOrderInput,
  AdminAuditLogQueryInput,
} from '@platform/types';

/**
 * AdminController — platform-level event moderation, order inspection, and audit log access.
 *
 * ROUTE AUTHORITY: This controller owns /admin/events/*, /admin/orders/*, /admin/audit-logs.
 * User management routes (/admin/users/*) are owned by AdminUsersController.
 * Do NOT add /admin/users routes here to avoid NestJS route conflicts.
 */
@Controller('admin')
@UseGuards(AuthGuard, RbacGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('events/review-queue')
  @RequirePermissions('event.review' as any)
  async getEventReviewQueue(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.adminService.getEventReviewQueue(parsedLimit);
  }

  @Post('events/:id/review')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('event.approve' as any)
  async reviewEvent(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Body() body: AdminEventReviewInput,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = adminEventReviewSchema.parse(body);
    return this.adminService.reviewEvent(eventId, validated as AdminEventReviewInput, actor);
  }

  @Get('orders/:id')
  @RequirePermissions('order.view' as any)
  async inspectOrder(@Param('id', ParseUUIDPipe) orderId: string) {
    return this.adminService.inspectOrder(orderId);
  }

  @Post('orders/:id/refund')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ticket.refund' as any)
  async refundOrder(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() body: AdminRefundOrderInput,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = adminRefundOrderSchema.parse(body);
    return this.adminService.refundOrder(orderId, validated as AdminRefundOrderInput, actor);
  }

  @Get('audit-logs')
  @RequirePermissions('admin.audit' as any)
  async getAuditLogs(
    @Query('adminUserId') adminUserId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const query: AdminAuditLogQueryInput = {
      adminUserId,
      action,
      entityType,
      entityId,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    const validated = adminAuditLogQuerySchema.parse(query);
    return this.adminService.getAuditLogs(validated);
  }
}
