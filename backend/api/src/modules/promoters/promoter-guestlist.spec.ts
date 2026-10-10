import { Test, TestingModule } from '@nestjs/testing';
import { GuestlistService } from './guestlist.service';
import { PromotersService } from './promoters.service';
import { ScannerCryptoService } from '../scanner/scanner-crypto.service';
import { RbacService } from '../auth/rbac.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('Promoter Guestlists & UPI Payouts Test Suite', () => {
  let guestlistService: GuestlistService;
  let promotersService: PromotersService;
  let dbService: DatabaseService;

  const mockActor = {
    userId: 'usr-promoter-01',
    supabaseAuthId: 'supa-prom-01',
    email: 'promoter@nightlife.in',
    status: 'active' as const,
    roles: ['promoter'],
    permissions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestlistService,
        PromotersService,
        ScannerCryptoService,
        DatabaseService,
        {
          provide: RbacService,
          useValue: {
            assertPermissionInOrg: jest.fn().mockResolvedValue(true),
            assertOrgMembership: jest.fn().mockResolvedValue(true),
          },
        },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    guestlistService = module.get<GuestlistService>(GuestlistService);
    promotersService = module.get<PromotersService>(PromotersService);
    dbService = module.get<DatabaseService>(DatabaseService);

    const mockDb = {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              execute: async () => [{ orgId: 'org-promoter-01', type: 'promoter' }],
            }),
          }),
          where: () => ({
            execute: async () => [
              {
                id: 'comm-1',
                campaignId: 'camp-1',
                amountMinor: '250000', // ₹2,500
                calculationBaseMinor: '2500000',
                ticketQuantity: 5,
                status: 'approved',
              },
            ],
          }),
        }),
      }),
      query: {
        promoterProfiles: {
          findFirst: async () => ({ id: 'prof-01', organizationId: 'org-promoter-01', status: 'active' }),
        },
        organizations: {
          findFirst: async () => ({ id: 'org-promoter-01', name: 'DJ Party Crew', type: 'promoter' }),
        },
        events: {
          findFirst: async () => ({
            id: 'event-party-01',
            title: 'Saturday Neon Rave',
            status: 'published',
            startsAt: new Date(Date.now() + 3600000),
            endsAt: new Date(Date.now() + 28800000).toISOString(),
          }),
        },
      },
    };

    jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);
  });

  describe('Guestlist Management', () => {
    it('Creates signed guestlist pass with cryptographic offline token and curfew', async () => {
      const entry = await guestlistService.createGuestlistEntry(mockActor, {
        eventId: 'event-party-01',
        guestName: 'Rohit Sharma',
        guestPhone: '+919876543210',
        entryType: 'couple',
        allowedCount: 2,
        curfewTime: new Date(Date.now() + 7200000).toISOString(),
        tableNumber: 'VIP-04',
      });

      expect(entry).toBeDefined();
      expect(entry.guestName).toBe('Rohit Sharma');
      expect(entry.entryType).toBe('couple');
      expect(entry.allowedCount).toBe(2);
      expect(entry.status).toBe('active');
      expect(entry.qrToken).toMatch(/^TICKET\.v1\|/);
    });

    it('Retrieves submitted guestlists scoped to promoter organization', async () => {
      await guestlistService.createGuestlistEntry(mockActor, {
        eventId: 'event-party-01',
        guestName: 'Ananya Verma',
        guestPhone: '+919988776655',
        allowedCount: 1,
      });

      const list = await guestlistService.getPromoterGuestlists(mockActor, 'event-party-01');
      expect(list.length).toBeGreaterThan(0);
      expect(list.some((g) => g.guestName === 'Ananya Verma')).toBe(true);
    });

    it('Admits guest on valid pass and prevents over-admission', async () => {
      const created = await guestlistService.createGuestlistEntry(mockActor, {
        eventId: 'event-party-01',
        guestName: 'Kunal Kapoor',
        allowedCount: 2,
      });

      // Admit 1 guest
      const updated1 = await guestlistService.checkInGuestlistEntry(created.id, 1);
      expect(updated1.admittedCount).toBe(1);
      expect(updated1.status).toBe('active');

      // Admit 2nd guest
      const updated2 = await guestlistService.checkInGuestlistEntry(created.id, 1);
      expect(updated2.admittedCount).toBe(2);
      expect(updated2.status).toBe('admitted');

      // Attempt 3rd admission should reject with CAPACITY_EXCEEDED
      await expect(guestlistService.checkInGuestlistEntry(created.id, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Rejects admission if curfew cut-off has passed', async () => {
      const pastCurfew = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const expiredEntry = await guestlistService.createGuestlistEntry(mockActor, {
        eventId: 'event-party-01',
        guestName: 'Late Guest',
        curfewTime: pastCurfew,
        allowedCount: 1,
      });

      await expect(guestlistService.checkInGuestlistEntry(expiredEntry.id, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Promoter Commission Payouts (UPI & Bank IMPS)', () => {
    it('Allows promoter to request UPI payout within available commission balance', async () => {
      const payout = await promotersService.requestCommissionPayout(mockActor, {
        amountMinor: 150000, // ₹1,500 out of ₹2,500 available
        payoutMethod: 'upi',
        upiId: 'dj_rahul@okhdfcbank',
      });

      expect(payout).toBeDefined();
      expect(payout.amountMinor).toBe(150000);
      expect(payout.payoutMethod).toBe('upi');
      expect(payout.destinationDetail).toContain('dj_rahul@okhdfcbank');
      expect(payout.status).toBe('pending');
    });

    it('Rejects payout request exceeding available commission balance', async () => {
      await expect(
        promotersService.requestCommissionPayout(mockActor, {
          amountMinor: 500000, // ₹5,000 requested when only ₹2,500 available
          payoutMethod: 'upi',
          upiId: 'dj_rahul@okhdfcbank',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
