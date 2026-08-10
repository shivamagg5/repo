import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { RazorpayPaymentGateway } from './gateways/razorpay-payment.gateway';
import { MockPaymentGateway } from './gateways/mock-payment.gateway';
import { PaymentTransactionStateMachineService } from './payment-transaction-state-machine.service';
import { OrderStateMachineService } from '../orders/order-state-machine.service';
import { HoldStateMachineService } from '../inventory/hold-state-machine.service';
import { TicketIssuanceService } from '../tickets/ticket-issuance.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';

import { ConfigService } from '@nestjs/config';

describe('Task 5.1 — Payment Intent Idempotency & Retry Tests', () => {
  let paymentsService: PaymentsService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        RazorpayPaymentGateway,
        MockPaymentGateway,
        PaymentTransactionStateMachineService,
        OrderStateMachineService,
        HoldStateMachineService,
        DatabaseService,
        { provide: ConfigService, useValue: { get: () => 'test_webhook_secret' } },
        { provide: TicketIssuanceService, useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
    dbService = module.get<DatabaseService>(DatabaseService);
  });

  it('PAYMENT INTENT RETRY TEST: Retrying createPaymentIntent for existing pending order returns existing provider order ID', async () => {
    const testOrderId = '11111111-1111-1111-1111-111111111111';
    const testUserId = '22222222-2222-2222-2222-222222222222';
    const existingTxId = 'tx-existing-123';
    const existingProviderOrderId = 'mock_order_existing_123';

    const mockDb = {
      query: {
        orders: {
          findFirst: async () => ({ id: testOrderId, userId: testUserId, status: 'created', totalMinor: 99900, currency: 'INR' }),
        },
        inventoryReservations: {
          findFirst: async () => ({ id: 'hold-1', orderId: testOrderId, status: 'active', expiresAt: new Date(Date.now() + 600000) }),
        },
        paymentTransactions: {
          findFirst: async () => ({
            id: existingTxId,
            orderId: testOrderId,
            provider: 'mock',
            providerOrderId: existingProviderOrderId,
            amountMinor: 99900,
            currency: 'INR',
            status: 'pending',
          }),
        },
      },
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    const actor = {
      userId: testUserId,
      supabaseAuthId: 'supa-2222',
      email: 'user@example.com',
      status: 'active' as const,
      roles: ['consumer'],
      permissions: [],
    };

    const res = await paymentsService.createPaymentIntent(actor, {
      orderId: testOrderId,
      provider: 'mock',
    });

    expect(res.paymentTransactionId).toBe(existingTxId);
    expect(res.providerOrderId).toBe(existingProviderOrderId);
  });
});
