export interface PaymentOrderIntent {
  providerOrderId: string;
  amountMinor: number;
  currency: string;
  checkoutPayload: Record<string, unknown>;
}

export interface PaymentWebhookEvent {
  providerEventId: string;
  eventType: 'payment.captured' | 'payment.failed' | string;
  providerOrderId: string;
  providerPaymentId: string;
  amountMinor: number;
  currency: string;
  rawPayload: Record<string, unknown>;
}

export interface IPaymentGateway {
  readonly providerName: string;

  /**
   * Create provider payment order/intent.
   */
  createOrderIntent(
    orderId: string,
    amountMinor: number,
    currency: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentOrderIntent>;

  /**
   * Verify provider webhook HMAC signature using RAW HTTP request body bytes.
   * MUST NOT use parsed JSON or JSON.stringify().
   */
  verifyWebhookSignature(rawBodyBuffer: Buffer, signatureHeader: string): boolean;

  /**
   * Parse provider-specific webhook payload into normalized internal PaymentWebhookEvent.
   */
  parseWebhookEvent(rawBodyBuffer: Buffer): PaymentWebhookEvent;
}
