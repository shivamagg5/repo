import { Test, TestingModule } from '@nestjs/testing';
import { VenuesService } from './venues.service';
import { DatabaseService } from '../../database/database.service';
import { RbacService } from '../auth/rbac.service';
import { AuditService } from '../../common/audit/audit.service';
import { createVenueSectionSchema, createPatronBlacklistSchema } from '@platform/validation';

describe('Venues Nightlife & Security Operations', () => {
  let venuesService: VenuesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenuesService,
        { provide: DatabaseService, useValue: { db: {} } },
        { provide: RbacService, useValue: { assertOrgMembership: jest.fn(), assertPermissionInOrg: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    venuesService = module.get<VenuesService>(VenuesService);
  });

  describe('Venue Sections & Capacity Zones', () => {
    it('Creates and retrieves venue section zones', async () => {
      const section = await venuesService.createSection('usr-admin-01', {
        venueId: 'ven-club-01',
        name: 'VIP Poolside Cabanas',
        code: 'VIP_POOL',
        capacity: 80,
      });

      expect(section).toBeDefined();
      expect(section.name).toBe('VIP Poolside Cabanas');
      expect(section.capacity).toBe(80);
      expect(section.status).toBe('open');

      const allSections = await venuesService.getSections('ven-club-01');
      expect(allSections.some((s) => s.name === 'VIP Poolside Cabanas')).toBe(true);
    });

    it('Validates section creation schema strictly', () => {
      const valid = createVenueSectionSchema.safeParse({
        venueId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Main Stage Deck',
        code: 'STAGE_DECK',
        capacity: 500,
      });
      expect(valid.success).toBe(true);

      const invalid = createVenueSectionSchema.safeParse({
        venueId: 'invalid-uuid',
        name: 'M',
        code: '',
        capacity: -10,
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Patron Incidents & Blacklist Guard', () => {
    it('Adds patron to blacklist and identifies blacklisted patron', async () => {
      const blacklisted = await venuesService.addPatronToBlacklist('usr-admin-01', {
        venueId: 'ven-club-01',
        patronName: 'Vikram Malhotra',
        patronPhone: '+919811223344',
        reason: 'Physical altercation in VIP section',
        severity: 'banned',
      });

      expect(blacklisted).toBeDefined();
      expect(blacklisted.patronName).toBe('Vikram Malhotra');
      expect(blacklisted.severity).toBe('banned');

      // Check query
      const checkResult = await venuesService.checkPatronBlacklist('ven-club-01', 'Vikram Malhotra');
      expect(checkResult.blacklisted).toBe(true);
      expect(checkResult.record?.reason).toContain('Physical altercation');

      const unflaggedCheck = await venuesService.checkPatronBlacklist('ven-club-01', 'Clean Patron');
      expect(unflaggedCheck.blacklisted).toBe(false);
    });

    it('Validates blacklist schema correctly', () => {
      const valid = createPatronBlacklistSchema.safeParse({
        venueId: '123e4567-e89b-12d3-a456-426614174000',
        patronName: 'Troublemaker Name',
        patronPhone: '+919988776655',
        reason: 'Attempted gate breach with forged wristband',
        severity: 'banned',
      });
      expect(valid.success).toBe(true);
    });
  });
});
