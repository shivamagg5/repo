import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import type { IPaymentGateway, PaymentOrderIntent, PaymentWebhookEvent } from './payment-gateway.interface';

/**
 * FIX-001 / FIX-003: MockPaymentGateway
 *
 * This gateway exists ONLY for automated test suite execution.
 * It MUST NOT be reachable in production environments.
 *
 * The constructor guard ensures that any attempt to instantiate this class
 * in a production Node process fails immediately with a hard error, providing
 * an additional defence-in-depth layer beyond the module-level factory gate.
 */
@Injectable()
export class MockPaymentGateway implements IPaymentGateway {
  readonly providerName = 'mock';

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[SECURITY VIOLATION] MockPaymentGateway must never be instantiated in production. ' +
        'Ensure PAYMENT_PROVIDER=razorpay and NODE_ENV=production are set correctly.',
      );
    }
  }

  async createOrderIntent(
    orderId: string,
    amountMinor: number,
    currency: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentOrderIntent> {
    const providerOrderId = `mock_order_${orderId.slice(0, 8)}`;
    return {
      providerOrderId,
      amountMinor,
      currency,
      checkoutPayload: {
        mockProviderOrderId: providerOrderId,
        amountMinor,
        currency,
        orderId,
      },
    };
  }

  verifyWebhookSignature(rawBodyBuffer: Buffer, signatureHeader: string): boolean {
    // Accepts only a specific test-suite header. Not accessible in production.
    return signatureHeader === 'valid_mock_signature';
  }

  parseWebhookEvent(rawBodyBuffer: Buffer): PaymentWebhookEvent {
    const body = JSON.parse(rawBodyBuffer.toString('utf8'));
    return {
      providerEventId: body.eventId || `evt_${crypto.randomBytes(8).toString('hex')}`,
      eventType: body.eventType || 'payment.captured',
      providerOrderId: body.providerOrderId,
      providerPaymentId: body.providerPaymentId || `pay_${crypto.randomBytes(8).toString('hex')}`,
      amountMinor: Number(body.amountMinor),
      currency: body.currency || 'INR',
      rawPayload: body,
    };
  }

  async createRefund(
    providerPaymentId: string,
    amountMinor: number,
    reason?: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ providerRefundId: string; status: string; rawPayload?: any }> {
    return {
      providerRefundId: `mock_ref_${crypto.randomBytes(8).toString('hex')}`,
      status: 'processed',
      rawPayload: { providerPaymentId, amountMinor, reason, metadata },
    };
  }
}
