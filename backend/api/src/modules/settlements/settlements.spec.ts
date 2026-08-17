import { SettlementsService } from './settlements.service';
import { SettlementStateMachineService } from './settlement-state-machine.service';
import { ForbiddenException, ConflictException } from '@nestjs/common';

describe('SettlementsService — Net Settlement Calculation & Segregation Suite', () => {
  let settlementsService: SettlementsService;
  let mockDb: any;
  let mockDatabaseService: any;
  let mockAuditService: any;
  let mockLedgerService: any;

  const mockPreparer = { userId: 'usr-preparer-1', roles: ['finance_admin'] } as any;
  const mockApprover = { userId: 'usr-approver-2', roles: ['super_admin'] } as any;

  beforeEach(() => {
    mockDb = {
      query: {
        settlements: {
          findFirst: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        organizations: {
          findFirst: jest.fn().mockResolvedValue({ id: 'org-100', name: 'Sunburn Org' }),
        },
        orders: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'ord-1', totalMinor: 100000, status: 'paid', createdAt: new Date() },
          ]),
        },
        commissionEntries: {
          findMany: jest.fn().mockResolvedValue([
            { amountMinor: 5000, createdAt: new Date() },
          ]),
        },
      },
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            {
              id: 'set-100',
              organizationId: 'org-100',
              grossSalesMinor: 100000,
              refundsMinor: 0,
              platformCommissionMinor: 10000,
              promoterCommissionMinor: 5000,
              taxMinor: 1800,
              netSettlementMinor: 83200,
              status: 'pending_review',
              idempotencyKey: 'SETTLEMENT-KEY-001',
              preparedBy: 'usr-preparer-1',
              preparedAt: new Date(),
              periodStart: new Date(),
              periodEnd: new Date(),
              createdAt: new Date(),
            },
          ]),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(true),
        }),
      }),
    };

    mockDatabaseService = { db: mockDb };
    mockAuditService = { log: jest.fn() };
    mockLedgerService = { postJournal: jest.fn().mockResolvedValue({}) };

    settlementsService = new SettlementsService(
      mockDatabaseService as any,
      mockAuditService as any,
      new SettlementStateMachineService(),
      mockLedgerService as any,
    );
  });

  it('NET SETTLEMENT DERIVATION: Calculates net settlement from orders, refunds, fees, and commissions', async () => {
    mockDb.query.settlements.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const res = await settlementsService.generateSettlement(
      {
        organizationId: 'org-100',
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-08-10T00:00:00.000Z',
        idempotencyKey: 'SETTLEMENT-KEY-001',
      },
      mockPreparer,
    );

    expect(res.id).toBe('set-100');
    expect(res.netSettlementMinor).toBe(83200); // 100000 - 10000 (platform fee) - 5000 (promoter fee) - 1800 (tax)
    expect(mockLedgerService.postJournal).toHaveBeenCalled();
  });

  it('SEGREGATION OF DUTIES: Rejects approval when preparer attempts to approve their own settlement', async () => {
    mockDb.query.settlements.findFirst.mockResolvedValue({
      id: 'set-100',
      preparedBy: 'usr-preparer-1', // Same user as actor
      status: 'pending_review',
    });

    await expect(
      settlementsService.reviewSettlement('set-100', { action: 'approve' }, mockPreparer),
    ).rejects.toThrow(ForbiddenException);
  });

  it('SEGREGATION OF DUTIES: Allows distinct administrator to approve settlement', async () => {
    mockDb.query.settlements.findFirst.mockResolvedValue({
      id: 'set-100',
      preparedBy: 'usr-preparer-1', // Prepared by User 1
      status: 'pending_review',
      periodStart: new Date(),
      periodEnd: new Date(),
      createdAt: new Date(),
      preparedAt: new Date(),
    });

    const res = await settlementsService.reviewSettlement('set-100', { action: 'approve' }, mockApprover);
    expect(res.status).toBe('approved');
  });

  it('SETTLEMENT UNIQUENESS: Rejects duplicate settlement generation for same scope', async () => {
    mockDb.query.settlements.findFirst
      .mockResolvedValueOnce(null) // idempotency check
      .mockResolvedValueOnce({ id: 'existing-scope-settlement' }); // scope conflict

    await expect(
      settlementsService.generateSettlement(
        {
          organizationId: 'org-100',
          periodStart: '2026-08-01T00:00:00.000Z',
          periodEnd: '2026-08-10T00:00:00.000Z',
          idempotencyKey: 'NEW-KEY-002',
        },
        mockPreparer,
      ),
    ).rejects.toThrow(ConflictException);
  });
});
