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
  commissionValue: string;
  status: string;
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
  amountMinor: number;
  status: string;
  createdAt: string;
}
