export interface AdminUserListItemDto {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  status: string;
  createdAt: string;
}

export interface AdminUserDetailDto extends AdminUserListItemDto {
  avatarUrl: string | null;
  updatedAt: string;
  organizations?: Array<{
    organizationId: string;
    organizationName: string;
    roleName: string;
  }>;
}

export interface AdminUserSuspendInput {
  reason: string;
}

export interface AdminEventReviewQueueItemDto {
  id: string;
  title: string;
  slug: string;
  organizerId: string;
  organizerName: string;
  venueId: string | null;
  venueName: string | null;
  status: string;
  startsAt: string;
  submittedAt: string | null;
}

export interface AdminEventReviewInput {
  action: 'approve' | 'reject' | 'suspend';
  reason?: string;
}

export interface AdminEventListItemDto {
  id: string;
  title: string;
  slug: string;
  organizerId: string;
  organizerName: string;
  venueId: string | null;
  venueName: string | null;
  city: string | null;
  status: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  ticketsSold: number;
  grossSalesMinor: number;
  isFeaturedOnHomepage: boolean;
  ticketTiers?: Array<{
    id: string;
    name: string;
    priceMinor: number;
    capacity: number;
    soldQuantity: number;
  }>;
}

export interface AdminOrderInspectionDto {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  purchaserName: string;
  purchaserEmail: string;
  status: string;
  totalMinor: number;
  currency: string;
  createdAt: string;
  items: Array<{
    id: string;
    ticketTypeName: string;
    quantity: number;
    unitPriceMinor: number;
    totalMinor: number;
  }>;
  tickets: Array<{
    id: string;
    ticketNumber: string;
    status: string;
    checkedInAt: string | null;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    status: string;
    amountMinor: number;
  }>;
}

export interface AdminRefundOrderInput {
  reason: string;
  idempotencyKey: string;
  amountMinor?: number;
}

export interface AdminAuditLogListItemDto {
  id: string;
  actorUserId: string | null;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface AdminAuditLogQueryInput {
  adminUserId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  cursor?: string;
  limit?: number;
}

export interface AdminCustomerListItemDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  registeredAt: string;
  totalOrdersCount: number;
  totalTicketsBought: number;
  lifetimeValueMinor: number;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  tier: 'VIP Spender' | 'Regular Buyer' | 'New Attendee';
  status: 'active' | 'suspended' | 'flagged';
  lastActive: string;
  adminNotes?: string | null;
}

export interface AdminCustomerDetailDto extends AdminCustomerListItemDto {
  pastEventsAttended: Array<{
    eventName: string;
    eventDate: string;
    venueName: string;
    tierName: string;
    amountPaidMinor: number;
    orderId: string;
    checkInStatus: 'Checked In' | 'No Show';
    ticketId: string;
  }>;
}

export interface AdminSupportTicketDto {
  id: string;
  userId: string | null;
  userName?: string | null;
  userEmail?: string | null;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description?: string;
  relatedOrderId?: string | null;
  relatedEventId?: string | null;
  assignedAdminId?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRefundQueueItemDto {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  eventName: string;
  amountMinor: number;
  reason: string;
  requestedAt: string;
  status: string;
  paymentProvider: string;
}

export interface AdminChargebackLogDto {
  id: string;
  orderId: string;
  paymentId: string;
  amountMinor: number;
  reason: string;
  disputeStatus: string;
  filedAt: string;
  riskScore: number;
}

export interface AdminOrganizerListItemDto {
  id: string;
  name: string;
  legalEntityName: string | null;
  slug: string;
  email?: string | null;
  phone?: string | null;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  kybStatus: 'unsubmitted' | 'pending' | 'verified' | 'rejected';
  kybSubmittedAt: string | null;
  kybVerifiedAt: string | null;
  kybRejectionReason: string | null;
  taxIdPan: string | null;
  gstin: string | null;
  customCommissionRateBps: number | null;
  platformCommissionRate: number; // e.g. 4.0
  walletCreditsBalance: number;
  eventsCount: number;
  totalGmvMinor: number;
  bankAccount: {
    accountNumber: string;
    ifsc: string;
    pan: string;
    gstin?: string;
    gstRegistered: boolean;
  } | null;
  createdAt: string;
}

export interface AdminMarketingWalletDto {
  id: string;
  organizationId: string;
  organizerName: string;
  legalEntity: string;
  email: string;
  balance: number;
  totalPurchased: number;
  totalPromotionalGranted: number;
  totalSpent: number;
  campaignsCount: number;
  lastTopupDate: string | null;
}

export interface AdminBroadcastCampaignDto {
  id: string;
  organizationId: string;
  organizerName: string;
  eventId: string;
  eventName: string;
  name: string;
  type: string;
  content: string;
  targetAudienceCount: number;
  creditsCost: number;
  status: 'draft' | 'scheduled' | 'processing' | 'delivered' | 'flagged_content';
  deliveredAt: string | null;
  createdAt: string;
}

export interface AdminPromoterListItemDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  referralCode?: string;
  organizationId: string;
  linkedOrganizer: string;
  status: string;
  totalClicks: number;
  ticketsSold: number;
  grossSalesMinor: number;
  commissionEarnedMinor: number;
  unpaidCommissionMinor: number;
  commissionRate: number;
  pendingPayouts: Array<{
    id: string;
    amountMinor: number;
    destinationReference: string;
    createdAt: string;
    status: string;
  }>;
  createdAt: string;
}

export interface AdminSettlementListItemDto {
  id: string;
  organizationId: string;
  organizerName: string;
  eventId: string | null;
  eventName: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  grossSalesMinor: number;
  platformCommissionMinor: number;
  promoterCommissionMinor: number;
  refundsMinor: number;
  taxMinor: number;
  netSettlementMinor: number;
  status: string;
  bankAccount: {
    accountNumber: string;
    ifsc: string;
  } | null;
  transactionReference: string | null;
  paidAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface OrderReceiptDto {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  purchaserName?: string;
  purchaserEmail?: string;
  purchaserPhone?: string | null;
  eventId?: string;
  eventName: string;
  eventDate: string;
  venueName: string;
  venueAddress?: string;
  organizerName: string;
  legalEntityName?: string;
  gstin?: string | null;
  items: Array<{
    ticketTypeId: string;
    ticketTypeName: string;
    quantity: number;
    unitPriceMinor: number;
    totalMinor: number;
  }>;
  subtotalMinor: number;
  discountMinor: number;
  feesMinor?: number;
  platformFeeMinor?: number;
  taxMinor: number;
  totalMinor: number;
  currency: string;
  status?: string;
  paymentMethod?: string;
  paymentTransactionRef?: string | null;
  paymentTransactionReference?: string | null;
  paidAt?: string;
  createdAt?: string;
}

export interface ScannerPairingTokenDto {
  pairingCode: string;
  expiresAt: string;
  eventId: string;
  organizationId: string;
}

