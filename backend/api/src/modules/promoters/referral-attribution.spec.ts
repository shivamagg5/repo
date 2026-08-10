import { Test, TestingModule } from '@nestjs/testing';
import { ReferralService } from './referral.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

describe('Task 6.1 — Referral Attribution & Self-Referral Fraud Protection Tests', () => {
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

  it('ATTRIBUTION TIMING: Rejects attribution attempt if order is already PAID (Attribution is immutable post-payment)', async () => {
    const mockDb = {
      query: {
        orders: { findFirst: async () => ({ id: 'ord-1', eventId: 'event-1', userId: 'user-buyer-1', status: 'paid' }) }, // PAID order!
      },
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    await expect(
      referralService.attributeOrder('user-buyer-1', 'ord-1', 'PROMO10'),
    ).rejects.toThrow(BadRequestException);
  });

  it('PURCHASER MISMATCH: Rejects attribution attempt if caller does not own the order (403 Forbidden)', async () => {
    const mockDb = {
      query: {
        orders: { findFirst: async () => ({ id: 'ord-1', eventId: 'event-1', userId: 'user-actual-buyer', status: 'created' }) },
      },
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    await expect(
      referralService.attributeOrder('user-attacker', 'ord-1', 'PROMO10'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('SELF-REFERRAL PROTECTION: Rejects attribution if purchaser belongs to promoter organization', async () => {
    const mockDb = {
      query: {
        orders: { findFirst: async () => ({ id: 'ord-1', eventId: 'event-1', userId: 'user-team-member', status: 'created' }) },
        referralAttributions: { findFirst: async () => null },
        promoterCampaigns: { findFirst: async () => ({ id: 'camp-1', promoterId: 'prof-1', eventId: 'event-1', code: 'PROMO10', status: 'active' }) },
        promoterProfiles: { findFirst: async () => ({ id: 'prof-1', organizationId: 'org-promoter-1' }) },
        organizationMembers: { findFirst: async () => ({ id: 'mem-1', organizationId: 'org-promoter-1', userId: 'user-team-member' }) },
      },
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    await expect(
      referralService.attributeOrder('user-team-member', 'ord-1', 'PROMO10'),
    ).rejects.toThrow(BadRequestException);
  });

  it('SINGLE ATTRIBUTION ENFORCEMENT: Rejects secondary attribution for an already attributed order', async () => {
    const mockDb = {
      query: {
        orders: { findFirst: async () => ({ id: 'ord-1', eventId: 'event-1', userId: 'user-buyer-1', status: 'created' }) },
        referralAttributions: { findFirst: async () => ({ id: 'attr-existing', orderId: 'ord-1' }) }, // Already attributed!
      },
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    await expect(
      referralService.attributeOrder('user-buyer-1', 'ord-1', 'PROMO10'),
    ).rejects.toThrow(ConflictException);
  });
});
