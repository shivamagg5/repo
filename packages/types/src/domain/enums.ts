// =============================================================================
// Shared Enumerations — derived from 08_EXACT_DATABASE_SCHEMA.sql
// =============================================================================

export type UserStatus = 'active' | 'suspended' | 'deleted';

export type OrganizationType = 'organizer' | 'venue' | 'promoter';

export type OrganizationStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export type EventStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'published'
  | 'live'
  | 'completed'
  | 'rejected'
  | 'suspended'
  | 'cancelled';

export type TicketStatus = 'issued' | 'checked_in' | 'refunded' | 'void' | 'cancelled' | 'expired';

export type OrderStatus =
  | 'created'
  | 'payment_pending'
  | 'paid'
  | 'tickets_issued'
  | 'completed'
  | 'payment_failed'
  | 'cancelled'
  | 'refund_pending'
  | 'partially_refunded'
  | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type RefundStatus =
  | 'requested'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type SettlementStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled';

export type CheckinResult =
  | 'success'
  | 'invalid'
  | 'already_used'
  | 'wrong_event'
  | 'refunded'
  | 'cancelled'
  | 'expired'
  | 'access_denied'
  | 'offline_pending';

export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'read';
