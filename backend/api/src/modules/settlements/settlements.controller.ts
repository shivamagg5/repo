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
import { SettlementsService } from './settlements.service';
import { generateSettlementSchema, reviewSettlementSchema } from '@platform/validation';
import type { AuthContext, GenerateSettlementInput, ReviewSettlementInput } from '@platform/types';

@Controller('settlements')
@UseGuards(AuthGuard, RbacGuard)
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('finance.view' as any)
  async generateSettlement(
    @Body() body: GenerateSettlementInput,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = generateSettlementSchema.parse(body);
    return this.settlementsService.generateSettlement(validated as GenerateSettlementInput, actor);
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('settlement.approve' as any)
  async reviewSettlement(
    @Param('id', ParseUUIDPipe) settlementId: string,
    @Body() body: ReviewSettlementInput,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = reviewSettlementSchema.parse(body);
    return this.settlementsService.reviewSettlement(settlementId, validated as ReviewSettlementInput, actor);
  }

  @Get('organizer/:organizationId/statement')
  @RequirePermissions('finance.view' as any)
  async getOrganizerStatement(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.settlementsService.getOrganizerStatement(
      organizationId,
      periodStart ?? new Date(Date.now() - 30 * 86400000).toISOString(),
      periodEnd ?? new Date().toISOString(),
    );
  }
}
