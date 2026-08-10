import type { SettlementStatus } from './enums.js';

export interface LedgerAccount {
  id: string;
  ownerType: string;
  ownerId: string;
  currency: string;
  status: string;
}

export interface LedgerEntry {
  id: string;
  accountId: string;
  transactionType: string;
  referenceType: string;
  referenceId: string;
  debitMinor: number;
  creditMinor: number;
  createdAt: string;
}

export interface Settlement {
  id: string;
  beneficiaryOrganizationId: string;
  periodStart: string;
  periodEnd: string;
  grossMinor: number;
  deductionsMinor: number;
  commissionMinor: number;
  netMinor: number;
  status: SettlementStatus;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface SettlementItem {
  id: string;
  settlementId: string;
  referenceType: string;
  referenceId: string;
  amountMinor: number;
}
