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
  minPerOrder: number;
  maxPerOrder: number;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketTypeInput {
  eventId: string;
  name: string;
  description?: string | null;
  priceMinor: number;
  currency?: string;
  quantity: number;
  minPerOrder?: number;
  maxPerOrder?: number;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  status?: string;
}

export interface UpdateTicketTypeInput {
  name?: string;
  description?: string | null;
  priceMinor?: number;
  quantity?: number;
  minPerOrder?: number;
  maxPerOrder?: number;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  status?: string;
}

export interface InventoryReservation {
  id: string;
  ticketTypeId: string;
  orderId: string;
  userId: string | null;
  quantity: number;
  expiresAt: string;
  status: string;
  createdAt: string;
}

export interface CreateReservationInput {
  ticketTypeId: string;
  quantity: number;
  idempotencyKey?: string;
}

export interface ReservationDto {
  reservationId: string;
  orderId: string;
  ticketTypeId: string;
  quantity: number;
  expiresAt: string;
  subtotalMinor: number;
  feesMinor: number;
  totalMinor: number;
  currency: string;
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
