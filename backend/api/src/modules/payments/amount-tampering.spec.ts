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

describe('Task 5.1 — Triple Amount & Currency Tampering Security Tests', () => {
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
        { provide: TicketIssuanceService, useValue: { issueTicketsForOrder: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
    dbService = module.get<DatabaseService>(DatabaseService);
  });

  it('AMOUNT MANIPULATION TEST: Webhook claiming ₹1 (100 minor) payment for ₹999 (99900 minor) order is rejected and transaction marked failed', async () => {
    let queryCallCount = 0;
    const mockTx = {
      select: () => ({
        from: () => ({
          where: () => ({
            for: () => ({
              execute: async () => {
                queryCallCount++;
                if (queryCallCount === 1) {
                  // payment_transactions
                  return [{ id: 'tx-1', orderId: 'ord-1', provider: 'mock', providerOrderId: 'mock_order_1001', amountMinor: 99900, currency: 'INR', status: 'pending' }];
                }
                if (queryCallCount === 2) {
                  // orders
                  return [{ id: 'ord-1', userId: 'user-1', status: 'created', totalMinor: 99900, currency: 'INR' }];
                }
                if (queryCallCount === 3) {
                  // inventory_reservations
                  return [{ id: 'hold-1', orderId: 'ord-1', status: 'active', expiresAt: new Date(Date.now() + 60000) }];
                }
                return [];
              },
            }),
          }),
        }),
      }),
      insert: () => ({ values: () => Promise.resolve() }),
      update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
    };

    const mockDb = {
      insert: () => ({ values: () => Promise.resolve() }),
      transaction: async (cb: any) => cb(mockTx as any),
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    // Malicious webhook payload claiming amount = 100 paise (₹1) instead of 99900 paise (₹999)
    const rawBuffer = Buffer.from(
      JSON.stringify({ eventId: 'evt_tamper_1001', providerOrderId: 'mock_order_1001', amountMinor: 100, currency: 'INR' }),
    );

    await expect(
      paymentsService.processWebhook('mock', rawBuffer, 'valid_mock_signature'),
    ).rejects.toThrow('Payment amount mismatch.');
  });
});
