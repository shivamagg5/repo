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

describe('Task 5.1 — Webhook Idempotency & Replay Protection Tests', () => {
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
        {
          provide: TicketIssuanceService,
          useValue: { issueTicketsForOrder: jest.fn().mockResolvedValue([{ id: 'tkt-1' }]) },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
    dbService = module.get<DatabaseService>(DatabaseService);
    ticketIssuanceService = module.get<TicketIssuanceService>(TicketIssuanceService);
  });

  it('DUPLICATE WEBHOOK TEST: Replays of identical payment webhook return cached result without double-issuing tickets', async () => {
    let paymentEventsCount = 0;

    let queryCallCount = 0;
    const mockDb = {
      insert: (table: any) => ({
        values: (vals: any) => {
          if (paymentEventsCount > 0) {
            const err = new Error('Unique constraint violation') as any;
            err.code = '23505';
            throw err;
          }
          paymentEventsCount++;
          return Promise.resolve();
        },
      }),
      transaction: async (cb: any) => cb({
        select: () => ({
          from: () => ({
            where: () => ({
              for: () => ({
                execute: async () => {
                  queryCallCount++;
                  if (queryCallCount === 1) {
                    // payment_transactions
                    return [{ id: 'tx-1', orderId: 'ord-1', provider: 'mock', providerOrderId: 'order_1001', amountMinor: 99900, currency: 'INR', status: 'pending' }];
                  }
                  if (queryCallCount === 2) {
                    // orders
                    return [{ id: 'ord-1', userId: 'user-1', status: 'created', totalMinor: 99900, currency: 'INR' }];
                  }
                  if (queryCallCount === 3) {
                    // inventory_reservations
                    return [{ id: 'hold-1', orderId: 'ord-1', ticketTypeId: 'tkt-type-1', quantity: 2, status: 'active', expiresAt: new Date(Date.now() + 600000) }];
                  }
                  return [];
                },
              }),
            }),
          }),
        }),
        update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
      }),
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    const rawBuffer = Buffer.from(
      JSON.stringify({ eventId: 'evt_dup_1001', providerOrderId: 'order_1001', amountMinor: 99900 }),
    );

    // First webhook receipt
    const res1 = await paymentsService.processWebhook('mock', rawBuffer, 'valid_mock_signature');
    expect(res1.status).not.toBe('duplicate_event_ignored');

    // Second webhook receipt (duplicate replay)
    const res2 = await paymentsService.processWebhook('mock', rawBuffer, 'valid_mock_signature');
    expect(res2.status).toBe('duplicate_event_ignored');
    expect(res2.processed).toBe(false);

    // Verify ticket issuance was NOT called on duplicate replay
    expect(ticketIssuanceService.issueTicketsForOrder).toHaveBeenCalledTimes(1);
  });
});
