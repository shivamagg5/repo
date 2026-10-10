import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  Header,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrganizerDashboardService } from './organizer-dashboard.service';
import { OrganizerMarketingService } from './organizer-marketing.service';
import { OrganizerDataService } from './organizer-data.service';
import { OrganizerPayoutService } from './organizer-payout.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { MembersService } from '../organizations/members.service';
import {
  inviteMemberSchema,
  createOrganizerCampaignSchema,
  addMarketingCreditsSchema,
  attendeeQuerySchema,
  createPaymentProfileSchema,
  createScannerPairingTokenSchema,
} from '@platform/validation';
import type { AuthContext } from '@platform/types';

@Controller('organizer')
@UseGuards(AuthGuard)
export class OrganizerDashboardController {
  constructor(
    private readonly dashboardService: OrganizerDashboardService,
    private readonly marketingService: OrganizerMarketingService,
    private readonly dataService: OrganizerDataService,
    private readonly payoutService: OrganizerPayoutService,
    private readonly orgsService: OrganizationsService,
    private readonly membersService: MembersService,
  ) {}

  @Get('overview')
  getOverview(@CurrentUser() actor: AuthContext) {
    return this.dashboardService.getOverview(actor);
  }

  @Get('events')
  getEvents(
    @CurrentUser() actor: AuthContext,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getEvents(actor, cursor, limit ? Number(limit) : 20);
  }

  @Get('events/:id/dashboard')
  getEventDashboard(
    @CurrentUser() actor: AuthContext,
    @Param('id') eventId: string,
  ) {
    return this.dashboardService.getEventDashboard(actor, eventId);
  }

  @Get('events/:id/orders')
  getEventOrders(
    @CurrentUser() actor: AuthContext,
    @Param('id') eventId: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getEventOrders(actor, eventId, limit ? Number(limit) : 20);
  }

  @Get('events/:eventId/orders/:orderId/receipt')
  getEventOrderReceipt(
    @CurrentUser() actor: AuthContext,
    @Param('eventId') eventId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.dashboardService.getOrderReceipt(actor, eventId, orderId);
  }

  @Post('scanner/pairing-token')
  createScannerPairingToken(
    @CurrentUser() actor: AuthContext,
    @Body() body: unknown,
  ) {
    const validated = createScannerPairingTokenSchema.parse(body);
    return this.dashboardService.createScannerPairingToken(actor, validated);
  }

  @Get('events/:id/attendance')
  getEventAttendance(
    @CurrentUser() actor: AuthContext,
    @Param('id') eventId: string,
  ) {
    return this.dashboardService.getEventAttendance(actor, eventId);
  }

  @Get('events/:id/promoters')
  getEventPromoters(
    @CurrentUser() actor: AuthContext,
    @Param('id') eventId: string,
  ) {
    return this.dashboardService.getEventPromoters(actor, eventId);
  }

  @Get('team')
  async getTeam(@CurrentUser() actor: AuthContext) {
    const orgId = await this.dashboardService.getUserOrganizerOrgId(actor.userId);
    return this.membersService.listMembers(actor.userId, orgId);
  }

  @Post('team/invitations')
  async inviteTeamMember(
    @CurrentUser() actor: AuthContext,
    @Body() body: unknown,
  ) {
    const validated = inviteMemberSchema.parse(body);
    const orgId = await this.dashboardService.getUserOrganizerOrgId(actor.userId);
    return this.membersService.invite(actor.userId, orgId, validated as any);
  }

  @Delete('team/:userId')
  @HttpCode(HttpStatus.OK)
  async removeTeamMember(
    @CurrentUser() actor: AuthContext,
    @Param('userId') targetUserId: string,
  ) {
    const orgId = await this.dashboardService.getUserOrganizerOrgId(actor.userId);
    await this.membersService.removeMember(actor.userId, orgId, targetUserId);
    return { success: true, message: 'Member removed successfully.' };
  }

  @Patch('team/:userId/role')
  @HttpCode(HttpStatus.OK)
  async updateTeamMemberRole(
    @CurrentUser() actor: AuthContext,
    @Param('userId') targetUserId: string,
    @Body() body: { roleId: string },
  ) {
    const orgId = await this.dashboardService.getUserOrganizerOrgId(actor.userId);
    return this.membersService.changeRole(actor.userId, orgId, targetUserId, body as any);
  }

  // ---------------------------------------------------------------------------
  // Phase 1: Marketing & Campaigns
  // ---------------------------------------------------------------------------
  @Get('marketing/overview')
  getMarketingOverview(@CurrentUser() actor: AuthContext) {
    return this.marketingService.getOverview(actor);
  }

  @Get('marketing/campaigns')
  listMarketingCampaigns(@CurrentUser() actor: AuthContext) {
    return this.marketingService.listCampaigns(actor);
  }

  @Post('marketing/campaigns')
  createMarketingCampaign(
    @CurrentUser() actor: AuthContext,
    @Body() body: unknown,
  ) {
    const validated = createOrganizerCampaignSchema.parse(body);
    return this.marketingService.createCampaign(actor, validated);
  }

  @Get('marketing/whatsapp-templates')
  listWhatsappTemplates(@CurrentUser() actor: AuthContext) {
    return this.marketingService.listWhatsappTemplates(actor);
  }

  @Post('marketing/whatsapp-templates')
  createWhatsappTemplate(
    @CurrentUser() actor: AuthContext,
    @Body() body: { name: string; category?: string; language?: string; body: string; headerText?: string; buttonUrl?: string },
  ) {
    return this.marketingService.createWhatsappTemplate(actor, body);
  }

  @Get('marketing/credits')
  getMarketingCredits(@CurrentUser() actor: AuthContext) {
    return this.marketingService.getCredits(actor);
  }

  @Post('marketing/credits/topup')
  topupMarketingCredits(
    @CurrentUser() actor: AuthContext,
    @Body() body: unknown,
  ) {
    const validated = addMarketingCreditsSchema.parse(body);
    return this.marketingService.topupCredits(actor, validated);
  }

  // ---------------------------------------------------------------------------
  // Phase 2: Audience & Data
  // ---------------------------------------------------------------------------
  @Get('data/attendees')
  getAttendees(
    @CurrentUser() actor: AuthContext,
    @Query() query: unknown,
  ) {
    const validated = attendeeQuerySchema.parse(query);
    return this.dataService.getAttendees(actor, validated);
  }

  @Get('data/promoters')
  getPromoterPerformance(@CurrentUser() actor: AuthContext) {
    return this.dataService.getPromoterPerformance(actor);
  }

  @Get('data/scan-metrics')
  getScanMetrics(
    @CurrentUser() actor: AuthContext,
    @Query('eventId') eventId?: string,
  ) {
    return this.dataService.getScanMetrics(actor, eventId);
  }

  @Get('data/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="attendees_export.csv"')
  async exportAttendeesCsv(
    @CurrentUser() actor: AuthContext,
    @Query('eventId') eventId?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.dataService.exportAttendeesCsv(actor, eventId);
    if (res) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="attendees_export.csv"');
      return res.status(200).send(csv);
    }
    return csv;
  }

  // ---------------------------------------------------------------------------
  // Phase 3: Payout & Settlements
  // ---------------------------------------------------------------------------
  @Get('payouts/profiles')
  getPaymentProfiles(@CurrentUser() actor: AuthContext) {
    return this.payoutService.getPaymentProfiles(actor);
  }

  @Post('payouts/profiles')
  createPaymentProfile(
    @CurrentUser() actor: AuthContext,
    @Body() body: unknown,
  ) {
    const validated = createPaymentProfileSchema.parse(body);
    return this.payoutService.createPaymentProfile(actor, validated);
  }

  @Get('payouts/events')
  getEventPayouts(@CurrentUser() actor: AuthContext) {
    return this.payoutService.getEventPayouts(actor);
  }
}
