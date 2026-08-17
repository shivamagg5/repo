import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  orders,
  paymentTransactions,
  reconciliationRuns,
  reconciliationExceptions,
} from '../../database/schema/index';
import { eq, gte, lte, and } from 'drizzle-orm';
import type { ReconciliationRunDto, ReconciliationExceptionDto } from '@platform/types';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Run Daily Financial Reconciliation
   */
  async runReconciliation(dateStr?: string): Promise<ReconciliationRunDto> {
    const db = this.databaseService.db;
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    // 1. Fetch paid orders for target date
    const paidOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.status, 'paid'),
        gte(orders.createdAt, dayStart),
        lte(orders.createdAt, dayEnd),
      ),
      with: {
        payments: true,
      },
    });

    let matchedCount = 0;
    let mismatchedCount = 0;
    const exceptionsToInsert: any[] = [];

    // 2. Compare orders vs payment transactions
    for (const order of paidOrders) {
      const ptx = (order as any).payments?.[0];
      if (!ptx) {
        mismatchedCount++;
        exceptionsToInsert.push({
          internalReference: order.id,
          providerReference: null,
          expectedAmountMinor: order.totalMinor,
          actualAmountMinor: 0,
          currency: order.currency,
          differenceMinor: order.totalMinor,
          mismatchType: 'MISSING_PAYMENT_TRANSACTION',
          status: 'open',
          detectedAt: new Date(),
        });
      } else if (Number(ptx.amountMinor) !== order.totalMinor) {
        mismatchedCount++;
        const diff = Math.abs(Number(ptx.amountMinor) - order.totalMinor);
        exceptionsToInsert.push({
          internalReference: order.id,
          providerReference: ptx.providerPaymentId ?? ptx.id,
          expectedAmountMinor: order.totalMinor,
          actualAmountMinor: Number(ptx.amountMinor),
          currency: order.currency,
          differenceMinor: diff,
          mismatchType: 'AMOUNT_MISMATCH',
          status: 'open',
          detectedAt: new Date(),
        });
      } else {
        matchedCount++;
      }
    }

    const runStatus = mismatchedCount > 0 ? 'exceptions_flagged' : 'clean';

    // 3. Save Reconciliation Run Record
    const [run] = await db
      .insert(reconciliationRuns)
      .values({
        reconciliationDate: dayStart,
        totalOrdersCount: paidOrders.length,
        totalMatchedCount: matchedCount,
        totalMismatchedCount: mismatchedCount,
        status: runStatus,
      })
      .returning();

    // 4. Save Reconciliation Exception Records
    const savedExceptions: any[] = [];
    if (exceptionsToInsert.length > 0) {
      const rows = exceptionsToInsert.map((e) => ({
        ...e,
        reconciliationRunId: run!.id,
      }));

      const inserted = await db.insert(reconciliationExceptions).values(rows).returning();
      savedExceptions.push(...inserted);
    }

    this.auditService.log({
      actorUserId: null,
      action: 'finance.reconciliation_completed',
      category: 'admin',
      entityType: 'reconciliation_run',
      entityId: run!.id,
      metadata: {
        totalOrdersCount: paidOrders.length,
        matchedCount,
        mismatchedCount,
        status: runStatus,
      },
    });

    const exceptionsDto: ReconciliationExceptionDto[] = savedExceptions.map((ex) => ({
      id: ex.id,
      reconciliationRunId: ex.reconciliationRunId,
      internalReference: ex.internalReference,
      providerReference: ex.providerReference,
      expectedAmountMinor: Number(ex.expectedAmountMinor),
      actualAmountMinor: Number(ex.actualAmountMinor),
      currency: ex.currency,
      differenceMinor: Number(ex.differenceMinor),
      mismatchType: ex.mismatchType,
      status: ex.status,
      detectedAt: ex.detectedAt ? new Date(ex.detectedAt).toISOString() : new Date().toISOString(),
      resolvedAt: ex.resolvedAt ? new Date(ex.resolvedAt).toISOString() : null,
      resolvedBy: ex.resolvedBy,
    }));

    return {
      id: run!.id,
      reconciliationDate: dayStart.toISOString(),
      totalOrdersCount: paidOrders.length,
      totalMatchedCount: matchedCount,
      totalMismatchedCount: mismatchedCount,
      status: runStatus,
      createdAt: run!.createdAt.toISOString(),
      exceptions: exceptionsDto,
    };
  }
}
