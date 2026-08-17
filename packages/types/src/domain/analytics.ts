export type AnalyticsPlatform = 'web' | 'ios' | 'android' | 'admin';

export interface AnalyticsEventDto {
  id: string;
  clientEventId: string | null;
  eventName: string;
  eventId: string | null;
  userId: string | null;
  sessionId: string | null;
  platform: AnalyticsPlatform;
  appVersion: string | null;
  properties: Record<string, any>;
  occurredAt: string;
  receivedAt: string;
}

export interface RecordAnalyticsEventInput {
  clientEventId?: string;
  eventName: string;
  eventId?: string;
  sessionId?: string;
  platform?: AnalyticsPlatform;
  appVersion?: string;
  occurredAt?: string;
  properties?: Record<string, any>;
}

export interface RecordAnalyticsBatchInput {
  events: RecordAnalyticsEventInput[];
}

export interface FunnelStepDto {
  stepName: string;
  count: number;
  conversionRatePercent: number;
  dropoffRatePercent: number;
}

export interface FunnelAnalysisQueryInput {
  eventId?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface FunnelAnalysisReportDto {
  eventId: string | null;
  periodStart: string;
  periodEnd: string;
  totalEventViews: number;
  totalCheckoutsStarted: number;
  totalPaymentSuccesses: number;
  totalTicketsIssued: number;
  totalCheckins: number;
  steps: FunnelStepDto[];
}

export interface OrganizerAnalyticsDto {
  organizationId: string;
  eventId: string | null;
  totalGrossRevenueMinor: number;
  totalOrdersCount: number;
  totalTicketsSolds: number;
  conversionRatePercent: number;
  attendanceRatePercent: number;
  averageOrderValueMinor: number;
}

export interface ScannerMetricsDto {
  eventId: string;
  totalScanAttempts: number;
  successfulScans: number;
  invalidScans: number;
  alreadyUsedScans: number;
  refundedScans: number;
  offlineScans: number;
  syncConflicts: number;
  scanSuccessRatePercent: number;
}

export interface AdminPlatformMetricsDto {
  totalGmvMinor: number;
  totalOrdersCount: number;
  totalTicketsIssued: number;
  averageOrderValueMinor: number;
  checkoutDropoffRatePercent: number;
  refundRatePercent: number;
  activeOrganizersCount: number;
  activeEventsCount: number;
}
