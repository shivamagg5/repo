import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrganizerDashboardService } from './organizer-dashboard.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { MembersService } from '../organizations/members.service';
import { inviteMemberSchema } from '@platform/validation';
import type { AuthContext } from '@platform/types';

@Controller('organizer')
@UseGuards(AuthGuard)
export class OrganizerDashboardController {
  constructor(
    private readonly dashboardService: OrganizerDashboardService,
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
}
