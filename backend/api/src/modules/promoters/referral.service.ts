import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  promoterCampaigns,
  promoterProfiles,
  referralClicks,
  referralAttributions,
  orders,
  organizationMembers,
} from '../../database/schema/index';
import { AuditService } from '../../common/audit/audit.service';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger('ReferralService');

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * RECORD PUBLIC REFERRAL LINK CLICK (RATE LIMITED / ABUSE PROTECTED)
   */
  async recordReferralClick(code: string, sessionReference?: string): Promise<{ campaignId: string; code: string }> {
    const normalizedCode = code.trim().toUpperCase();

    const campaign = await this.db.db.query.promoterCampaigns.findFirst({
      where: and(
        eq(promoterCampaigns.code, normalizedCode),
        eq(promoterCampaigns.status, 'active'),
      ),
    });

    if (!campaign) {
      throw new NotFoundException({ code: 'REFERRAL_CODE_INVALID', message: 'Active referral code not found.' });
    }

    // Persist click event
    await this.db.db.insert(referralClicks).values({
      campaignId: campaign.id,
      sessionReference: sessionReference ? sessionReference.slice(0, 250) : null,
    });

    return { campaignId: campaign.id, code: normalizedCode };
  }

  /**
   * ATOMIC ORDER ATTRIBUTION ENGINE & SELF-REFERRAL PREVENTION
   * Enforces 1:1 attribution per order via database `UNIQUE(order_id)` constraint.
   */
  async attributeOrder(
    purchaserUserId: string,
    orderId: string,
    referralCode: string,
  ): Promise<{ attributionId: string; campaignId: string }> {
    const normalizedCode = referralCode.trim().toUpperCase();

    // 1. Fetch order & verify purchaser ownership
    const order = await this.db.db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });

    if (order.userId !== purchaserUserId) {
      throw new ForbiddenException({
        code: 'ATTRIBUTION_USER_MISMATCH',
        message: 'Cannot attribute an order belonging to another purchaser.',
      });
    }

    // 2. Pre-payment Window Check (Attribution is STRICTLY IMMUTABLE once PAID)
    if (!['created', 'payment_pending'].includes(order.status)) {
      throw new BadRequestException({
        code: 'ATTRIBUTION_WINDOW_EXPIRED',
        message: `Cannot attach or modify attribution for order in state '${order.status}'. Attribution is immutable post-payment.`,
      });
    }

    // 3. Existing Attribution Check
    const existingAttr = await this.db.db.query.referralAttributions.findFirst({
      where: eq(referralAttributions.orderId, orderId),
    });
    if (existingAttr) {
      throw new ConflictException({
        code: 'ORDER_ALREADY_ATTRIBUTED',
        message: 'Order has already been attributed to a promoter campaign and cannot be modified.',
      });
    }

    // 4. Fetch campaign
    const campaign = await this.db.db.query.promoterCampaigns.findFirst({
      where: and(
        eq(promoterCampaigns.eventId, order.eventId),
        eq(promoterCampaigns.code, normalizedCode),
        eq(promoterCampaigns.status, 'active'),
      ),
    });

    if (!campaign) {
      throw new NotFoundException({
        code: 'CAMPAIGN_NOT_FOUND',
        message: `No active promoter campaign found for code '${normalizedCode}' on this event.`,
      });
    }

    // 3. SELF-REFERRAL PREVENTION
    // Check if purchaser is a member of the promoter organization
    const profile = await this.db.db.query.promoterProfiles.findFirst({
      where: eq(promoterProfiles.id, campaign.promoterId),
    });

    if (profile) {
      const membership = await this.db.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, profile.organizationId),
          eq(organizationMembers.userId, purchaserUserId),
        ),
      });

      if (membership) {
        this.logger.warn(`[SELF-REFERRAL BLOCKED] Purchaser ${purchaserUserId} belongs to promoter org ${profile.organizationId}`);
        
        this.audit.log({
          actorUserId: purchaserUserId,
          action: 'security.self_referral_blocked',
          category: 'security',
          entityType: 'order',
          entityId: orderId,
          metadata: { campaignId: campaign.id, code: normalizedCode },
        });

        throw new BadRequestException({
          code: 'SELF_REFERRAL_PROHIBITED',
          message: 'Self-referral purchases using team/promoter codes are strictly prohibited.',
        });
      }
    }

    // 4. ATOMIC ATTRIBUTION INSERTION (UNIQUE order_id constraint)
    try {
      const [attr] = await this.db.db
        .insert(referralAttributions)
        .values({
          campaignId: campaign.id,
          orderId: order.id,
        })
        .returning();

      this.audit.log({
        actorUserId: purchaserUserId,
        action: 'referral.order_attributed',
        category: 'order',
        entityType: 'referral_attribution',
        entityId: attr!.id,
        metadata: { campaignId: campaign.id, orderId: order.id, code: normalizedCode },
      });

      return { attributionId: attr!.id, campaignId: campaign.id };
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException({
          code: 'ORDER_ALREADY_ATTRIBUTED',
          message: 'Order has already been attributed to a promoter campaign.',
        });
      }
      throw err;
    }
  }
}
