export interface PromoterProfile {
  id: string;
  organizationId: string;
  status: string;
}

export interface PromoterCampaign {
  id: string;
  promoterId: string;
  eventId: string;
  code: string;
  commissionType: string;
  commissionValue: number;
  status: string;
}

export interface CreatePromoterCampaignInput {
  eventId: string;
  code: string;
  commissionType: 'percentage' | 'fixed';
  commissionValue: number; // e.g. 10 for 10%, or 5000 for ₹50 fixed
}

export interface ReferralClick {
  id: string;
  campaignId: string;
  sessionReference: string | null;
  createdAt: string;
}

export interface ReferralAttribution {
  id: string;
  campaignId: string;
  orderId: string;
  attributedAt: string;
}

export interface CommissionEntry {
  id: string;
  campaignId: string;
  orderId: string;
  commissionType: string;
  commissionValue: number;
  calculationBaseMinor: number;
  ticketQuantity: number;
  amountMinor: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'reversed' | 'paid';
  createdAt: string;
}

export interface PromoterCampaignPerformanceDto {
  campaignId: string;
  code: string;
  eventId: string;
  eventTitle: string;
  totalClicks: number;
  totalAttributedOrders: number;
  totalTicketsSold: number;
  totalRevenueGeneratedMinor: number;
  totalCommissionEarnedMinor: number;
}

export interface PromoterEarningsSummaryDto {
  promoterId: string;
  organizationId: string;
  pendingCommissionMinor: number;
  approvedCommissionMinor: number;
  paidCommissionMinor: number;
  reversedCommissionMinor: number;
  currency: string;
}
