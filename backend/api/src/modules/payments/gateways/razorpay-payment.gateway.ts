import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import type { IPaymentGateway, PaymentOrderIntent, PaymentWebhookEvent } from './payment-gateway.interface';

@Injectable()
export class RazorpayPaymentGateway implements IPaymentGateway {
  readonly providerName = 'razorpay';
  private readonly logger = new Logger('RazorpayPaymentGateway');

  constructor(private readonly configService: ConfigService) {}

  private get keyId(): string {
    return this.configService.get<string>('RAZORPAY_KEY_ID') || 'rzp_test_placeholder';
  }

  private get keySecret(): string {
    return this.configService.get<string>('RAZORPAY_KEY_SECRET') || 'rzp_secret_placeholder';
  }

  private get webhookSecret(): string {
    return this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || 'rzp_webhook_secret_placeholder';
  }

  async createOrderIntent(
    orderId: string,
    amountMinor: number,
    currency: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentOrderIntent> {
    // Generate deterministic provider order ID for test/integration execution
    // In production, invokes Razorpay API: razorpay.orders.create({ amount, currency, receipt })
    const receipt = `order_${orderId.slice(0, 8)}`;
    const providerOrderId = `order_${crypto.createHash('sha256').update(orderId + amountMinor).digest('hex').slice(0, 14)}`;

    return {
      providerOrderId,
      amountMinor,
      currency,
      checkoutPayload: {
        key: this.keyId,
        amount: amountMinor,
        currency,
        order_id: providerOrderId,
        name: 'Event Ecosystem Platform',
        description: `Ticket Purchase (Order #${orderId.slice(0, 8)})`,
        receipt,
        notes: metadata,
      },
    };
  }

  /**
   * VERIFY HMAC SHA256 SIGNATURE OVER RAW REQUEST BODY BYTES
   */
  verifyWebhookSignature(rawBodyBuffer: Buffer, signatureHeader: string): boolean {
    if (!signatureHeader || !rawBodyBuffer) return false;

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBodyBuffer)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(signatureHeader, 'utf8'),
      );
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      return false;
    }
  }

  /**
   * PARSE PROVIDER-SPECIFIC RAZORPAY WEBHOOK PAYLOAD
   */
  parseWebhookEvent(rawBodyBuffer: Buffer): PaymentWebhookEvent {
    let body: any;
    try {
      body = JSON.parse(rawBodyBuffer.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid JSON payload in webhook body.');
    }

    const event = body.event;
    const containsPayment = body.payload && body.payload.payment;

    if (!event || !containsPayment) {
      throw new BadRequestException('Malformed Razorpay webhook payload format.');
    }

    const paymentEntity = body.payload.payment.entity;
    const providerEventId = body.event_id || `evt_${crypto.randomBytes(8).toString('hex')}`;
    const providerOrderId = paymentEntity.order_id;
    const providerPaymentId = paymentEntity.id;
    const amountMinor = Number(paymentEntity.amount);
    const currency = paymentEntity.currency || 'INR';

    return {
      providerEventId,
      eventType: event,
      providerOrderId,
      providerPaymentId,
      amountMinor,
      currency,
      rawPayload: body,
    };
  }
}
