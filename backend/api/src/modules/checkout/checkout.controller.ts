import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CheckoutService, type CreateCheckoutSessionInput } from './checkout.service';
import type { AuthContext } from '@platform/types';
import { z } from 'zod';

const checkoutItemSchema = z.object({
  ticketTypeId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

const createCheckoutSessionSchema = z.object({
  eventId: z.string().uuid(),
  items: z.array(checkoutItemSchema).min(1),
  promoCode: z.string().max(50).optional().nullable(),
});

@Controller('checkout')
@UseGuards(AuthGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.OK)
  createSession(
    @CurrentUser() actor: AuthContext,
    @Body() body: unknown,
  ) {
    const validated = createCheckoutSessionSchema.parse(body);
    return this.checkoutService.createSession(actor, validated as CreateCheckoutSessionInput);
  }

  @Get('sessions/:id')
  getSession(
    @CurrentUser() actor: AuthContext,
    @Param('id') id: string,
  ) {
    return this.checkoutService.getSession(actor, id);
  }

  @Post('sessions/:id/payment')
  @HttpCode(HttpStatus.OK)
  initiatePayment(
    @CurrentUser() actor: AuthContext,
    @Param('id') id: string,
  ) {
    return this.checkoutService.initiatePayment(actor, id);
  }

  @Post('sessions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelSession(
    @CurrentUser() actor: AuthContext,
    @Param('id') id: string,
  ) {
    return this.checkoutService.cancelSession(actor, id);
  }
}
