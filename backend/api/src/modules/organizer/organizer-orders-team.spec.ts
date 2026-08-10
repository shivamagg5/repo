import { Test, TestingModule } from '@nestjs/testing';
import { OrganizerDashboardService } from './organizer-dashboard.service';
import { RbacService } from '../auth/rbac.service';
import { DatabaseService } from '../../database/database.service';
import { ForbiddenException } from '@nestjs/common';

describe('Task 7.1 — Organizer Orders & Purchaser PII Sanitization Tests', () => {
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

  it('GET /organizer/events/:id/orders returns PII-sanitized OrganizerOrderDto excluding security secrets or tokens', async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              execute: async () => [{ orgId: 'org-organizer-1', type: 'organizer' }],
            }),
          }),
        }),
      }),
      query: {
        events: {
          findFirst: async () => ({ id: 'event-1', organizerOrganizationId: 'org-organizer-1' }),
        },
      },
    };

    const mockDbOrders = {
      ...mockDb,
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              execute: async () => [{ orgId: 'org-organizer-1', type: 'organizer' }],
            }),
          }),
          leftJoin: () => ({
            leftJoin: () => ({
              leftJoin: () => ({
                where: () => ({
                  orderBy: () => ({
                    limit: () => ({
                      execute: async () => [
                        {
                          order: { id: 'ord-1001', eventId: 'event-1', status: 'paid', totalMinor: 100000, subtotalMinor: 100000, discountMinor: 0, currency: 'INR', createdAt: new Date() },
                          purchaser: { id: 'user-buyer-1', name: 'Alice Smith', email: 'alice@example.com', supabaseAuthId: 'supa-secret-id-999' },
                          attribution: { id: 'attr-1' },
                          campaign: { code: 'SUMMER2026' },
                        },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDbOrders as any);

    const actor = {
      userId: 'user-organizer-1',
      supabaseAuthId: 'supa-org-1',
      email: 'organizer@example.com',
      status: 'active' as const,
      roles: ['organizer'],
      permissions: [],
    };

    const ordersList = await dashboardService.getEventOrders(actor, 'event-1');

    expect(ordersList).toHaveLength(1);
    const dto = ordersList[0]!;

    expect(dto.orderId).toBe('ord-1001');
    expect(dto.purchaserName).toBe('Alice Smith');
    expect(dto.purchaserEmail).toBe('alice@example.com');
    expect(dto.promoterCode).toBe('SUMMER2026');

    // VERIFY ABSENCE OF PRIVACY/SECURITY LEAKS IN DTO
    expect((dto as any).supabaseAuthId).toBeUndefined();
    expect((dto as any).paymentSecret).toBeUndefined();
    expect((dto as any).auditMetadata).toBeUndefined();
  });
});
