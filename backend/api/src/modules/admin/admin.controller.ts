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
  adminToggleFeaturedSchema,
  adminReviewKybSchema,
  adminUpdateOrgStatusSchema,
  adminUpdateCommissionSchema,
  adminGrantCreditsSchema,
  adminModerateCampaignSchema,
  adminProcessPayoutSchema,
} from '@platform/validation';
import { PERMISSIONS } from '@platform/types';
import type {
  AuthContext,
  AdminEventReviewInput,
  AdminRefundOrderInput,
  AdminAuditLogQueryInput,
} from '@platform/types';

/**
 * AdminController — platform-level event moderation, order inspection, and audit log access.
 *
 * ROUTE AUTHORITY: This controller owns /admin/events/*, /admin/orders/*, /admin/audit-logs,
 * /admin/organizers/*, /admin/marketing/*, /admin/promoters/*, /admin/settlements.
 * User management routes (/admin/users/*) are owned by AdminUsersController.
 * Do NOT add /admin/users routes here to avoid NestJS route conflicts.
 */
@Controller('admin')
@UseGuards(AuthGuard, RbacGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ---------------------------------------------------------------------------
  // Events Management & Moderation
  // ---------------------------------------------------------------------------
  @Get('events')
  @RequirePermissions(PERMISSIONS.EVENT_REVIEW)
  async listAllEvents(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.adminService.listAllEvents({ status, search, cursor, limit: parsedLimit });
  }

  @Get('events/review-queue')
  @RequirePermissions(PERMISSIONS.EVENT_REVIEW)
  async getEventReviewQueue(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.adminService.getEventReviewQueue(parsedLimit);
  }

  @Post('events/:id/review')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.EVENT_APPROVE)
  async reviewEvent(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Body() body: AdminEventReviewInput,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = adminEventReviewSchema.parse(body);
    return this.adminService.reviewEvent(eventId, validated as AdminEventReviewInput, actor);
  }

  @Post('events/:id/toggle-featured')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.EVENT_REVIEW)
  async toggleEventFeatured(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Body() body: unknown,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = adminToggleFeaturedSchema.parse(body);
    return this.adminService.toggleEventFeatured(eventId, validated.featured, actor);
  }

  // ---------------------------------------------------------------------------
  // Organizers Management & KYB Review
  // ---------------------------------------------------------------------------
  @Get('organizers')
  @RequirePermissions(PERMISSIONS.ORG_STATUS_MANAGE)
  async listOrganizers(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('kybStatus') kybStatus?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.adminService.listOrganizers({ status, search, kybStatus, cursor, limit: parsedLimit });
  }

  @Post('organizers/:id/kyb')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ORG_KYB_REVIEW)
  async updateOrganizerKyb(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Body() body: unknown,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = adminReviewKybSchema.parse(body);
    return this.adminService.updateOrganizerKyb(organizationId, validated, actor);
  }

  @Post('organizers/:id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ORG_STATUS_MANAGE)
  async updateOrganizerStatus(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Body() body: unknown,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = adminUpdateOrgStatusSchema.parse(body);
    return this.adminService.updateOrganizerStatus(organizationId, validated, actor);
  }

  @Post('organizers/:id/commission')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ORG_COMMISSION_MANAGE)
  async updateOrganizerCommission(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Body() body: unknown,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = adminUpdateCommissionSchema.parse(body);
    return this.adminService.updateOrganizerCommission(organizationId, validated, actor);
  }

  // ---------------------------------------------------------------------------
  // Marketing Operations & Wallet Management
  // ---------------------------------------------------------------------------
  @Get('marketing/wallets')
  @RequirePermissions(PERMISSIONS.MARKETING_CREDITS_GRANT)
  async listMarketingWallets(
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.adminService.listMarketingWallets({ search, cursor, limit: parsedLimit });
  }

  @Post('marketing/wallets/:id/grant')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.MARKETING_CREDITS_GRANT)
  async grantMarketingCredits(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Body() body: unknown,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = adminGrantCreditsSchema.parse(body);
    return this.adminService.grantMarketingCredits(organizationId, validated, actor);
  }

  @Get('marketing/campaigns')
  @RequirePermissions(PERMISSIONS.MARKETING_CAMPAIGN_MODERATE)
  async listMarketingCampaigns(
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.adminService.listMarketingCampaigns({ status, cursor, limit: parsedLimit });
  }

  @Post('marketing/campaigns/:id/moderate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.MARKETING_CAMPAIGN_MODERATE)
  async moderateMarketingCampaign(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Body() body: unknown,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = adminModerateCampaignSchema.parse(body);
    return this.adminService.moderateMarketingCampaign(campaignId, validated, actor);
  }

  // ---------------------------------------------------------------------------
  // Promoter Operations & Payouts
  // ---------------------------------------------------------------------------
  @Get('promoters')
  @RequirePermissions(PERMISSIONS.PROMOTER_STATUS_MANAGE)
  async listPromoters(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.adminService.listPromoters({ status, search, cursor, limit: parsedLimit });
  }

  @Post('promoters/payouts/:id/process')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.PROMOTER_PAYOUT_PROCESS)
  async processPromoterPayout(
    @Param('id', ParseUUIDPipe) payoutId: string,
    @Body() body: unknown,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = adminProcessPayoutSchema.parse(body);
    return this.adminService.processPromoterPayout(payoutId, validated, actor);
  }

  @Post('promoters/payouts/:id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.PROMOTER_PAYOUT_PROCESS)
  async rejectPromoterPayout(
    @Param('id', ParseUUIDPipe) payoutId: string,
    @Body('reason') reason: string,
    @CurrentUser() actor: AuthContext,
  ) {
    return this.adminService.rejectPromoterPayout(payoutId, reason ?? 'Payout rejected by administrator.', actor);
  }

  // ---------------------------------------------------------------------------
  // Settlements Read
  // ---------------------------------------------------------------------------
  @Get('settlements')
  @RequirePermissions(PERMISSIONS.FINANCE_VIEW)
  async listSettlements(
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.adminService.listSettlements({ status, organizationId, cursor, limit: parsedLimit });
  }

  // ---------------------------------------------------------------------------
  // Orders & Refunds
  // ---------------------------------------------------------------------------
  @Get('orders')
  @RequirePermissions(PERMISSIONS.ORDER_VIEW)
  async listOrders(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.adminService.listOrders({ status, search, cursor, limit: parsedLimit });
  }

  @Get('orders/:id')
  @RequirePermissions(PERMISSIONS.ORDER_VIEW)
  async inspectOrder(@Param('id', ParseUUIDPipe) orderId: string) {
    return this.adminService.inspectOrder(orderId);
  }

  @Post('orders/:id/refund')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.TICKET_REFUND)
  async refundOrder(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() body: AdminRefundOrderInput,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = adminRefundOrderSchema.parse(body);
    return this.adminService.refundOrder(orderId, validated as AdminRefundOrderInput, actor);
  }

  // ---------------------------------------------------------------------------
  // Audit Logs
  // ---------------------------------------------------------------------------
  @Get('audit-logs')
  @RequirePermissions(PERMISSIONS.ADMIN_AUDIT)
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

  // ---------------------------------------------------------------------------
  // Customer Directory & Management
  // ---------------------------------------------------------------------------
  @Get('customers')
  @RequirePermissions(PERMISSIONS.USER_VIEW)
  async listCustomers(
    @Query('search') search?: string,
    @Query('tier') tier?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 25;
    return this.adminService.listCustomers({ search, tier, cursor, limit: parsedLimit });
  }

  @Get('customers/:id')
  @RequirePermissions(PERMISSIONS.USER_VIEW)
  async getCustomerProfile360(@Param('id', ParseUUIDPipe) customerId: string) {
    return this.adminService.getCustomerProfile360(customerId);
  }

  @Post('customers/:id/notes')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  async updateCustomerNotes(
    @Param('id', ParseUUIDPipe) customerId: string,
    @Body('adminNotes') adminNotes: string,
    @CurrentUser() actor: AuthContext,
  ) {
    return this.adminService.updateCustomerNotes(customerId, adminNotes ?? '', actor);
  }

  @Post('customers/tickets/:id/reissue')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.TICKET_ISSUE)
  async reissueCustomerTicket(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body('reason') reason: string,
    @CurrentUser() actor: AuthContext,
  ) {
    return this.adminService.reissueCustomerTicket(ticketId, reason ?? 'Admin manual reissue', actor);
  }

  @Post('customers/tickets/:id/transfer')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.TICKET_ISSUE)
  async transferCustomerTicket(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body('targetEmail') targetEmail: string,
    @Body('reason') reason: string,
    @CurrentUser() actor: AuthContext,
  ) {
    return this.adminService.transferCustomerTicket(ticketId, targetEmail, reason ?? 'Admin manual transfer', actor);
  }
}
