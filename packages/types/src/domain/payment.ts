import type { PaymentStatus, RefundStatus } from './enums.js';

export interface PaymentTransaction {
  id: string;
  orderId: string;
  provider: string;
  providerPaymentId: string | null;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  providerPayloadReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentEvent {
  id: string;
  paymentTransactionId: string | null;
  providerEventId: string;
  eventType: string;
  payloadReference: string | null;
  receivedAt: string;
  processedAt: string | null;
  status: string;
}

export interface Refund {
  id: string;
  orderId: string;
  paymentTransactionId: string | null;
  amountMinor: number;
  reason: string | null;
  status: RefundStatus;
  providerRefundId: string | null;
  requestedBy: string | null;
  createdAt: string;
  completedAt: string | null;
}
