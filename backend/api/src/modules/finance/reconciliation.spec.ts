import { ReconciliationService } from './reconciliation.service';

describe('ReconciliationService — Traceable Mismatch Exception Suite', () => {
  let reconciliationService: ReconciliationService;
  let mockDb: any;
  let mockDatabaseService: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockDb = {
      query: {
        orders: {
          findMany: jest.fn(),
        },
      },
      insert: jest.fn().mockImplementation(() => ({
        values: jest.fn().mockImplementation((val) => ({
          returning: jest.fn().mockResolvedValue(
            Array.isArray(val)
              ? val.map((v, i) => ({ id: `rec-exc-${i}`, createdAt: new Date(), ...v }))
              : [{ id: 'rec-run-100', createdAt: new Date(), ...val }],
          ),
        })),
      })),
    };

    mockDatabaseService = { db: mockDb };
    mockAuditService = { log: jest.fn() };

    reconciliationService = new ReconciliationService(
      mockDatabaseService as any,
      mockAuditService as any,
    );
  });

  it('RECONCILIATION EXCEPTIONS: Creates detailed exception records for missing payment transaction', async () => {
    mockDb.query.orders.findMany.mockResolvedValue([
      {
        id: 'ord-mismatch-1',
        totalMinor: 10000,
        currency: 'INR',
        createdAt: new Date(),
        payments: [], // Missing payment transaction!
      },
    ]);

    const res = await reconciliationService.runReconciliation('2026-08-10');
    expect(res.status).toBe('exceptions_flagged');
    expect(res.totalMismatchedCount).toBe(1);
    expect(res.exceptions?.length).toBe(1);
    expect(res.exceptions![0]!.mismatchType).toBe('MISSING_PAYMENT_TRANSACTION');
    expect(res.exceptions![0]!.expectedAmountMinor).toBe(10000);
  });

  it('RECONCILIATION EXCEPTIONS: Creates exception records for payment amount mismatch', async () => {
    mockDb.query.orders.findMany.mockResolvedValue([
      {
        id: 'ord-mismatch-2',
        totalMinor: 10000,
        currency: 'INR',
        createdAt: new Date(),
        payments: [
          { id: 'ptx-1', providerPaymentId: 'pay_rzp_99', amountMinor: 9000 }, // Expected 10000, actual 9000
        ],
      },
    ]);

    const res = await reconciliationService.runReconciliation('2026-08-10');
    expect(res.status).toBe('exceptions_flagged');
    expect(res.totalMismatchedCount).toBe(1);
    expect(res.exceptions![0]!.mismatchType).toBe('AMOUNT_MISMATCH');
    expect(res.exceptions![0]!.differenceMinor).toBe(1000);
  });
});
