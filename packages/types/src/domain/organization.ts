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
