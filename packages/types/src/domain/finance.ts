import type { SettlementStatus } from './enums.js';

export type CanonicalAccount =
  | 'platform_cash'
  | 'payment_clearing'
  | 'organizer_payable'
  | 'promoter_payable'
  | 'platform_revenue'
  | 'tax_payable'
  | 'refund_payable';

export type FinancialTransactionStatus = 'draft' | 'posted' | 'reversed';

export interface LedgerEntryDto {
  id: string;
  transactionId: string;
  account: CanonicalAccount;
  debitMinor: number;
  creditMinor: number;
  currency: string;
  createdAt: string;
}

export interface FinancialTransactionDto {
  id: string;
  transactionNumber: string;
  transactionType: string;
  status: FinancialTransactionStatus;
  currency: string;
  referenceType: string;
  referenceId: string;
  createdAt: string;
  postedAt: string | null;
  entries: LedgerEntryDto[];
}

export interface SettlementDto {
  id: string;
  organizationId: string;
  eventId: string | null;
  grossSalesMinor: number;
  refundsMinor: number;
  platformCommissionMinor: number;
  promoterCommissionMinor: number;
  taxMinor: number;
  netSettlementMinor: number;
  status: SettlementStatus;
  periodStart: string;
  periodEnd: string;
  idempotencyKey: string;
  preparedBy: string;
  preparedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface GenerateSettlementInput {
  organizationId: string;
  eventId?: string;
  periodStart: string;
  periodEnd: string;
  idempotencyKey: string;
}

export interface ReviewSettlementInput {
  action: 'approve' | 'reject';
  reason?: string;
}

export interface ReconciliationExceptionDto {
  id: string;
  reconciliationRunId: string;
  internalReference: string;
  providerReference: string | null;
  expectedAmountMinor: number;
  actualAmountMinor: number;
  currency: string;
  differenceMinor: number;
  mismatchType: string;
  status: string;
  detectedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface ReconciliationRunDto {
  id: string;
  reconciliationDate: string;
  totalOrdersCount: number;
  totalMatchedCount: number;
  totalMismatchedCount: number;
  status: 'clean' | 'exceptions_flagged';
  createdAt: string;
  exceptions?: ReconciliationExceptionDto[];
}

export interface FinancialStatementDto {
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  totalGrossSalesMinor: number;
  totalRefundsMinor: number;
  totalPlatformCommissionMinor: number;
  totalPromoterCommissionMinor: number;
  totalTaxMinor: number;
  netPayableMinor: number;
  settlements: SettlementDto[];
}
