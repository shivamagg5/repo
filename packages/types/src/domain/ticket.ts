import type { TicketStatus } from './enums.js';

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  priceMinor: number;
  currency: string;
  quantity: number;
  soldQuantity: number;
  reservedQuantity: number;
  maxPerOrder: number;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  orderId: string;
  orderItemId: string;
  ticketTypeId: string;
  eventId: string;
  userId: string;
  ticketNumber: string;
  status: TicketStatus;
  qrTokenHash: string;
  issuedAt: string;
  checkedInAt: string | null;
  voidedAt: string | null;
}

export interface InventoryReservation {
  id: string;
  ticketTypeId: string;
  orderId: string;
  quantity: number;
  expiresAt: string;
  status: string;
  createdAt: string;
}
