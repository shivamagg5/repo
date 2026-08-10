import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  promoterProfiles,
  promoterCampaigns,
  referralClicks,
  referralAttributions,
  commissionEntries,
  events,
  organizations,
  organizationMembers,
  orders,
} from '../../database/schema/index';
import { RbacService } from '../auth/rbac.service';
import { AuditService } from '../../common/audit/audit.service';
import type {
  AuthContext,
  CreatePromoterCampaignInput,
  PromoterCampaign,
  PromoterCampaignPerformanceDto,
  PromoterEarningsSummaryDto,
} from '@platform/types';

@Injectable()
export class PromotersService {
  private readonly logger = new Logger('PromotersService');

  constructor(
    private readonly db: DatabaseService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Helper to ensure active promoter profile for an organization.
   */
  async getOrCreatePromoterProfile(organizationId: string): Promise<typeof promoterProfiles.$inferSelect> {
    const existing = await this.db.db.query.promoterProfiles.findFirst({
      where: eq(promoterProfiles.organizationId, organizationId),
    });

    if (existing) return existing;

    const [created] = await this.db.db
      .insert(promoterProfiles)
      .values({ organizationId, status: 'active' })
      .returning();

    return created!;
  }

  /**
   * Helper to resolve the user's promoter organization ID.
   */
  async getUserPromoterOrgId(userId: string): Promise<string> {
    const memberships = await this.db.db
      .select({ orgId: organizationMembers.organizationId, type: organizations.type })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(and(eq(organizationMembers.userId, userId), eq(organizations.type, 'promoter')))
      .execute();

    if (memberships.length === 0) {
      throw new ForbiddenException({
        code: 'PROMOTER_ORG_REQUIRED',
        message: 'User must belong to a promoter organization to access promoter tools.',
      });
    }

    return memberships[0]!.orgId;
  }

  /**
   * CREATE PROMOTER CAMPAIGN (CODE NORMALIZATION & EVENT VALIDATION)
   */
  async createCampaign(
    actor: AuthContext,
    input: CreatePromoterCampaignInput,
  ): Promise<PromoterCampaign> {
    // 1. Verify organization type and membership
    const orgId = await this.getUserPromoterOrgId(actor.userId);

    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'promoter.create_campaign');

    const profile = await this.getOrCreatePromoterProfile(orgId);

    // 2. Validate Event Existence & State
    const event = await this.db.db.query.events.findFirst({
      where: eq(events.id, input.eventId),
    });

    if (!event) {
      throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Target event not found.' });
    }

    if (['cancelled', 'rejected', 'suspended'].includes(event.status)) {
      throw new BadRequestException({
        code: 'EVENT_INELIGIBLE',
        message: `Cannot create promoter campaign for event in status '${event.status}'.`,
      });
    }

    // 3. Referral Code Normalization (UPPERCASE & TRIM)
    const normalizedCode = input.code.trim().toUpperCase();

    if (input.commissionValue <= 0) {
      throw new BadRequestException({ code: 'INVALID_COMMISSION', message: 'Commission value must be positive.' });
    }

    // 4. Insert Campaign with DB Unique Constraint Protection
    try {
      const [campaign] = await this.db.db
        .insert(promoterCampaigns)
        .values({
          promoterId: profile.id,
          eventId: input.eventId,
          code: normalizedCode,
          commissionType: input.commissionType,
          commissionValue: String(input.commissionValue),
          status: 'active',
        })
        .returning();

      this.audit.log({
        actorUserId: actor.userId,
        action: 'promoter.campaign_created',
        category: 'organization',
        entityType: 'promoter_campaign',
        entityId: campaign!.id,
        metadata: { code: normalizedCode, eventId: input.eventId, commissionType: input.commissionType, commissionValue: input.commissionValue },
      });

      return {
        id: campaign!.id,
        promoterId: campaign!.promoterId,
        eventId: campaign!.eventId,
        code: campaign!.code,
        commissionType: campaign!.commissionType,
        commissionValue: Number(campaign!.commissionValue),
        status: campaign!.status,
      };
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException({
          code: 'CAMPAIGN_CODE_EXISTS',
          message: `Referral code '${normalizedCode}' already exists for this event.`,
        });
      }
      throw err;
    }
  }

  /**
   * FIND CAMPAIGNS FOR PROMOTER ORGANISATION
   */
  async findPromoterCampaigns(actor: AuthContext): Promise<PromoterCampaign[]> {
    const orgId = await this.getUserPromoterOrgId(actor.userId);
    const profile = await this.getOrCreatePromoterProfile(orgId);

    const list = await this.db.db
      .select()
      .from(promoterCampaigns)
      .where(eq(promoterCampaigns.promoterId, profile.id))
      .execute();

    return list.map((c) => ({
      id: c.id,
      promoterId: c.promoterId,
      eventId: c.eventId,
      code: c.code,
      commissionType: c.commissionType,
      commissionValue: Number(c.commissionValue),
      status: c.status,
    }));
  }

  /**
   * GET CAMPAIGN PERFORMANCE METRICS (CROSS-PROMOTER ISOLATED)
   */
  async getCampaignPerformance(actor: AuthContext, campaignId: string): Promise<PromoterCampaignPerformanceDto> {
    const orgId = await this.getUserPromoterOrgId(actor.userId);
    const profile = await this.getOrCreatePromoterProfile(orgId);

    const campaign = await this.db.db.query.promoterCampaigns.findFirst({
      where: eq(promoterCampaigns.id, campaignId),
    });

    if (!campaign) throw new NotFoundException({ code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found.' });

    // CROSS-PROMOTER ACCESS ISOLATION CHECK
    if (campaign.promoterId !== profile.id) {
      throw new ForbiddenException({ code: 'CAMPAIGN_ACCESS_DENIED', message: 'Cannot access performance for another promoter campaign.' });
    }

    const event = await this.db.db.query.events.findFirst({ where: eq(events.id, campaign.eventId) });

    // Aggregates
    const [clicksCount] = await this.db.db
      .select({ count: sql<number>`count(*)` })
      .from(referralClicks)
      .where(eq(referralClicks.campaignId, campaign.id));

    const [attributionsCount] = await this.db.db
      .select({ count: sql<number>`count(*)` })
      .from(referralAttributions)
      .where(eq(referralAttributions.campaignId, campaign.id));

    const commissions = await this.db.db
      .select()
      .from(commissionEntries)
      .where(eq(commissionEntries.campaignId, campaign.id))
      .execute();

    let totalEarnedMinor = 0;
    let totalRevenueMinor = 0;
    let totalTickets = 0;

    for (const c of commissions) {
      if (['pending', 'approved', 'paid'].includes(c.status)) {
        totalEarnedMinor += Number(c.amountMinor);
        totalRevenueMinor += Number(c.calculationBaseMinor ?? 0);
        totalTickets += Number(c.ticketQuantity ?? 0);
      }
    }

    return {
      campaignId: campaign.id,
      code: campaign.code,
      eventId: campaign.eventId,
      eventTitle: event?.title ?? 'Event',
      totalClicks: Number(clicksCount?.count ?? 0),
      totalAttributedOrders: Number(attributionsCount?.count ?? 0),
      totalTicketsSold: totalTickets,
      totalRevenueGeneratedMinor: totalRevenueMinor,
      totalCommissionEarnedMinor: totalEarnedMinor,
    };
  }

  /**
   * GET PROMOTER EARNINGS SUMMARY
   */
  async getEarningsSummary(actor: AuthContext): Promise<PromoterEarningsSummaryDto> {
    const orgId = await this.getUserPromoterOrgId(actor.userId);
    const profile = await this.getOrCreatePromoterProfile(orgId);

    const campaigns = await this.db.db
      .select()
      .from(promoterCampaigns)
      .where(eq(promoterCampaigns.promoterId, profile.id))
      .execute();

    let pendingMinor = 0;
    let approvedMinor = 0;
    let paidMinor = 0;
    let reversedMinor = 0;

    for (const camp of campaigns) {
      const entries = await this.db.db
        .select()
        .from(commissionEntries)
        .where(eq(commissionEntries.campaignId, camp.id))
        .execute();

      for (const entry of entries) {
        const amt = Number(entry.amountMinor);
        if (entry.status === 'pending') pendingMinor += amt;
        else if (entry.status === 'approved') approvedMinor += amt;
        else if (entry.status === 'paid') paidMinor += amt;
        else if (entry.status === 'reversed') reversedMinor += amt;
      }
    }

    return {
      promoterId: profile.id,
      organizationId: orgId,
      pendingCommissionMinor: pendingMinor,
      approvedCommissionMinor: approvedMinor,
      paidCommissionMinor: paidMinor,
      reversedCommissionMinor: reversedMinor,
      currency: 'INR',
    };
  }
}
