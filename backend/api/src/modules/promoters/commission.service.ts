import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  commissionEntries,
  referralAttributions,
  promoterCampaigns,
  orders,
  orderItems,
} from '../../database/schema/index';
import { CommissionStateMachineService, CommissionStatus } from './promoter-state-machine.service';
import { AuditService } from '../../common/audit/audit.service';
import type { CommissionEntry } from '@platform/types';

@Injectable()
export class CommissionService {
  private readonly logger = new Logger('CommissionService');

  constructor(
    private readonly db: DatabaseService,
    private readonly stateMachine: CommissionStateMachineService,
    private readonly audit: AuditService,
  ) {}

  /**
   * ATOMIC COMMISSION CALCULATION & HISTORICAL SNAPSHOTTING
   * Integer minor units arithmetic only. Never uses floating-point calculations for money.
   */
  async calculateAndRecordCommission(tx: any, orderId: string): Promise<CommissionEntry | null> {
    // 1. Check if order has a referral attribution
    const attribution = await tx.query.referralAttributions.findFirst({
      where: eq(referralAttributions.orderId, orderId),
    });

    if (!attribution) return null; // Unattributed order

    // 2. IDEMPOTENCY CHECK: Check if commission entry already exists for orderId
    const existingEntry = await tx.query.commissionEntries.findFirst({
      where: eq(commissionEntries.orderId, orderId),
    });

    if (existingEntry) {
      this.logger.log(`[Commission] Commission entry already exists for order ${orderId}. Returning idempotent entry.`);
      return this.mapCommissionEntry(existingEntry);
    }

    // 3. Fetch Campaign & Order details
    const campaign = await tx.query.promoterCampaigns.findFirst({
      where: eq(promoterCampaigns.id, attribution.campaignId),
    });

    if (!campaign) throw new Error(`Campaign ${attribution.campaignId} not found for attribution.`);

    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) throw new Error(`Order ${orderId} not found.`);

    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .execute();

    let totalTicketQuantity = 0;
    for (const item of items) totalTicketQuantity += item.quantity;

    // 4. Server-Authoritative BigInt Integer Minor Unit Calculation
    const calculationBaseMinor = Number(order.subtotalMinor);
    const commValue = Number(campaign.commissionValue);
    let amountMinor = 0;

    if (campaign.commissionType === 'percentage') {
      // BigInt basis points integer arithmetic (1% = 100 basis points)
      const basisPoints = BigInt(Math.round(commValue * 100));
      const baseBigInt = BigInt(calculationBaseMinor);
      // Integer division rounding half-up: (base * basisPoints + 5000n) / 10000n
      const calcBigInt = (baseBigInt * basisPoints + 5000n) / 10000n;
      amountMinor = Number(calcBigInt);
    } else if (campaign.commissionType === 'fixed') {
      // Fixed amount calculation per ticket in integer minor units
      const fixedMinorBigInt = BigInt(Math.round(commValue));
      const qtyBigInt = BigInt(totalTicketQuantity);
      amountMinor = Number(fixedMinorBigInt * qtyBigInt);
    }

    if (amountMinor < 0) amountMinor = 0;

    // 5. HISTORICAL SNAPSHOT INSERTION
    const [entry] = await tx
      .insert(commissionEntries)
      .values({
        campaignId: campaign.id,
        orderId: order.id,
        commissionType: campaign.commissionType,
        commissionValue: String(campaign.commissionValue),
        calculationBaseMinor,
        ticketQuantity: totalTicketQuantity,
        amountMinor,
        currency: order.currency,
        status: 'pending',
      })
      .returning();

    this.audit.log({
      actorUserId: order.userId,
      action: 'commission.entry_created',
      category: 'order',
      entityType: 'commission_entry',
      entityId: entry!.id,
      metadata: { campaignId: campaign.id, orderId: order.id, amountMinor, commissionType: campaign.commissionType },
    });

    return this.mapCommissionEntry(entry!);
  }

  /**
   * REFUND & CANCELLATION ADJUSTMENT HANDLER
   * Reverses or cancels commission entries upon full or partial order refund.
   */
  async processRefundAdjustment(tx: any, orderId: string, refundedAmountMinor: number, isFullRefund = true): Promise<void> {
    const entry = await tx.query.commissionEntries.findFirst({
      where: eq(commissionEntries.orderId, orderId),
    });

    if (!entry) return; // No commission for this order

    const currentStatus = entry.status as CommissionStatus;

    if (isFullRefund) {
      if (currentStatus === 'paid') {
        // PAID COMMISSION REVERSAL: Paid entries transition to 'reversed'
        this.stateMachine.assertTransition(currentStatus, 'reversed');
        await tx
          .update(commissionEntries)
          .set({ status: 'reversed' })
          .where(eq(commissionEntries.id, entry.id));
      } else {
        // Pending/Approved entries transition to 'rejected'
        this.stateMachine.assertTransition(currentStatus, 'rejected');
        await tx
          .update(commissionEntries)
          .set({ status: 'rejected' })
          .where(eq(commissionEntries.id, entry.id));
      }
    } else {
      // PROPORTIONAL PARTIAL REFUND REVERSAL (Preserves original historical entry intact!)
      const originalBase = Number(entry.calculationBaseMinor ?? 0);
      const originalAmount = Number(entry.amountMinor ?? 0);

      if (originalBase > 0 && entry.commissionType === 'percentage') {
        const commValue = Number(entry.commissionValue ?? 0);
        // Calculate reversal amount in minor units
        const reversalAmountMinor = Math.round((refundedAmountMinor * commValue) / 100);

        if (reversalAmountMinor > 0) {
          // Insert explicit reversal entry record
          await tx.insert(commissionEntries).values({
            campaignId: entry.campaignId,
            orderId: entry.orderId,
            commissionType: entry.commissionType,
            commissionValue: entry.commissionValue,
            calculationBaseMinor: refundedAmountMinor,
            ticketQuantity: entry.ticketQuantity,
            amountMinor: -reversalAmountMinor, // Negative adjustment value
            currency: entry.currency,
            status: 'reversed',
          });
        }
      }
    }

    this.audit.log({
      actorUserId: null,
      action: 'commission.refund_adjusted',
      category: 'order',
      entityType: 'commission_entry',
      entityId: entry.id,
      metadata: { orderId, refundedAmountMinor, isFullRefund },
    });
  }

  private mapCommissionEntry(raw: typeof commissionEntries.$inferSelect): CommissionEntry {
    return {
      id: raw.id,
      campaignId: raw.campaignId,
      orderId: raw.orderId,
      commissionType: raw.commissionType ?? 'percentage',
      commissionValue: Number(raw.commissionValue ?? 0),
      calculationBaseMinor: Number(raw.calculationBaseMinor ?? 0),
      ticketQuantity: Number(raw.ticketQuantity ?? 1),
      amountMinor: Number(raw.amountMinor),
      currency: raw.currency,
      status: raw.status as any,
      createdAt: raw.createdAt.toISOString(),
    };
  }
}
