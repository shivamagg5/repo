import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VenueDashboardService } from './venue-dashboard.service';
import { MembersService } from '../organizations/members.service';
import { inviteMemberSchema } from '@platform/validation';
import type { AuthContext } from '@platform/types';

@Controller('venue')
@UseGuards(AuthGuard)
export class VenueDashboardController {
  constructor(
    private readonly dashboardService: VenueDashboardService,
    private readonly membersService: MembersService,
  ) {}

  @Get('profile')
  getProfile(@CurrentUser() actor: AuthContext) {
    return this.dashboardService.getProfile(actor);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() actor: AuthContext,
    @Body() body: unknown,
  ) {
    return this.dashboardService.updateProfile(actor, body as any);
  }

  @Get('calendar')
  getCalendar(@CurrentUser() actor: AuthContext) {
    return this.dashboardService.getCalendar(actor);
  }

  @Get('events')
  getEvents(@CurrentUser() actor: AuthContext) {
    return this.dashboardService.getEvents(actor);
  }

  @Get('staff')
  async getStaff(@CurrentUser() actor: AuthContext) {
    const orgId = await this.dashboardService.getUserVenueOrgId(actor.userId);
    return this.membersService.listMembers(actor.userId, orgId);
  }

  @Post('staff')
  async inviteStaff(
    @CurrentUser() actor: AuthContext,
    @Body() body: unknown,
  ) {
    const validated = inviteMemberSchema.parse(body);
    const orgId = await this.dashboardService.getUserVenueOrgId(actor.userId);
    return this.membersService.invite(actor.userId, orgId, validated as any);
  }
}
