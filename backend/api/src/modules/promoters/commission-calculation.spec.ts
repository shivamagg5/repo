import { Test, TestingModule } from '@nestjs/testing';
import { CommissionService } from './commission.service';
import { CommissionStateMachineService } from './promoter-state-machine.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';

describe('Task 6.1 — Integer Minor Unit Commission Calculation & Historical Snapshot Tests', () => {
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

  it('Calculates 10% percentage commission in integer minor units (100000 paise * 10% = 10000 paise)', async () => {
    let insertedValues: any = null;

    const mockTx = {
      query: {
        referralAttributions: { findFirst: async () => ({ id: 'attr-1', campaignId: 'camp-1', orderId: 'ord-1' }) },
        commissionEntries: { findFirst: async () => null }, // No existing entry
        promoterCampaigns: { findFirst: async () => ({ id: 'camp-1', commissionType: 'percentage', commissionValue: '10.0000' }) },
        orders: { findFirst: async () => ({ id: 'ord-1', userId: 'user-1', subtotalMinor: 100000, currency: 'INR' }) },
      },
      select: () => ({
        from: () => ({
          where: () => ({
            execute: async () => [{ quantity: 2 }],
          }),
        }),
      }),
      insert: () => ({
        values: (vals: any) => {
          insertedValues = vals;
          return {
            returning: async () => [{ id: 'comm-1', createdAt: new Date(), ...vals }],
          };
        },
      }),
    };

    const entry = await commissionService.calculateAndRecordCommission(mockTx, 'ord-1');

    expect(entry).not.toBeNull();
    expect(insertedValues.amountMinor).toBe(10000); // 10,000 paise (₹100)
    expect(insertedValues.commissionType).toBe('percentage');
    expect(insertedValues.commissionValue).toBe('10.0000');
    expect(insertedValues.calculationBaseMinor).toBe(100000); // Historical snapshot!
  });
});
