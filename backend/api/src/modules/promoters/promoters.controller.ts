import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PromotersService } from './promoters.service';
import { ReferralService } from './referral.service';
import {
  createPromoterCampaignSchema,
  recordReferralClickSchema,
  attributeOrderSchema,
} from '@platform/validation';
import type { AuthContext } from '@platform/types';

@Controller()
export class PromotersController {
  constructor(
    private readonly promotersService: PromotersService,
    private readonly referralService: ReferralService,
  ) {}

  @UseGuards(AuthGuard)
  @Post('promoter/campaigns')
  createCampaign(
    @CurrentUser() actor: AuthContext,
    @Body() body: unknown,
  ) {
    const validated = createPromoterCampaignSchema.parse(body);
    return this.promotersService.createCampaign(actor, validated);
  }

  @UseGuards(AuthGuard)
  @Get('promoter/campaigns')
  listPromoterCampaigns(@CurrentUser() actor: AuthContext) {
    return this.promotersService.findPromoterCampaigns(actor);
  }

  @UseGuards(AuthGuard)
  @Get('promoter/campaigns/:id/performance')
  getCampaignPerformance(
    @CurrentUser() actor: AuthContext,
    @Param('id') id: string,
  ) {
    return this.promotersService.getCampaignPerformance(actor, id);
  }

  @UseGuards(AuthGuard)
  @Get('promoter/earnings')
  getPromoterEarnings(@CurrentUser() actor: AuthContext) {
    return this.promotersService.getEarningsSummary(actor);
  }

  /**
   * PUBLIC REFERRAL LINK CLICK ROUTE (RATE LIMITED & ABUSE PROTECTED)
   */
  @Public()
  @Post('public/referrals/click')
  recordReferralClick(@Body() body: unknown) {
    const validated = recordReferralClickSchema.parse(body);
    return this.referralService.recordReferralClick(validated.code, validated.sessionReference);
  }

  /**
   * ORDER ATTRIBUTION ENDPOINT
   */
  @UseGuards(AuthGuard)
  @Post('orders/:id/attribute')
  attributeOrder(
    @CurrentUser() actor: AuthContext,
    @Param('id') orderId: string,
    @Body('code') code: string,
  ) {
    return this.referralService.attributeOrder(actor.userId, orderId, code);
  }
}
