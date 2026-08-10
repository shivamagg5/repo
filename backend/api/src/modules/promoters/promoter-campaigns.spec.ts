import { Test, TestingModule } from '@nestjs/testing';
import { PromotersService } from './promoters.service';
import { RbacService } from '../auth/rbac.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';

describe('Task 6.1 — Promoter Campaigns & Code Normalization Tests', () => {
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

  it('Referral codes are automatically normalized to uppercase and trimmed', async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              execute: async () => [{ orgId: 'org-promoter-1', type: 'promoter' }],
            }),
          }),
        }),
      }),
      query: {
        promoterProfiles: {
          findFirst: async () => ({ id: 'prof-1', organizationId: 'org-promoter-1', status: 'active' }),
        },
        events: {
          findFirst: async () => ({ id: 'event-1', title: 'Fest 2026', status: 'published' }),
        },
      },
      insert: () => ({
        values: (vals: any) => ({
          returning: async () => [{ id: 'camp-1', ...vals }],
        }),
      }),
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    const actor = {
      userId: 'user-promoter-1',
      supabaseAuthId: 'supa-1',
      email: 'promoter@example.com',
      status: 'active' as const,
      roles: ['promoter'],
      permissions: [],
    };

    const campaign = await promotersService.createCampaign(actor, {
      eventId: 'event-1',
      code: '  summer2026  ', // Lowercase with whitespace
      commissionType: 'percentage',
      commissionValue: 10,
    });

    expect(campaign.code).toBe('SUMMER2026'); // Normalized
  });
});
