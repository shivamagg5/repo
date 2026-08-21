import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import type { IPaymentGateway, PaymentOrderIntent, PaymentWebhookEvent } from './payment-gateway.interface';

@Injectable()
export class RazorpayPaymentGateway implements IPaymentGateway {
  readonly providerName = 'razorpay';
  private readonly logger = new Logger('RazorpayPaymentGateway');

  constructor(private readonly configService: ConfigService) {}

  private get keyId(): string {
    return this.configService.get<string>('RAZORPAY_KEY_ID') ?? '';
  }

  private get keySecret(): string {
    return this.configService.get<string>('RAZORPAY_KEY_SECRET') ?? '';
  }

  private get webhookSecret(): string {
    return this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') ?? '';
  }

  /**
   * FIX-003: Create a real Razorpay order via the API.
   *
   * BEHAVIOUR CHANGE: There is NO fallback synthetic order ID.
   * If Razorpay API credentials are absent or the API call fails,
   * this method throws ServiceUnavailableException.
   *
   * A synthetic local order ID can never be verified by a real Razorpay
   * webhook — allowing it to persist creates phantom payment records that
   * block reconciliation and silently fail end-to-end checkout.
   */
  async createOrderIntent(
    orderId: string,
    amountMinor: number,
    currency: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentOrderIntent> {
    const receipt = `order_${orderId.slice(0, 8)}`;

    if (!this.keyId || !this.keySecret) {
      this.logger.error('[Razorpay] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured.');
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        message: 'Payment provider is not configured. Please contact support.',
      });
    }

    let rzpOrderId: string;
    try {
      const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: amountMinor,
          currency,
          receipt,
          notes: metadata,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '(no body)');
        this.logger.error(
          `[Razorpay] API returned HTTP ${response.status} when creating order for receipt ${receipt}: ${errText}`,
        );
        throw new ServiceUnavailableException({
          code: 'PAYMENT_PROVIDER_ERROR',
          message: 'Payment provider returned an error. Please try again shortly.',
        });
      }

      const rzpOrder: any = await response.json();
      if (!rzpOrder?.id) {
        this.logger.error(`[Razorpay] API response did not contain an order ID. Receipt: ${receipt}`);
        throw new ServiceUnavailableException({
          code: 'PAYMENT_PROVIDER_INVALID_RESPONSE',
          message: 'Payment provider returned an unexpected response.',
        });
      }

      rzpOrderId = rzpOrder.id;
      this.logger.log(`[Razorpay] Created order: ${rzpOrderId} (receipt: ${receipt})`);
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`[Razorpay] Network error contacting Razorpay: ${err.message}`);
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_UNAVAILABLE',
        message: 'Payment provider is currently unreachable. Please try again.',
      });
    }

    return {
      providerOrderId: rzpOrderId,
      amountMinor,
      currency,
      checkoutPayload: {
        key: this.keyId,
        amount: amountMinor,
        currency,
        order_id: rzpOrderId,
        name: 'EventPulse',
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
    if (!this.webhookSecret) {
      this.logger.error('[Razorpay] RAZORPAY_WEBHOOK_SECRET is not configured — rejecting webhook.');
      return false;
    }

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

  /**
   * Execute real refund via Razorpay Refund API
   * POST https://api.razorpay.com/v1/payments/{paymentId}/refund
   */
  async createRefund(
    providerPaymentId: string,
    amountMinor: number,
    reason?: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ providerRefundId: string; status: string; rawPayload?: any }> {
    if (!this.keyId || !this.keySecret) {
      this.logger.error('[Razorpay] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured for refund.');
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        message: 'Payment provider is not configured. Please contact support.',
      });
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const response = await fetch(`https://api.razorpay.com/v1/payments/${providerPaymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: amountMinor,
          notes: {
            reason: reason ?? 'Customer refund requested',
            ...metadata,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '(no body)');
        this.logger.error(`[Razorpay] Refund failed with HTTP ${response.status} for payment ${providerPaymentId}: ${errText}`);
        throw new ServiceUnavailableException({
          code: 'PAYMENT_PROVIDER_REFUND_ERROR',
          message: 'Payment provider failed to process refund. Please try again shortly.',
        });
      }

      const rzpRefund: any = await response.json();
      if (!rzpRefund?.id) {
        this.logger.error(`[Razorpay] Refund response missing ID for payment ${providerPaymentId}`);
        throw new ServiceUnavailableException({
          code: 'PAYMENT_PROVIDER_INVALID_RESPONSE',
          message: 'Payment provider returned an unexpected refund response.',
        });
      }

      this.logger.log(`[Razorpay] Refund succeeded: ${rzpRefund.id} (status: ${rzpRefund.status})`);
      return {
        providerRefundId: rzpRefund.id,
        status: rzpRefund.status ?? 'processed',
        rawPayload: rzpRefund,
      };
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`[Razorpay] Network error executing refund: ${err.message}`);
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_NETWORK_ERROR',
        message: 'Unable to reach payment provider. Please try again shortly.',
      });
    }
  }
}
