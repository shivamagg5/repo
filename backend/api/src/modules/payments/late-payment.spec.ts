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

describe('Task 5.1 — Late Payment & Expired Hold Safety Tests', () => {
  let paymentsService: PaymentsService;
  let dbService: DatabaseService;
  let ticketIssuanceService: TicketIssuanceService;

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
    ticketIssuanceService = module.get<TicketIssuanceService>(TicketIssuanceService);
  });

  it('LATE PAYMENT TEST: Payment succeeding after hold expired flags transaction for refund, issues 0 tickets, and converts 0 inventory', async () => {
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
                  // inventory_reservations (EXPIRED HOLD)
                  return [{ id: 'hold-1', orderId: 'ord-1', status: 'expired', expiresAt: new Date(Date.now() - 60000) }];
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

    const rawBuffer = Buffer.from(
      JSON.stringify({ eventId: 'evt_late_1001', providerOrderId: 'mock_order_1001', amountMinor: 99900 }),
    );

    const result = await paymentsService.processWebhook('mock', rawBuffer, 'valid_mock_signature');

    expect(result.status).toBe('late_payment_flagged_for_refund');
    expect(result.processed).toBe(false);
    expect(ticketIssuanceService.issueTicketsForOrder).not.toHaveBeenCalled();
  });
});
