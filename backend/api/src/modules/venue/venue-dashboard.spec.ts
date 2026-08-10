import { Test, TestingModule } from '@nestjs/testing';
import { VenueDashboardService } from './venue-dashboard.service';
import { RbacService } from '../auth/rbac.service';
import { DatabaseService } from '../../database/database.service';
import { ForbiddenException } from '@nestjs/common';

describe('Task 7.1 — Venue Dashboard Profile, Calendar & Security Isolation Tests', () => {
  let venueDashboardService: VenueDashboardService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueDashboardService,
        DatabaseService,
        { provide: RbacService, useValue: { assertPermissionInOrg: jest.fn().mockResolvedValue(true) } },
      ],
    }).compile();

    venueDashboardService = module.get<VenueDashboardService>(VenueDashboardService);
    dbService = module.get<DatabaseService>(DatabaseService);
  });

  it('GET /venue/calendar returns hosted events with canonical Asia/Kolkata timezone', async () => {
    let callIndex = 0;
    const mockDbCalendar = {
      select: () => {
        callIndex++;
        if (callIndex === 1) {
          // getUserVenueOrgId query
          return {
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  execute: async () => [{ orgId: 'org-venue-1', type: 'venue' }],
                }),
              }),
            }),
          };
        }
        if (callIndex === 2) {
          // getProfile query
          return {
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  execute: async () => [{ orgId: 'org-venue-1', type: 'venue' }],
                }),
              }),
            }),
          };
        }
        // getCalendar hostedEvents query
        return {
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                orderBy: () => ({
                  execute: async () => [
                    {
                      event: { id: 'event-1', title: 'Music Fest 2026', startsAt: new Date('2026-09-01T18:00:00Z'), endsAt: new Date('2026-09-01T23:00:00Z'), status: 'published' },
                      organizer: { name: 'Live Nation Org' },
                    },
                  ],
                }),
              }),
            }),
          }),
        };
      },
      query: {
        venues: {
          findFirst: async () => ({ id: 'venue-1', organizationId: 'org-venue-1', name: 'Grand Arena', slug: 'grand-arena', capacity: 5000, status: 'active' }),
        },
      },
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDbCalendar as any);

    const actor = {
      userId: 'user-venue-manager-1',
      supabaseAuthId: 'supa-venue-1',
      email: 'venue@example.com',
      status: 'active' as const,
      roles: ['venue_manager'],
      permissions: [],
    };

    const calendar = await venueDashboardService.getCalendar(actor);

    expect(calendar.venueId).toBe('venue-1');
    expect(calendar.timezone).toBe('Asia/Kolkata');
    expect(calendar.events).toHaveLength(1);
    expect(calendar.events[0]!.eventTitle).toBe('Music Fest 2026');
    expect(calendar.events[0]!.organizerName).toBe('Live Nation Org');
  });

  it('CROSS-VENUE ACCESS ISOLATION: Rejects attempts by non-venue organization user (403 Forbidden)', async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              execute: async () => [], // No active venue organization membership!
            }),
          }),
        }),
      }),
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

    const actorNonVenue = {
      userId: 'user-consumer-1',
      supabaseAuthId: 'supa-cons-1',
      email: 'consumer@example.com',
      status: 'active' as const,
      roles: ['consumer'],
      permissions: [],
    };

    await expect(
      venueDashboardService.getProfile(actorNonVenue),
    ).rejects.toThrow(ForbiddenException);
  });
});
