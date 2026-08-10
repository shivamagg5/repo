import { Test, TestingModule } from '@nestjs/testing';
import { CommissionService } from './commission.service';
import { CommissionStateMachineService } from './promoter-state-machine.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';

describe('Task 6.1 — Refund Reversal & Paid Commission Protection Tests', () => {
  let commissionService: CommissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionService,
        CommissionStateMachineService,
        DatabaseService,
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    commissionService = module.get<CommissionService>(CommissionService);
  });

  it('PAID COMMISSION REVERSAL: Full refund on a PAID commission transitions status to REVERSED (auditable reversal)', async () => {
    let updatedSet: any = null;

    const mockTx = {
      query: {
        commissionEntries: {
          findFirst: async () => ({
            id: 'comm-paid-1',
            orderId: 'ord-1',
            status: 'paid', // Historically paid commission
            amountMinor: 5000,
          }),
        },
      },
      update: () => ({
        set: (vals: any) => {
          updatedSet = vals;
          return { where: () => Promise.resolve() };
        },
      }),
    };

    await commissionService.processRefundAdjustment(mockTx, 'ord-1', 50000, true);

    expect(updatedSet).not.toBeNull();
    expect(updatedSet.status).toBe('reversed'); // Auditable reversal status (NEVER overwritten to rejected)
  });
});
