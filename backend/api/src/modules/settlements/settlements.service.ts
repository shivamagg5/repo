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
import { settlements, orders, commissionEntries, organizations, events } from '../../database/schema/index';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import type {
  AuthContext,
  GenerateSettlementInput,
  ReviewSettlementInput,
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
   * GENERATE SETTLEMENT (IDEMPOTENT & SERVER-AUTHORITATIVE)
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

    // 3. Unique Period Lock Check
    const scopeConflict = await db.query.settlements.findFirst({
      where: and(
        eq(settlements.organizationId, input.organizationId),
        eq(settlements.periodStart, periodStart),
        eq(settlements.periodEnd, periodEnd),
      ),
    });

    if (scopeConflict) {
      throw new ConflictException('A settlement for this organization and time period has already been generated.');
    }

    // 4. Calculate Net Settlement from Source Transaction Data
    // A. Gross Paid Orders
    const paidOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.status, 'paid'),
        gte(orders.createdAt, periodStart),
        lte(orders.createdAt, periodEnd),
      ),
    });

    let grossSalesMinor = 0;
    for (const o of paidOrders) {
      grossSalesMinor += o.totalMinor;
    }

    // B. Refunds
    const refundedOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.status, 'refunded'),
        gte(orders.createdAt, periodStart),
        lte(orders.createdAt, periodEnd),
      ),
    });

    let refundsMinor = 0;
    for (const r of refundedOrders) {
      refundsMinor += r.totalMinor;
    }

    // C. Platform Commission (10% platform fee rule in minor units)
    const platformCommissionMinor = Math.round((grossSalesMinor - refundsMinor) * 0.1);

    // D. Promoter Commission
    const commEntries = await db.query.commissionEntries.findMany({
      where: and(
        gte(commissionEntries.createdAt, periodStart),
        lte(commissionEntries.createdAt, periodEnd),
      ),
    });

    let promoterCommissionMinor = 0;
    for (const c of commEntries) {
      promoterCommissionMinor += c.amountMinor;
    }

    // E. Tax (18% GST on platform fee in minor units)
    const taxMinor = Math.round(platformCommissionMinor * 0.18);

    // Net Settlement Formula: Gross - Refunds - PlatformCommission - PromoterCommission - Tax
    const netSettlementMinor = Math.max(
      0,
      grossSalesMinor - refundsMinor - platformCommissionMinor - promoterCommissionMinor - taxMinor,
    );

    // 5. Insert Settlement Record
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

    // 6. Post Settlement Financial Journal Entry
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
        netSettlementMinor,
        idempotencyKey: input.idempotencyKey,
      },
    });

    return this.mapSettlementDto(settlement!);
  }

  /**
   * REVIEW SETTLEMENT (WITH SEGREGATION OF DUTIES ENFORCEMENT)
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
    const targetStatus = input.action === 'approve' ? 'approved' : 'failed';

    this.stateMachine.assertTransition(currentStatus, targetStatus);

    await db
      .update(settlements)
      .set({
        status: targetStatus,
        approvedBy: actor.userId,
        approvedAt: new Date(),
        rejectionReason: input.action === 'reject' ? (input.reason ?? 'Rejected by finance admin') : null,
      })
      .where(eq(settlements.id, settlementId));

    const updated = await db.query.settlements.findFirst({
      where: eq(settlements.id, settlementId),
    });

    const resultDto = this.mapSettlementDto({
      ...(updated ?? settlement),
      status: targetStatus,
      approvedBy: actor.userId,
      approvedAt: new Date(),
    });

    this.auditService.log({
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
   * Generate Financial Statement DTO for Organization
   */
  async getOrganizerStatement(organizationId: string, periodStartStr: string, periodEndStr: string): Promise<FinancialStatementDto> {
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
      createdAt: s.createdAt.toISOString(),
    };
  }
}
