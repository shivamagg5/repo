import { Test, TestingModule } from '@nestjs/testing';
import { CommissionService } from './commission.service';
import { CommissionStateMachineService } from './promoter-state-machine.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';

describe('Task 6.1 — Duplicate Payment Commission Prevention Tests', () => {
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

  it('DUPLICATE PAYMENT TEST: Replaying payment webhook returns existing commission entry without double-creating', async () => {
    let insertCallCount = 0;

    const mockTx = {
      query: {
        referralAttributions: { findFirst: async () => ({ id: 'attr-1', campaignId: 'camp-1', orderId: 'ord-1' }) },
        commissionEntries: {
          findFirst: async () => {
            if (insertCallCount > 0) {
              return { id: 'comm-1', campaignId: 'camp-1', orderId: 'ord-1', amountMinor: 10000, status: 'pending', createdAt: new Date() };
            }
            return null;
          },
        },
        promoterCampaigns: { findFirst: async () => ({ id: 'camp-1', commissionType: 'percentage', commissionValue: '10.0000' }) },
        orders: { findFirst: async () => ({ id: 'ord-1', userId: 'user-1', subtotalMinor: 100000, currency: 'INR' }) },
      },
      select: () => ({
        from: () => ({
          where: () => ({ execute: async () => [{ quantity: 2 }] }),
        }),
      }),
      insert: () => ({
        values: (vals: any) => {
          insertCallCount++;
          return { returning: async () => [{ id: 'comm-1', createdAt: new Date(), ...vals }] };
        },
      }),
    };

    // First payment processing call
    const comm1 = await commissionService.calculateAndRecordCommission(mockTx, 'ord-1');
    expect(comm1?.id).toBe('comm-1');
    expect(insertCallCount).toBe(1);

    // Duplicate payment replay call
    const comm2 = await commissionService.calculateAndRecordCommission(mockTx, 'ord-1');
    expect(comm2?.id).toBe('comm-1');
    expect(insertCallCount).toBe(1); // Insert call count did NOT increase!
  });
});
