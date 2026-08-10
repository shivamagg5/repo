import { Test, TestingModule } from '@nestjs/testing';
import { OrganizerDashboardService } from './organizer-dashboard.service';
import { RbacService } from '../auth/rbac.service';
import { DatabaseService } from '../../database/database.service';
import { ForbiddenException } from '@nestjs/common';

describe('Task 7.1 — Organizer Dashboard Overview & Analytics Tests', () => {
  let dashboardService: OrganizerDashboardService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizerDashboardService,
        DatabaseService,
        { provide: RbacService, useValue: { assertPermissionInOrg: jest.fn().mockResolvedValue(true) } },
      ],
    }).compile();

    dashboardService = module.get<OrganizerDashboardService>(OrganizerDashboardService);
    dbService = module.get<DatabaseService>(DatabaseService);
  });

  it('GET /organizer/overview: Calculates explicit integer minor unit financial metrics for organizer', async () => {
    let callIndex = 0;
    const mockDb = {
      select: () => {
        callIndex++;
        if (callIndex === 1) {
          // getUserOrganizerOrgId: organizationMembers query
          return {
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  execute: async () => [{ orgId: 'org-organizer-1', type: 'organizer' }],
                }),
              }),
            }),
          };
        }
        if (callIndex === 2) {
          // events query
          return {
            from: () => ({
              where: () => ({
                execute: async () => [
                  { id: 'event-1', status: 'published' },
                  { id: 'event-2', status: 'live' },
                ],
              }),
            }),
          };
        }
        if (callIndex === 3) {
          // orders query
          return {
            from: () => ({
              where: () => ({
                execute: async () => [
                  { id: 'ord-1', eventId: 'event-1', status: 'paid', subtotalMinor: 100000, discountMinor: 0 },
                  { id: 'ord-2', eventId: 'event-2', status: 'paid', subtotalMinor: 200000, discountMinor: 1000 },
                ],
              }),
            }),
          };
        }
        if (callIndex === 4) {
          // ticketTypes query
          return {
            from: () => ({
              where: () => ({
                execute: async () => [
                  { id: 'tier-1', eventId: 'event-1', quantity: 100, soldQuantity: 20, reservedQuantity: 5 },
                  { id: 'tier-2', eventId: 'event-2', quantity: 200, soldQuantity: 50, reservedQuantity: 10 },
                ],
              }),
            }),
          };
        }
        if (callIndex === 5) {
          // active holds query
          return {
            from: () => ({
              innerJoin: () => ({
                where: () => Promise.resolve([{ count: 15 }]),
              }),
            }),
          };
        }
        if (callIndex === 6) {
          // commission_entries query
          return {
            from: () => ({
              where: () => ({
                execute: async () => [{ id: 'comm-1', orderId: 'ord-1', amountMinor: 10000, status: 'pending' }],
              }),
            }),
          };
        }
        return {
          from: () => ({
            where: () => ({ execute: async () => [] }),
          }),
        };
      },
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    const actor = {
      userId: 'user-organizer-1',
      supabaseAuthId: 'supa-org-1',
      email: 'organizer@example.com',
      status: 'active' as const,
      roles: ['organizer'],
      permissions: [],
    };

    const overview = await dashboardService.getOverview(actor);

    expect(overview.organizationId).toBe('org-organizer-1');
    expect(overview.totalActiveEvents).toBe(2);
    expect(overview.grossTicketSalesMinor).toBe(300000); // 300,000 paise (₹3,000)
    expect(overview.promoterCommissionsMinor).toBe(10000); // 10,000 paise (₹100)
    expect(overview.netOrganizerMinor).toBe(290000); // Net: ₹2,900
    expect(overview.totalTicketsSold).toBe(70);
  });

  it('CROSS-ORGANIZER ACCESS ISOLATION: Rejects attempts to access another organization event dashboard (403 Forbidden)', async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              execute: async () => [{ orgId: 'org-organizer-A', type: 'organizer' }],
            }),
          }),
        }),
      }),
      query: {
        events: {
          findFirst: async () => ({ id: 'event-B-1', organizerOrganizationId: 'org-organizer-B' }), // Owned by Organizer B!
        },
      },
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    const actorA = {
      userId: 'user-organizer-A',
      supabaseAuthId: 'supa-org-A',
      email: 'orgA@example.com',
      status: 'active' as const,
      roles: ['organizer'],
      permissions: [],
    };

    await expect(
      dashboardService.getEventDashboard(actorA, 'event-B-1'),
    ).rejects.toThrow(ForbiddenException);
  });
});
