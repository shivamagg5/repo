import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import type { IPaymentGateway, PaymentOrderIntent, PaymentWebhookEvent } from './payment-gateway.interface';

@Injectable()
export class MockPaymentGateway implements IPaymentGateway {
  readonly providerName = 'mock';

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
    // Mock signature verification for test suite execution
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
}
