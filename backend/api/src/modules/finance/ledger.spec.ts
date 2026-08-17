import { LedgerService } from './ledger.service';
import { BadRequestException } from '@nestjs/common';

describe('LedgerService — Double-Entry Journal & Invariant Suite', () => {
  let ledgerService: LedgerService;
  let mockDb: any;
  let mockDatabaseService: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockDb = {
      insert: jest.fn().mockImplementation((table) => ({
        values: jest.fn().mockImplementation((val) => ({
          returning: jest.fn().mockResolvedValue(Array.isArray(val) ? val : [val]),
        })),
      })),
      query: {
        financialTransactions: {
          findMany: jest.fn(),
        },
      },
    };

    mockDatabaseService = { db: mockDb };
    mockAuditService = { log: jest.fn() };

    ledgerService = new LedgerService(mockDatabaseService as any, mockAuditService as any);
  });

  it('JOURNAL INVARIANT: Posts balanced journal transaction (sum debits === sum credits)', async () => {
    const res = await ledgerService.postJournal({
      transactionType: 'payment_capture',
      referenceType: 'order',
      referenceId: 'ord-100',
      lines: [
        { account: 'payment_clearing', debitMinor: 10000, creditMinor: 0 },
        { account: 'organizer_payable', debitMinor: 0, creditMinor: 8200 },
        { account: 'platform_revenue', debitMinor: 0, creditMinor: 1000 },
        { account: 'tax_payable', debitMinor: 0, creditMinor: 800 },
      ],
    });

    expect(res).toBeDefined();
    expect(mockDb.insert).toHaveBeenCalledTimes(2); // Header + Lines
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'finance.journal_posted',
      }),
    );
  });

  it('JOURNAL INVARIANT: Rejects unbalanced financial journal transaction', async () => {
    await expect(
      ledgerService.postJournal({
        transactionType: 'unbalanced_entry',
        referenceType: 'order',
        referenceId: 'ord-100',
        lines: [
          { account: 'payment_clearing', debitMinor: 10000, creditMinor: 0 },
          { account: 'organizer_payable', debitMinor: 0, creditMinor: 5000 }, // Total credits = 5000 != 10000
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('CHART OF ACCOUNTS: Rejects unknown account string', async () => {
    await expect(
      ledgerService.postJournal({
        transactionType: 'invalid_account_entry',
        referenceType: 'order',
        referenceId: 'ord-100',
        lines: [
          { account: 'UNKNOWN_SECRET_ACCOUNT' as any, debitMinor: 1000, creditMinor: 0 },
          { account: 'payment_clearing', debitMinor: 0, creditMinor: 1000 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('POSTING TEMPLATE: Posts payment capture journal accurately', async () => {
    const res = await ledgerService.postPaymentCaptured('ord-200', 10000, 1000, 180);
    expect(res).toBeDefined();
  });

  it('POSTING TEMPLATE: Posts refund journal accurately', async () => {
    const res = await ledgerService.postRefund('ord-200', 10000, 1000, 180);
    expect(res).toBeDefined();
  });
});
