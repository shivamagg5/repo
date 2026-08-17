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
import { RequirePermissions, Public } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import {
  recordAnalyticsEventSchema,
  recordAnalyticsBatchSchema,
  funnelQuerySchema,
} from '@platform/validation';
import type {
  AuthContext,
  RecordAnalyticsEventInput,
  RecordAnalyticsBatchInput,
  FunnelAnalysisQueryInput,
} from '@platform/types';

@Controller('analytics')
@UseGuards(AuthGuard, RbacGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Post('events')
  @HttpCode(HttpStatus.OK)
  async recordEvent(
    @Body() body: RecordAnalyticsEventInput,
    @CurrentUser() actor?: AuthContext,
  ) {
    const validated = recordAnalyticsEventSchema.parse(body);
    return this.analyticsService.recordEvent(validated as RecordAnalyticsEventInput, actor);
  }

  @Public()
  @Post('events/batch')
  @HttpCode(HttpStatus.OK)
  async recordBatch(
    @Body() body: RecordAnalyticsBatchInput,
    @CurrentUser() actor?: AuthContext,
  ) {
    const validated = recordAnalyticsBatchSchema.parse(body);
    return this.analyticsService.recordBatch(validated as RecordAnalyticsBatchInput, actor);
  }

  @Get('funnel')
  @RequirePermissions('analytics.view' as any)
  async getFunnelAnalysis(@Query() query: FunnelAnalysisQueryInput) {
    const validated = funnelQuerySchema.parse(query);
    return this.analyticsService.getFunnelAnalysis(validated);
  }

  @Get('organizer/:id')
  @RequirePermissions('event.view' as any)
  async getOrganizerAnalytics(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Query('eventId') eventId?: string,
  ) {
    return this.analyticsService.getOrganizerAnalytics(organizationId, eventId);
  }

  @Get('scanner/:eventId')
  @RequirePermissions('event.view' as any)
  async getScannerMetrics(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.analyticsService.getScannerMetrics(eventId);
  }

  @Get('admin')
  @RequirePermissions('admin.audit' as any)
  async getAdminPlatformMetrics() {
    return this.analyticsService.getAdminPlatformMetrics();
  }
}
