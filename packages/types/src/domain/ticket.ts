import type { TicketStatus } from './enums.js';

export type PartyEntryType = 'general' | 'couple' | 'female' | 'stag' | 'vip_table' | 'guestlist';

export interface TablePackageDetails {
  tableNumber?: string;
  minSpendMinor?: number;
  coverChargeIncludedMinor?: number;
  maxGuests?: number;
}

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
  entryType?: PartyEntryType;
  curfewTime?: string | null;
  tableDetails?: TablePackageDetails | null;
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
  entryType?: PartyEntryType;
  curfewTime?: string | null;
  tableDetails?: TablePackageDetails | null;
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
  qrToken?: string;
  issuedAt: string;
  checkedInAt: string | null;
  voidedAt: string | null;
  ticketTypeName?: string;
  tierName?: string;
  eventTitle?: string;
  venueName?: string;
  eventStartsAt?: string;
}

// ---------------------------------------------------------------------------
// SCANNER DOMAIN DTOs (Task 9.1)
// ---------------------------------------------------------------------------

export interface DeviceRegisterInput {
  deviceIdentifier: string;
  publicKeyPem: string;
  deviceModel?: string;
}

export interface DeviceRegisterResultDto {
  deviceId: string;
  deviceIdentifier: string;
  status: string;
  registeredAt: string;
}

export interface DevicePairInput {
  deviceId: string;
  eventId: string;
  gateId: string;
}

export interface EventAuthorizationPackageDto {
  version: string;
  packageVersion: string;
  deviceId: string;
  eventId: string;
  gateId: string;
  keyVersion: string;
  publicVerificationKeyPem: string;
  ticketCredentialVersion: string;
  eventStart: string;
  eventEnd: string;
  authorizationIssuedAt: string;
  authorizationExpiresAt: string;
  packageSignature: string;
}

export interface ScanTicketInput {
  qrPayload: string;
  eventId: string;
  gateId: string;
  deviceId: string;
  scanTimestamp?: string;
}

export interface ScanTicketResultDto {
  result: 'success' | 'already_used' | 'invalid' | 'wrong_event' | 'expired' | 'refunded' | 'cancelled' | 'conflict';
  ticketId?: string;
  ticketNumber?: string;
  ticketTypeName?: string;
  purchaserName?: string;
  scannedAt: string;
  previousScan?: {
    scannedAt: string;
    gateName?: string;
  } | null;
  message: string;
}

export interface BatchSyncScanRecord {
  syncId: string;
  qrPayload: string;
  eventId: string;
  gateId: string;
  deviceId: string;
  deviceScannedAt: string;
  localVerificationResult: string;
}

export interface BatchSyncScansInput {
  deviceId: string;
  eventId: string;
  records: BatchSyncScanRecord[];
}

export interface BatchSyncScansResultDto {
  processedCount: number;
  successCount: number;
  duplicateCount: number;
  conflictCount: number;
  results: Array<{
    syncId: string;
    result: string;
    message: string;
  }>;
}

export interface AttendeeSearchQuery {
  eventId: string;
  query: string;
}

export interface AttendeeSearchResultDto {
  ticketId: string;
  ticketNumber: string;
  ticketTypeName: string;
  purchaserName: string;
  status: string;
  checkedInAt: string | null;
}

// ---------------------------------------------------------------------------
// GUESTLIST DOMAIN DTOs
// ---------------------------------------------------------------------------

export interface GuestlistEntryDto {
  id: string;
  eventId: string;
  promoterId?: string | null;
  promoterName?: string | null;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  entryType: PartyEntryType;
  allowedCount: number;
  admittedCount: number;
  curfewTime: string | null;
  tableNumber: string | null;
  status: 'active' | 'admitted' | 'expired' | 'cancelled';
  qrToken?: string;
  notes?: string | null;
  createdAt: string;
  checkedInAt?: string | null;
}

export interface CreateGuestlistInput {
  eventId: string;
  guestName: string;
  guestPhone?: string | null;
  guestEmail?: string | null;
  entryType?: PartyEntryType;
  allowedCount?: number;
  curfewTime?: string | null;
  tableNumber?: string | null;
  notes?: string | null;
}

