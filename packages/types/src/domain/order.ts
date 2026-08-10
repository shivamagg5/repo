import type { OrderStatus } from './enums.js';

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  status: OrderStatus;
  subtotalMinor: number;
  feesMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  currency: string;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  ticketTypeId: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
}
