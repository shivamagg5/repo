import { RazorpayPaymentGateway } from './gateways/razorpay-payment.gateway';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';

describe('Task 5.1 — Raw Body Webhook Signature Verification Tests', () => {
  let gateway: RazorpayPaymentGateway;
  const webhookSecret = 'test_webhook_secret_key_12345';

  beforeEach(() => {
    const configService = {
      get: (key: string) => {
        if (key === 'RAZORPAY_WEBHOOK_SECRET') return webhookSecret;
        return 'test_placeholder';
      },
    } as ConfigService;

    gateway = new RazorpayPaymentGateway(configService);
  });

  it('Accepts webhooks with valid HMAC SHA256 signature computed over raw body bytes', () => {
    const rawPayloadBuffer = Buffer.from(
      JSON.stringify({
        event: 'payment.captured',
        event_id: 'evt_test_1001',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_1001',
              order_id: 'order_rzp_1001',
              amount: 99900,
              currency: 'INR',
            },
          },
        },
      }),
      'utf8',
    );

    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayloadBuffer)
      .digest('hex');

    const isValid = gateway.verifyWebhookSignature(rawPayloadBuffer, validSignature);
    expect(isValid).toBe(true);
  });

  it('Rejects forged or tampered webhook signatures (401 Unauthorized)', () => {
    const rawPayloadBuffer = Buffer.from(
      JSON.stringify({ event: 'payment.captured', amount: 99900 }),
      'utf8',
    );

    const invalidSignature = 'a'.repeat(64); // Forged signature

    const isValid = gateway.verifyWebhookSignature(rawPayloadBuffer, invalidSignature);
    expect(isValid).toBe(false);
  });

  it('Rejects signature verified against mutated JSON stringify payload (raw body invariant)', () => {
    const rawPayloadBuffer = Buffer.from('{"event":"payment.captured", "amount": 99900 }', 'utf8');

    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayloadBuffer)
      .digest('hex');

    // Mutated payload (pretty printed or key ordered)
    const mutatedBuffer = Buffer.from(JSON.stringify(JSON.parse(rawPayloadBuffer.toString())), 'utf8');

    // Signature against raw buffer passes
    expect(gateway.verifyWebhookSignature(rawPayloadBuffer, validSignature)).toBe(true);

    // Signature against mutated JSON.stringify buffer FAILS
    expect(gateway.verifyWebhookSignature(mutatedBuffer, validSignature)).toBe(false);
  });
});
