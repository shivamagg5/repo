import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';
import { financialTransactions, ledgerEntries } from '../../database/schema/index';
import { eq, desc, and, lt } from 'drizzle-orm';
import type { CanonicalAccount } from '@platform/types';

export const VALID_CANONICAL_ACCOUNTS: CanonicalAccount[] = [
  'platform_cash',
  'payment_clearing',
  'organizer_payable',
  'promoter_payable',
  'platform_revenue',
  'tax_payable',
  'refund_payable',
];

export interface JournalLineInput {
  account: CanonicalAccount;
  debitMinor: number;
  creditMinor: number;
}

export interface PostJournalInput {
  transactionType: string;
  referenceType: string;
  referenceId: string;
  currency?: string;
  lines: JournalLineInput[];
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Post a balanced journal transaction + ledger entries.
   * INVARIANT: sum(debitMinor) === sum(creditMinor)
   */
  async postJournal(input: PostJournalInput, dbTx?: any) {
    const db = dbTx ?? this.databaseService.db;
    const currency = input.currency ?? 'INR';

    // 1. Validate accounts against Canonical Chart of Accounts
    for (const line of input.lines) {
      if (!VALID_CANONICAL_ACCOUNTS.includes(line.account)) {
        throw new BadRequestException(`Invalid account "${line.account}" in financial posting`);
      }
    }

    // 2. Validate Journal Balancing Invariant (SUM debits === SUM credits)
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of input.lines) {
      totalDebit += line.debitMinor;
      totalCredit += line.creditMinor;
    }

    if (totalDebit !== totalCredit) {
      throw new BadRequestException(
        `Unbalanced financial journal transaction! Total Debits (${totalDebit}) !== Total Credits (${totalCredit})`,
      );
    }

    const transactionNumber = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 3. Create Financial Transaction Header
    const [header] = await db
      .insert(financialTransactions)
      .values({
        transactionNumber,
        transactionType: input.transactionType,
        status: 'posted',
        currency,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      })
      .returning();

    // 4. Create Ledger Entry Lines
    const linesToInsert = input.lines.map((line) => ({
      transactionId: header!.id,
      account: line.account,
      debitMinor: line.debitMinor,
      creditMinor: line.creditMinor,
      currency,
    }));

    await db.insert(ledgerEntries).values(linesToInsert);

    this.auditService.log({
      actorUserId: null,
      action: 'finance.journal_posted',
      category: 'admin',
      entityType: 'financial_transaction',
      entityId: header!.id,
      metadata: {
        transactionNumber,
        transactionType: input.transactionType,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        totalAmountMinor: totalDebit,
      },
    });

    return header;
  }

  /**
   * Post Canonical Payment Captured Journal
   */
  async postPaymentCaptured(
    orderId: string,
    grossMinor: number,
    platformFeeMinor: number,
    taxMinor: number,
    dbTx?: any,
  ) {
    const netOrganizerPayable = grossMinor - platformFeeMinor - taxMinor;

    return this.postJournal(
      {
        transactionType: 'payment_capture',
        referenceType: 'order',
        referenceId: orderId,
        lines: [
          { account: 'payment_clearing', debitMinor: grossMinor, creditMinor: 0 },
          { account: 'organizer_payable', debitMinor: 0, creditMinor: netOrganizerPayable },
          { account: 'platform_revenue', debitMinor: 0, creditMinor: platformFeeMinor },
          { account: 'tax_payable', debitMinor: 0, creditMinor: taxMinor },
        ],
      },
      dbTx,
    );
  }

  /**
   * Post Canonical Refund Journal (reverses original capture proportions)
   */
  async postRefund(
    orderId: string,
    refundGrossMinor: number,
    platformFeeMinor: number,
    taxMinor: number,
    dbTx?: any,
  ) {
    const netOrganizerPayable = refundGrossMinor - platformFeeMinor - taxMinor;

    return this.postJournal(
      {
        transactionType: 'refund',
        referenceType: 'order',
        referenceId: orderId,
        lines: [
          { account: 'organizer_payable', debitMinor: netOrganizerPayable, creditMinor: 0 },
          { account: 'platform_revenue', debitMinor: platformFeeMinor, creditMinor: 0 },
          { account: 'tax_payable', debitMinor: taxMinor, creditMinor: 0 },
          { account: 'refund_payable', debitMinor: 0, creditMinor: refundGrossMinor },
        ],
      },
      dbTx,
    );
  }

  /**
   * Query financial transactions with cursor pagination
   */
  async listTransactions(query: { cursor?: string; limit?: number }) {
    const limit = Math.min(query.limit ?? 20, 100);
    const db = this.databaseService.db;

    const conditions: any[] = [];
    if (query.cursor) {
      conditions.push(lt(financialTransactions.id, query.cursor));
    }

    const rows = await db.query.financialTransactions.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: limit + 1,
      orderBy: [desc(financialTransactions.createdAt), desc(financialTransactions.id)],
      with: {
        entries: true,
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

    return { data: items, nextCursor, hasMore };
  }
}
