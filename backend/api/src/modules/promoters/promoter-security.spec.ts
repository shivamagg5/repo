import { Test, TestingModule } from '@nestjs/testing';
import { PromotersService } from './promoters.service';
import { RbacService } from '../auth/rbac.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';
import { ForbiddenException } from '@nestjs/common';

describe('Task 6.1 — Cross-Promoter Security & Data Isolation Tests', () => {
  let promotersService: PromotersService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotersService,
        DatabaseService,
        { provide: RbacService, useValue: { assertPermissionInOrg: jest.fn().mockResolvedValue(true) } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    promotersService = module.get<PromotersService>(PromotersService);
    dbService = module.get<DatabaseService>(DatabaseService);
  });

  it('CROSS-PROMOTER ISOLATION: Promoter A cannot view performance metrics for Promoter B campaign (403 Forbidden)', async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              execute: async () => [{ orgId: 'org-promoter-A', type: 'promoter' }],
            }),
          }),
        }),
      }),
      query: {
        promoterProfiles: {
          findFirst: async () => ({ id: 'prof-promoter-A', organizationId: 'org-promoter-A', status: 'active' }),
        },
        promoterCampaigns: {
          findFirst: async () => ({ id: 'camp-B-1', promoterId: 'prof-promoter-B', eventId: 'event-1', code: 'PROMOB' }), // Owned by Promoter B!
        },
      },
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    const actorA = {
      userId: 'user-promoter-A',
      supabaseAuthId: 'supa-A',
      email: 'promoterA@example.com',
      status: 'active' as const,
      roles: ['promoter'],
      permissions: [],
    };

    await expect(
      promotersService.getCampaignPerformance(actorA, 'camp-B-1'),
    ).rejects.toThrow(ForbiddenException);
  });
});
