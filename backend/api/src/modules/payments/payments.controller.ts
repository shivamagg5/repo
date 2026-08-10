import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  Headers,
  UseGuards,
  RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { createPaymentIntentSchema } from '@platform/validation';
import type { AuthContext } from '@platform/types';
import type { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(AuthGuard)
  @Post('intent')
  createPaymentIntent(
    @CurrentUser() actor: AuthContext,
    @Body() body: unknown,
    @Headers('idempotency-key') headerIdempotencyKey?: string,
  ) {
    const validated = createPaymentIntentSchema.parse(body);
    const key = validated.idempotencyKey ?? headerIdempotencyKey;
    return this.paymentsService.createPaymentIntent(actor, { ...validated, idempotencyKey: key });
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  getPaymentTransaction(
    @CurrentUser() actor: AuthContext,
    @Param('id') id: string,
  ) {
    return this.paymentsService.findTransactionById(actor, id);
  }

  /**
   * WEBHOOK ROUTE — PUBLIC ACCESS (CRYPTO HMACS AUTHENTICATED OVER RAW HTTP BODY BYTES)
   */
  @Public()
  @Post('webhooks/:provider')
  async handleWebhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') razorpaySignature?: string,
    @Headers('x-webhook-signature') genericSignature?: string,
  ) {
    const signature = razorpaySignature || genericSignature || '';
    
    // Extract raw body Buffer
    const rawBodyBuffer = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));

    return this.paymentsService.processWebhook(provider, rawBodyBuffer, signature);
  }
}
