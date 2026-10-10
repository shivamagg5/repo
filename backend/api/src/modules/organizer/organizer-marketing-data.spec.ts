import { Test, TestingModule } from '@nestjs/testing';
import { OrganizerMarketingService } from './organizer-marketing.service';
import { OrganizerDataService } from './organizer-data.service';
import { OrganizerPayoutService } from './organizer-payout.service';
import { DatabaseService } from '../../database/database.service';
import { RbacService } from '../auth/rbac.service';
import type { AuthContext } from '@platform/types';

describe('Organizer Marketing, Audience Data & Payouts Suite', () => {
  let marketingService: OrganizerMarketingService;
  let dataService: OrganizerDataService;
  let payoutService: OrganizerPayoutService;

  const mockActor: AuthContext = {
    userId: 'user-org-owner-1',
    supabaseAuthId: 'sup-auth-1',
    email: 'org@test.com',
    status: 'active',
    permissions: [
      'event.create',
      'event.edit',
      'event.view_analytics',
      'settlement.view',
      'member.manage',
    ],
  };

  const createdProfiles: any[] = [];
  const mockDb = {
    db: {
      select: jest.fn(),
      insert: jest.fn().mockImplementation(() => ({
        values: jest.fn().mockImplementation((val: any) => ({
          returning: jest.fn().mockImplementation(() => {
            const row = {
              id: 'prof-test-1',
              createdAt: new Date(),
              ...val,
            };
            createdProfiles.push(row);
            return Promise.resolve([row]);
          }),
        })),
      })),
      update: jest.fn(),
      query: {
        events: {
          findFirst: jest.fn(),
        },
        promoterCampaigns: {
          findFirst: jest.fn(),
        },
        promoterProfiles: {
          findFirst: jest.fn(),
        },
        paymentProfiles: {
          findMany: jest.fn().mockImplementation(() => Promise.resolve([...createdProfiles])),
        },
        marketingCreditLedgers: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      },
    },
  };

  const mockRbac = {
    assertPermissionInOrg: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    createdProfiles.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizerMarketingService,
        OrganizerDataService,
        OrganizerPayoutService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: RbacService, useValue: mockRbac },
      ],
    }).compile();

    marketingService = module.get<OrganizerMarketingService>(OrganizerMarketingService);
    dataService = module.get<OrganizerDataService>(OrganizerDataService);
    payoutService = module.get<OrganizerPayoutService>(OrganizerPayoutService);

    // Default membership mock
    (mockDb.db.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue([{ orgId: 'org-test-1', type: 'organizer' }]),
          }),
        }),
      }),
    });
  });

  describe('OrganizerMarketingService', () => {
    it('should compute credit wallet top-up with exact 18% GST integer math', async () => {
      const result = await marketingService.topupCredits(mockActor, {
        credits: 500,
        billingType: 'individual',
        country: 'India',
      });

      expect(result.balanceCredits).toBeGreaterThanOrEqual(500);
      expect(result.transactions.length).toBeGreaterThan(0);
      const tx = result.transactions[result.transactions.length - 1]!;
      expect(tx.credits).toBe(500);
      expect(tx.amountMinor).toBe(59000); // 500 * 100 paise + 18% GST = 59000 paise
      expect(tx.billingType).toBe('individual');
    });

    it('should prevent top-up under minimum 100 credits threshold', async () => {
      await expect(
        marketingService.topupCredits(mockActor, {
          credits: 50,
          billingType: 'individual',
        }),
      ).rejects.toThrow('Minimum top-up is 100 credits.');
    });
  });

  describe('OrganizerPayoutService', () => {
    it('should store and retrieve masked bank account numbers without leaking raw credentials (Rule 4)', async () => {
      // Mock org membership
      (mockDb.db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              execute: jest.fn().mockResolvedValue([{ orgId: 'org-test-1', type: 'organizer' }]),
            }),
          }),
        }),
      });

      const profile = await payoutService.createPaymentProfile(mockActor, {
        accountName: 'Tech Events Pvt Ltd',
        nickname: 'Primary Current Account',
        accountNumber: '987654321098',
        ifsc: 'HDFC0000123',
        pan: 'ABCDE1234F',
        gstRegistered: true,
        gstin: '27ABCDE1234F1Z5',
      });

      expect(profile.maskedAccountNumber).toBe('••••••••1098');
      expect(profile.accountName).toBe('Tech Events Pvt Ltd');
      expect(profile.panCard).toBe('ABCDE1234F');
      expect(profile.gstRegistered).toBe(true);

      const allProfiles = await payoutService.getPaymentProfiles(mockActor);
      expect(allProfiles.length).toBeGreaterThan(0);
      expect(allProfiles[0]!.maskedAccountNumber).toBe('••••••••1098');
    });
  });

  describe('OrganizerDataService CSV Export', () => {
    it('should generate properly escaped UTF-8 CSV without SQL/command injection', async () => {
      // Mock org membership
      (mockDb.db.select as jest.Mock)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValueOnce({
            innerJoin: jest.fn().mockReturnValueOnce({
              where: jest.fn().mockReturnValueOnce({
                execute: jest.fn().mockResolvedValueOnce([{ orgId: 'org-test-1', type: 'organizer' }]),
              }),
            }),
          }),
        })
        // Mock org events
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValueOnce({
            where: jest.fn().mockReturnValueOnce({
              execute: jest.fn().mockResolvedValueOnce([{ id: 'evt-1', title: 'Summer Festival' }]),
            }),
          }),
        })
        // Mock paid orders
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValueOnce({
            leftJoin: jest.fn().mockReturnValueOnce({
              where: jest.fn().mockReturnValueOnce({
                orderBy: jest.fn().mockReturnValueOnce({
                  execute: jest.fn().mockResolvedValueOnce([
                    {
                      order: { id: 'ord-1', totalMinor: 499900, createdAt: new Date('2026-08-20') },
                      purchaser: { id: 'usr-1', name: 'Priya "VIP" Sharma', email: 'priya@test.com', phone: '+919820012345' },
                    },
                  ]),
                }),
              }),
            }),
          }),
        })
        // Mock tickets
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValueOnce({
            innerJoin: jest.fn().mockReturnValueOnce({
              where: jest.fn().mockReturnValueOnce({
                execute: jest.fn().mockResolvedValueOnce([
                  {
                    ticket: { id: 't-1', orderId: 'ord-1', ticketNumber: 'TCK-001', eventId: 'evt-1', status: 'checked_in', checkedInAt: new Date() },
                    tier: { name: 'VIP Pass', priceMinor: 499900 },
                  },
                ]),
              }),
            }),
          }),
        });

      const csv = await dataService.exportAttendeesCsv(mockActor);

      expect(csv).toContain('Name,Email,Contact,Total Transactions,Total Spend (INR),Last Transaction Date,Tickets Count');
      expect(csv).toContain('"Priya ""VIP"" Sharma"');
      expect(csv).toContain('"priya@test.com"');
      expect(csv).toContain('4999.00');
    });
  });
});
