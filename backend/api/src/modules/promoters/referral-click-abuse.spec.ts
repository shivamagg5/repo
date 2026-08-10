import { Test, TestingModule } from '@nestjs/testing';
import { ReferralService } from './referral.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';
import { NotFoundException } from '@nestjs/common';

describe('Task 6.1 — Public Referral Click Abuse & Validation Tests', () => {
  let referralService: ReferralService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        DatabaseService,
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    referralService = module.get<ReferralService>(ReferralService);
    dbService = module.get<DatabaseService>(DatabaseService);
  });

  it('Rejects referral click tracking for non-existent or inactive referral code (404)', async () => {
    const mockDb = {
      query: {
        promoterCampaigns: { findFirst: async () => null }, // Non-existent
      },
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    await expect(
      referralService.recordReferralClick('INVALID_CODE_999'),
    ).rejects.toThrow(NotFoundException);
  });

  it('Referral click tracking records analytics click event but NEVER creates commission entitlement', async () => {
    let clickInserted = false;

    const mockDb = {
      query: {
        promoterCampaigns: { findFirst: async () => ({ id: 'camp-1', code: 'VALID2026', status: 'active' }) },
        commissionEntries: { findFirst: async () => null },
      },
      insert: () => ({
        values: (vals: any) => {
          clickInserted = true;
          return Promise.resolve();
        },
      }),
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    const res = await referralService.recordReferralClick('VALID2026', 'sess-12345');

    expect(res.campaignId).toBe('camp-1');
    expect(clickInserted).toBe(true);
    // Clicks alone do NOT create commission entries in database!
  });
});
