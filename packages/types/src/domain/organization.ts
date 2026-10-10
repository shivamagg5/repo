import type { OrganizationType, OrganizationStatus } from './enums.js';

export interface Organization {
  id: string;
  type: OrganizationType;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  status: string;
  createdAt: string;
}

export interface Role {
  id: string;
  organizationType: OrganizationType | null;
  name: string;
}

export interface Permission {
  id: string;
  key: string;
  description: string | null;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
}

export interface CreateOrganizationInput {
  type: OrganizationType;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}

// ---------------------------------------------------------------------------
// Organizer & Venue Operational Dashboard DTOs
// ---------------------------------------------------------------------------
export interface OrganizerOverviewDto {
  organizationId: string;
  totalActiveEvents: number;
  grossTicketSalesMinor: number;
  refundsMinor: number;
  discountsMinor: number;
  promoterCommissionsMinor: number;
  netOrganizerMinor: number;
  totalTicketsSold: number;
  totalActiveHolds: number;
  averageCapacityUtilization: number;
  currency: string;
}

export interface TicketTierDashboardDto {
  ticketTypeId: string;
  name: string;
  priceMinor: number;
  capacity: number;
  reservedQuantity: number;
  soldQuantity: number;
  remainingQuantity: number;
  grossSalesMinor: number;
}

export interface OrganizerEventDashboardDto {
  eventId: string;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
  venueName: string | null;
  totalCapacity: number;
  totalTicketsSold: number;
  capacityUtilization: number;
  grossSalesMinor: number;
  refundsMinor: number;
  promoterCommissionsMinor: number;
  ticketTiers: TicketTierDashboardDto[];
  totalCheckins: number;
  checkinStatusNote: string;
}

export interface OrganizerOrderDto {
  orderId: string;
  eventId: string;
  status: string;
  totalMinor: number;
  subtotalMinor: number;
  discountMinor: number;
  currency: string;
  createdAt: string;
  ticketQuantity: number;
  purchaserName: string | null;
  purchaserEmail: string | null;
  promoterCode: string | null;
}

export interface VenueProfileDto {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  capacity: number | null;
  status: string;
}

export interface VenueCalendarEventDto {
  eventId: string;
  eventTitle: string;
  startsAt: string;
  endsAt: string;
  status: string;
  organizerName: string;
}

export interface VenueCalendarDto {
  venueId: string;
  venueName: string;
  timezone: string;
  events: VenueCalendarEventDto[];
}

export interface OrganizerCampaignDto {
  id: string;
  eventId: string;
  eventTitle: string;
  code: string;
  name: string;
  campaignType: string;
  discountType?: 'percentage' | 'fixed';
  discountValueMinor?: number;
  ordersCount: number;
  totalDiscountMinor: number;
  grossSalesMinor: number;
  usageLimit?: number | null;
  status: string;
  createdAt: string;
}

export interface OrganizerMarketingOverviewDto {
  totalCredits: number;
  activeCampaignsCount: number;
  totalOrdersAttributed: number;
  totalDiscountGivenMinor: number;
  currency: string;
}

export interface OrganizerCreditWalletDto {
  balanceCredits: number;
  currency: string;
  transactions: Array<{
    id: string;
    credits: number;
    amountMinor: number;
    billingType: string;
    description: string;
    status?: string;
    createdAt: string;
  }>;
}

export interface OrganizerAttendeeDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalOrders: number;
  totalSpendMinor: number;
  lastOrderAt: string | null;
  interestedGenres: string[];
  tickets: Array<{
    ticketId: string;
    ticketNumber: string;
    eventName: string;
    tierName: string;
    priceMinor: number;
    status: string;
    checkedInAt: string | null;
  }>;
}

export interface OrganizerScanMetricsDto {
  eventId: string;
  totalTicketsIssued: number;
  totalCheckedIn: number;
  checkinPercentage: number;
  gatesBreakdown: Array<{
    gateId: string;
    gateName: string;
    scansCount: number;
  }>;
}

export interface PaymentProfileDto {
  id: string;
  organizationId: string;
  accountName: string;
  nickname: string;
  maskedAccountNumber: string;
  ifsc: string;
  panCard: string;
  gstRegistered: boolean;
  gstin?: string | null;
  businessAddress?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  createdAt: string;
}
