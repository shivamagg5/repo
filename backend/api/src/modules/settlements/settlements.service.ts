import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';
import { SettlementStateMachineService } from './settlement-state-machine.service';
import { LedgerService } from '../finance/ledger.service';
import {
  settlements,
  orders,
  commissionEntries,
  organizations,
  events,
  paymentProfiles,
} from '../../database/schema/index';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import type {
  AuthContext,
  GenerateSettlementInput,
  ReviewSettlementInput,
  DisburseSettlementInput,
  SettlementDto,
  FinancialStatementDto,
} from '@platform/types';

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly stateMachine: SettlementStateMachineService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * GENERATE SETTLEMENT (IDEMPOTENT, SERVER-AUTHORITATIVE & STRICTLY SCOPED)
   */
  async generateSettlement(input: GenerateSettlementInput, actor: AuthContext): Promise<SettlementDto> {
    const db = this.databaseService.db;
    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(input.periodEnd);

    // 1. Idempotency Check by idempotencyKey
    const existing = await db.query.settlements.findFirst({
      where: eq(settlements.idempotencyKey, input.idempotencyKey),
    });

    if (existing) {
      return this.mapSettlementDto(existing);
    }

    // 2. Organization Check
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, input.organizationId),
    });

    if (!org) {
      throw new NotFoundException(`Organization ${input.organizationId} not found`);
    }

    // 3. Resolve Scoped Event IDs
    let eventIds: string[] = [];
    if (input.eventId) {
      const eventRecord = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      });
      if (!eventRecord) {
        throw new NotFoundException(`Event ${input.eventId} not found`);
      }
      if (eventRecord.organizerOrganizationId !== input.organizationId) {
        throw new BadRequestException('Event does not belong to specified organization');
      }
      eventIds = [input.eventId];
    } else {
      const orgEvents = await db.query.events.findMany({
        where: eq(events.organizerOrganizationId, input.organizationId),
        columns: { id: true },
      });
      eventIds = orgEvents.map((e) => e.id);
    }

    // 4. Unique Period Lock Check
    const scopeConflict = await db.query.settlements.findFirst({
      where: and(
        eq(settlements.organizationId, input.organizationId),
        input.eventId ? eq(settlements.eventId, input.eventId) : sql`${settlements.eventId} IS NULL`,
        eq(settlements.periodStart, periodStart),
        eq(settlements.periodEnd, periodEnd),
      ),
    });

    if (scopeConflict) {
      throw new ConflictException('A settlement for this organization, event, and time period has already been generated.');
    }

    // 5. Calculate Net Settlement from Scoped Transaction Data
    let grossSalesMinor = 0;
    let refundsMinor = 0;
    let paidOrders: (typeof orders.$inferSelect)[] = [];

    if (eventIds.length > 0) {
      // A. Gross Paid Orders
      paidOrders = await db.query.orders.findMany({
        where: and(
          inArray(orders.eventId, eventIds),
          eq(orders.status, 'paid'),
          gte(orders.createdAt, periodStart),
          lte(orders.createdAt, periodEnd),
        ),
      });

      for (const o of paidOrders) {
        grossSalesMinor += Number(o.totalMinor);
      }

      // B. Refunds
      const refundedOrders = await db.query.orders.findMany({
        where: and(
          inArray(orders.eventId, eventIds),
          eq(orders.status, 'refunded'),
          gte(orders.createdAt, periodStart),
          lte(orders.createdAt, periodEnd),
        ),
      });

      for (const r of refundedOrders) {
        refundsMinor += Number(r.totalMinor);
      }
    }

    // C. Platform Commission (Use custom commission rate if defined on organization, else 10% / 1000 bps)
    const netBase = Math.max(0, grossSalesMinor - refundsMinor);
    const bps = org.customCommissionRateBps !== null && org.customCommissionRateBps !== undefined
      ? org.customCommissionRateBps
      : 1000;
    const platformCommissionMinor = Math.round((netBase * bps) / 10000);

    // D. Promoter Commission for scoped orders
    let promoterCommissionMinor = 0;
    const paidOrderIds = paidOrders.map((o) => o.id);
    if (paidOrderIds.length > 0) {
      const commEntries = await db.query.commissionEntries.findMany({
        where: and(
          inArray(commissionEntries.orderId, paidOrderIds),
          gte(commissionEntries.createdAt, periodStart),
          lte(commissionEntries.createdAt, periodEnd),
        ),
      });

      for (const c of commEntries) {
        promoterCommissionMinor += Number(c.amountMinor);
      }
    }

    // E. Tax (18% GST on platform commission)
    const taxMinor = Math.round(platformCommissionMinor * 0.18);

    // Net Settlement Formula: Gross - Refunds - PlatformCommission - PromoterCommission - Tax
    const netSettlementMinor = Math.max(
      0,
      grossSalesMinor - refundsMinor - platformCommissionMinor - promoterCommissionMinor - taxMinor,
    );

    // 6. Insert Settlement Record
    const [settlement] = await db
      .insert(settlements)
      .values({
        organizationId: input.organizationId,
        eventId: input.eventId ?? undefined,
        grossSalesMinor,
        refundsMinor,
        platformCommissionMinor,
        promoterCommissionMinor,
        taxMinor,
        netSettlementMinor,
        status: 'pending_review',
        periodStart,
        periodEnd,
        idempotencyKey: input.idempotencyKey,
        preparedBy: actor.userId,
        preparedAt: new Date(),
      })
      .returning();

    // 7. Post Settlement Financial Journal Entry
    await this.ledgerService.postJournal({
      transactionType: 'settlement_generated',
      referenceType: 'settlement',
      referenceId: settlement!.id,
      lines: [
        { account: 'organizer_payable', debitMinor: netSettlementMinor, creditMinor: 0 },
        { account: 'platform_cash', debitMinor: 0, creditMinor: netSettlementMinor },
      ],
    });

    this.auditService.log({
      actorUserId: actor.userId,
      action: 'settlement.generated',
      category: 'admin',
      entityType: 'settlement',
      entityId: settlement!.id,
      metadata: {
        organizationId: input.organizationId,
        eventId: input.eventId ?? null,
        netSettlementMinor,
        idempotencyKey: input.idempotencyKey,
      },
    });

    return this.mapSettlementDto(settlement!);
  }

  /**
   * REVIEW SETTLEMENT (WITH SEGREGATION OF DUTIES ENFORCEMENT & STRICT TRANSITIONS)
   */
  async reviewSettlement(settlementId: string, input: ReviewSettlementInput, actor: AuthContext): Promise<SettlementDto> {
    const db = this.databaseService.db;
    const settlement = await db.query.settlements.findFirst({
      where: eq(settlements.id, settlementId),
    });

    if (!settlement) {
      throw new NotFoundException(`Settlement ${settlementId} not found`);
    }

    // SEGREGATION OF DUTIES RULE: Preparer cannot approve their own settlement
    if (input.action === 'approve' && settlement.preparedBy === actor.userId) {
      throw new ForbiddenException({
        code: 'SEGREGATION_OF_DUTIES_VIOLATION',
        message: 'Segregation of duties rule: The administrator who prepared the settlement cannot approve it.',
      });
    }

    const currentStatus = settlement.status as any;
    let targetStatus: 'approved' | 'rejected' | 'on_hold';
    if (input.action === 'approve') {
      targetStatus = 'approved';
    } else if (input.action === 'hold') {
      targetStatus = 'on_hold';
    } else {
      targetStatus = 'rejected';
    }

    this.stateMachine.assertTransition(currentStatus, targetStatus);

    await db
      .update(settlements)
      .set({
        status: targetStatus,
        approvedBy: input.action === 'approve' ? actor.userId : settlement.approvedBy,
        approvedAt: input.action === 'approve' ? new Date() : settlement.approvedAt,
        rejectionReason: (input.action === 'reject' || input.action === 'hold')
          ? (input.reason ?? `Settlement marked as ${targetStatus}`)
          : null,
      })
      .where(eq(settlements.id, settlementId));

    const resultDto = this.mapSettlementDto({
      ...settlement,
      ...(await db.query.settlements.findFirst({ where: eq(settlements.id, settlementId) }) ?? {}),
      status: targetStatus,
      approvedBy: input.action === 'approve' ? actor.userId : settlement.approvedBy,
      approvedAt: input.action === 'approve' ? new Date() : settlement.approvedAt,
    } as any);

    await this.auditService.log({
      actorUserId: actor.userId,
      action: `settlement.${input.action}d`,
      category: 'admin',
      entityType: 'settlement',
      entityId: settlementId,
      metadata: {
        previousStatus: currentStatus,
        newStatus: targetStatus,
        reason: input.reason ?? null,
      },
    });

    return resultDto;
  }

  /**
   * DISBURSE SETTLEMENT (STRICT IDEMPOTENT MUTATION WITH ROW LOCK & PAYMENT PROFILE RESOLUTION)
   */
  async disburseSettlement(
    settlementId: string,
    input: DisburseSettlementInput,
    actor: AuthContext,
  ): Promise<SettlementDto> {
    const db = this.databaseService.db;

    return await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(settlements)
        .where(eq(settlements.id, settlementId))
        .for('update');

      if (!locked) {
        throw new NotFoundException(`Settlement ${settlementId} not found`);
      }

      // Idempotency: if already disbursed with this idempotency key, return existing
      if (locked.disbursedIdempotencyKey === input.idempotencyKey) {
        return this.mapSettlementDto(locked);
      }
      if (locked.disbursedIdempotencyKey && locked.disbursedIdempotencyKey !== input.idempotencyKey) {
        throw new ConflictException('Settlement has already been disbursed with a different idempotency key.');
      }

      const currentStatus = locked.status as any;
      // Enforce strict workflow: must be approved -> processing -> paid
      this.stateMachine.assertTransition(currentStatus, 'processing');
      this.stateMachine.assertTransition('processing', 'paid');

      // Fetch active verified payment profile for organization
      const profile =
        (await tx.query.paymentProfiles.findFirst({
          where: and(
            eq(paymentProfiles.organizationId, locked.organizationId),
            eq(paymentProfiles.status, 'active'),
            eq(paymentProfiles.isDefault, true),
          ),
        })) ??
        (await tx.query.paymentProfiles.findFirst({
          where: and(
            eq(paymentProfiles.organizationId, locked.organizationId),
            eq(paymentProfiles.status, 'active'),
          ),
        }));

      if (!profile) {
        throw new BadRequestException(
          'Organization does not have an active verified bank payment profile for disbursement.',
        );
      }

      const now = new Date();
      const [updated] = await tx
        .update(settlements)
        .set({
          status: 'paid',
          paymentProfileId: profile.id,
          maskedAccountNumber: profile.maskedAccountNumber,
          ifsc: profile.ifsc,
          transactionReference: input.transactionReference,
          paidAt: now,
          disbursedBy: actor.userId,
          disbursedIdempotencyKey: input.idempotencyKey,
        })
        .where(eq(settlements.id, settlementId))
        .returning();

      // Post Settlement Disbursed Journal Entry
      await this.ledgerService.postJournal({
        transactionType: 'settlement_disbursed',
        referenceType: 'settlement',
        referenceId: settlementId,
        lines: [
          { account: 'organizer_payable', debitMinor: Number(locked.netSettlementMinor), creditMinor: 0 },
          { account: 'platform_cash', debitMinor: 0, creditMinor: Number(locked.netSettlementMinor) },
        ],
      });

      this.auditService.log({
        actorUserId: actor.userId,
        action: 'settlement.disbursed',
        category: 'admin',
        entityType: 'settlement',
        entityId: settlementId,
        metadata: {
          transactionReference: input.transactionReference,
          netSettlementMinor: Number(locked.netSettlementMinor),
          paymentProfileId: profile.id,
          disbursedIdempotencyKey: input.idempotencyKey,
        },
      });

      return this.mapSettlementDto(updated!);
    });
  }

  /**
   * Generate Financial Statement DTO for Organization
   */
  async getOrganizerStatement(
    organizationId: string,
    periodStartStr: string,
    periodEndStr: string,
  ): Promise<FinancialStatementDto> {
    const db = this.databaseService.db;
    const periodStart = new Date(periodStartStr);
    const periodEnd = new Date(periodEndStr);

    const list = await db.query.settlements.findMany({
      where: and(
        eq(settlements.organizationId, organizationId),
        gte(settlements.periodStart, periodStart),
        lte(settlements.periodEnd, periodEnd),
      ),
    });

    let totalGrossSalesMinor = 0;
    let totalRefundsMinor = 0;
    let totalPlatformCommissionMinor = 0;
    let totalPromoterCommissionMinor = 0;
    let totalTaxMinor = 0;
    let netPayableMinor = 0;

    for (const s of list) {
      totalGrossSalesMinor += Number(s.grossSalesMinor);
      totalRefundsMinor += Number(s.refundsMinor);
      totalPlatformCommissionMinor += Number(s.platformCommissionMinor);
      totalPromoterCommissionMinor += Number(s.promoterCommissionMinor);
      totalTaxMinor += Number(s.taxMinor);
      netPayableMinor += Number(s.netSettlementMinor);
    }

    return {
      organizationId,
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
      currency: 'INR',
      totalGrossSalesMinor,
      totalRefundsMinor,
      totalPlatformCommissionMinor,
      totalPromoterCommissionMinor,
      totalTaxMinor,
      netPayableMinor,
      settlements: list.map((s) => this.mapSettlementDto(s)),
    };
  }

  private mapSettlementDto(s: typeof settlements.$inferSelect): SettlementDto {
    return {
      id: s.id,
      organizationId: s.organizationId,
      eventId: s.eventId,
      grossSalesMinor: Number(s.grossSalesMinor),
      refundsMinor: Number(s.refundsMinor),
      platformCommissionMinor: Number(s.platformCommissionMinor),
      promoterCommissionMinor: Number(s.promoterCommissionMinor),
      taxMinor: Number(s.taxMinor),
      netSettlementMinor: Number(s.netSettlementMinor),
      status: s.status as any,
      periodStart: s.periodStart.toISOString(),
      periodEnd: s.periodEnd.toISOString(),
      idempotencyKey: s.idempotencyKey,
      preparedBy: s.preparedBy,
      preparedAt: s.preparedAt.toISOString(),
      approvedBy: s.approvedBy,
      approvedAt: s.approvedAt ? s.approvedAt.toISOString() : null,
      rejectionReason: s.rejectionReason,
      paymentProfileId: s.paymentProfileId,
      maskedAccountNumber: s.maskedAccountNumber,
      ifsc: s.ifsc,
      transactionReference: s.transactionReference,
      paidAt: s.paidAt ? s.paidAt.toISOString() : null,
      disbursedBy: s.disbursedBy,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
