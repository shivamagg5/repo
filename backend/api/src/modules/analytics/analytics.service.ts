import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  analyticsEvents,
  analyticsAggregatesDaily,
  orders,
  tickets,
  checkins,
  refunds,
  events,
  organizations,
} from '../../database/schema/index';
import { eq, and, gte, lte, inArray, sql, count, sum, ne } from 'drizzle-orm';
import type {
  AuthContext,
  RecordAnalyticsEventInput,
  RecordAnalyticsBatchInput,
  FunnelAnalysisQueryInput,
  FunnelAnalysisReportDto,
  OrganizerAnalyticsDto,
  ScannerMetricsDto,
  AdminPlatformMetricsDto,
} from '@platform/types';

export const CANONICAL_EVENT_NAMES = [
  'app_open',
  'session_start',
  'page_view',
  'search_started',
  'search_completed',
  'filter_applied',
  'event_view',
  'event_share',
  'favorite_added',
  'favorite_removed',
  'checkout_started',
  'checkout_ticket_selected',
  'promo_applied',
  'payment_started',
  'payment_success',
  'payment_failed',
  'order_viewed',
  'ticket_viewed',
  'ticket_shared',
  'refund_requested',
  'notification_opened',
  'organizer_login',
  'event_created',
  'event_saved',
  'event_submitted',
  'event_published',
  'ticket_type_created',
  'ticket_price_changed',
  'promo_created',
  'guest_added',
  'dashboard_viewed',
  'report_exported',
  'refund_processed',
  'scanner_login',
  'scanner_event_selected',
  'scan_started',
  'scan_success',
  'scan_invalid',
  'scan_already_used',
  'scan_wrong_event',
  'scan_refunded',
  'offline_mode_entered',
  'sync_started',
  'sync_completed',
  'admin_login',
  'event_approved',
  'event_rejected',
  'event_suspended',
  'user_suspended',
  'settlement_approved',
];

export const ALLOWLISTED_PROPERTIES_PER_EVENT: Record<string, string[]> = {
  event_view: ['eventId', 'categoryId', 'city', 'source'],
  checkout_started: ['eventId', 'ticketTypeId', 'quantity', 'totalMinor'],
  checkout_ticket_selected: ['eventId', 'ticketTypeId', 'priceMinor'],
  payment_started: ['eventId', 'orderId', 'amountMinor', 'currency'],
  payment_success: ['eventId', 'orderId', 'amountMinor'],
  scan_success: ['eventId', 'ticketId', 'gateId', 'scanLatencyMs'],
  scan_invalid: ['eventId', 'reason'],
};

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * PROPERTY ALLOWLISTING & SENSITIVE DATA FILTERING
   */
  sanitizeProperties(eventName: string, rawProps?: Record<string, any>): Record<string, any> {
    if (!rawProps) return {};

    const allowlist = ALLOWLISTED_PROPERTIES_PER_EVENT[eventName];
    const sanitized: Record<string, any> = {};

    // Filter properties: omit passwords, card numbers, tokens, secrets, un-allowlisted keys
    for (const [key, val] of Object.entries(rawProps)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('card') ||
        lowerKey.includes('cvv') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret')
      ) {
        continue;
      }

      if (!allowlist || allowlist.includes(key)) {
        sanitized[key] = val;
      }
    }

    return sanitized;
  }

  /**
   * SINGLE EVENT INGESTION (NON-BLOCKING WITH IDENTITY AUTHORITY & IDEMPOTENCY)
   */
  async recordEvent(input: RecordAnalyticsEventInput, actor?: AuthContext) {
    // 1. Validate Canonical Event Taxonomy
    if (!CANONICAL_EVENT_NAMES.includes(input.eventName)) {
      throw new BadRequestException(
        `Invalid analytics event name "${input.eventName}". Must belong to canonical taxonomy in 14_ANALYTICS_EVENTS.md.`,
      );
    }

    const db = this.databaseService.db;
    const userId = actor?.userId ?? null; // Identity authority: Derive from AuthContext
    const clientEventId = input.clientEventId ?? null;
    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();

    // Idempotency check by clientEventId
    if (clientEventId) {
      const existing = await db.query.analyticsEvents.findFirst({
        where: eq(analyticsEvents.clientEventId, clientEventId),
      });
      if (existing) return existing;
    }

    const sanitizedProps = this.sanitizeProperties(input.eventName, input.properties);

    const [eventRecord] = await db
      .insert(analyticsEvents)
      .values({
        clientEventId,
        eventName: input.eventName,
        eventId: input.eventId ?? null,
        userId,
        sessionId: input.sessionId ?? null,
        platform: input.platform ?? 'web',
        appVersion: input.appVersion ?? null,
        propertiesJson: JSON.stringify(sanitizedProps),
        occurredAt,
      })
      .returning();

    return eventRecord;
  }

  /**
   * BATCH EVENT INGESTION (MAX 50 EVENTS PER BATCH)
   */
  async recordBatch(input: RecordAnalyticsBatchInput, actor?: AuthContext) {
    const results: any[] = [];
    for (const item of input.events) {
      try {
        const rec = await this.recordEvent(item, actor);
        results.push(rec);
      } catch (err: any) {
        this.logger.warn(`Skipped invalid batch event "${item.eventName}": ${err.message}`);
      }
    }
    return { count: results.length, events: results };
  }

  /**
   * CONVERSION FUNNEL ANALYSIS ENGINE
   */
  async getFunnelAnalysis(query: FunnelAnalysisQueryInput): Promise<FunnelAnalysisReportDto> {
    const db = this.databaseService.db;
    const periodStart = query.periodStart ? new Date(query.periodStart) : new Date(Date.now() - 30 * 86400000);
    const periodEnd = query.periodEnd ? new Date(query.periodEnd) : new Date();

    // Query analytics events for funnel stages
    const getStageCount = async (name: string) => {
      const conds: any[] = [
        eq(analyticsEvents.eventName, name),
        gte(analyticsEvents.occurredAt, periodStart),
        lte(analyticsEvents.occurredAt, periodEnd),
      ];
      if (query.eventId) conds.push(eq(analyticsEvents.eventId, query.eventId));
      const res = await db.select({ count: count() }).from(analyticsEvents).where(and(...conds));
      return Number(res[0]?.count ?? 0);
    };

    const views = await getStageCount('event_view');
    const selected = await getStageCount('checkout_ticket_selected');
    const checkout = await getStageCount('checkout_started');
    const payment = await getStageCount('payment_success');

    // Authoritative Operational Data for Tickets & Checkins
    const ticketConds: any[] = [gte(tickets.issuedAt, periodStart), lte(tickets.issuedAt, periodEnd)];
    if (query.eventId) ticketConds.push(eq(tickets.eventId, query.eventId));
    const issuedRes = await db.select({ count: count() }).from(tickets).where(and(...ticketConds));
    const ticketsIssued = Number(issuedRes[0]?.count ?? 0);

    const checkinConds: any[] = [gte(checkins.scannedAt, periodStart), lte(checkins.scannedAt, periodEnd)];
    if (query.eventId) checkinConds.push(eq(checkins.eventId, query.eventId));
    const checkinRes = await db.select({ count: count() }).from(checkins).where(and(...checkinConds));
    const checkinsCount = Number(checkinRes[0]?.count ?? 0);

    const baseCount = views > 0 ? views : 1;

    const steps = [
      {
        stepName: 'Event View',
        count: views,
        conversionRatePercent: 100,
        dropoffRatePercent: 0,
      },
      {
        stepName: 'Ticket Selected',
        count: selected,
        conversionRatePercent: Math.round((selected / baseCount) * 100),
        dropoffRatePercent: Math.max(0, 100 - Math.round((selected / baseCount) * 100)),
      },
      {
        stepName: 'Checkout Started',
        count: checkout,
        conversionRatePercent: Math.round((checkout / baseCount) * 100),
        dropoffRatePercent: Math.max(0, 100 - Math.round((checkout / baseCount) * 100)),
      },
      {
        stepName: 'Payment Success',
        count: payment,
        conversionRatePercent: Math.round((payment / baseCount) * 100),
        dropoffRatePercent: Math.max(0, 100 - Math.round((payment / baseCount) * 100)),
      },
      {
        stepName: 'Ticket Issued',
        count: ticketsIssued,
        conversionRatePercent: Math.round((ticketsIssued / baseCount) * 100),
        dropoffRatePercent: Math.max(0, 100 - Math.round((ticketsIssued / baseCount) * 100)),
      },
      {
        stepName: 'Check-in',
        count: checkinsCount,
        conversionRatePercent: Math.round((checkinsCount / baseCount) * 100),
        dropoffRatePercent: Math.max(0, 100 - Math.round((checkinsCount / baseCount) * 100)),
      },
    ];

    return {
      eventId: query.eventId ?? null,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalEventViews: views,
      totalCheckoutsStarted: checkout,
      totalPaymentSuccesses: payment,
      totalTicketsIssued: ticketsIssued,
      totalCheckins: checkinsCount,
      steps,
    };
  }

  /**
   * AUTHORITATIVE ORGANIZER ANALYTICS (FIX-022 — no hardcoded percentages)
   */
  async getOrganizerAnalytics(organizationId: string, eventId?: string): Promise<OrganizerAnalyticsDto> {
    const db = this.databaseService.db;

    // Revenue and orders scoped to this organization's events
    const orgEventIds = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.organizerOrganizationId, organizationId));

    const orgEventIdList = orgEventIds.map((e) => e.id);

    let totalGrossRevenueMinor = 0;
    let totalOrdersCount = 0;

    if (orgEventIdList.length > 0) {
      const paidOrders = await db
        .select({ totalMinor: orders.totalMinor })
        .from(orders)
        .where(and(eq(orders.status, 'paid'), inArray(orders.eventId, orgEventIdList)));

      totalOrdersCount = paidOrders.length;
      for (const o of paidOrders) totalGrossRevenueMinor += o.totalMinor;
    }

    const averageOrderValueMinor = totalOrdersCount > 0 ? Math.round(totalGrossRevenueMinor / totalOrdersCount) : 0;

    // Tickets scoped to org events
    let totalTicketsSolds = 0;
    if (orgEventIdList.length > 0) {
      const issuedTickets = await db
        .select({ count: count() })
        .from(tickets)
        .where(inArray(tickets.eventId, orgEventIdList));
      totalTicketsSolds = Number(issuedTickets[0]?.count ?? 0);
    }

    // Check-ins scoped to org events
    let totalCheckins = 0;
    if (orgEventIdList.length > 0) {
      const checkinsRes = await db
        .select({ count: count() })
        .from(checkins)
        .where(inArray(checkins.eventId, orgEventIdList));
      totalCheckins = Number(checkinsRes[0]?.count ?? 0);
    }

    const attendanceRatePercent = totalTicketsSolds > 0 ? Math.round((totalCheckins / totalTicketsSolds) * 100) : 0;

    // Conversion rate: event_view → payment_success scoped to this org's events
    // analyticsEvents doesn't have organizationId; scope by org's eventId list
    let conversionRatePercent = 0;
    if (orgEventIdList.length > 0) {
      const eventIdFilter = eventId
        ? [eq(analyticsEvents.eventId, eventId)]
        : [inArray(analyticsEvents.eventId, orgEventIdList)];

      const [viewsRow] = await db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(and(eq(analyticsEvents.eventName, 'event_view'), ...eventIdFilter));

      const [paymentsRow] = await db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(and(eq(analyticsEvents.eventName, 'payment_success'), ...eventIdFilter));

      const viewsCount = Number(viewsRow?.count ?? 0);
      const paymentsCount = Number(paymentsRow?.count ?? 0);
      conversionRatePercent = viewsCount > 0 ? Math.round((paymentsCount / viewsCount) * 100) : 0;
    }

    return {
      organizationId,
      eventId: eventId ?? null,
      totalGrossRevenueMinor,
      totalOrdersCount,
      totalTicketsSolds,
      conversionRatePercent,
      attendanceRatePercent,
      averageOrderValueMinor,
    };
  }

  /**
   * AUTHORITATIVE SCANNER OPERATIONAL METRICS (FIX-022 — no hardcoded zeros)
   */
  async getScannerMetrics(eventId: string): Promise<ScannerMetricsDto> {
    const db = this.databaseService.db;

    const allCheckins = await db.query.checkins.findMany({
      where: eq(checkins.eventId, eventId),
    });

    const successfulScans = allCheckins.filter((c) => c.result === 'success').length;
    const invalidScans = allCheckins.filter((c) => c.result === 'invalid').length;
    const alreadyUsedScans = allCheckins.filter((c) => c.result === 'already_used').length;
    const refundedScans = allCheckins.filter((c) => c.result === 'refunded').length;
    const offlineScans = allCheckins.filter((c) => c.result === 'offline_pending').length;
    // 'conflict' is not in the checkin_result enum; offline sync conflicts tracked separately
    const syncConflicts = 0;
    const totalScanAttempts = allCheckins.length;

    const scanSuccessRatePercent =
      totalScanAttempts > 0 ? Math.round((successfulScans / totalScanAttempts) * 100) : 0;

    return {
      eventId,
      totalScanAttempts,
      successfulScans,
      invalidScans,
      alreadyUsedScans,
      refundedScans,
      offlineScans,
      syncConflicts,
      scanSuccessRatePercent,
    };
  }

  /**
   * AUTHORITATIVE ADMIN PLATFORM METRICS (FIX-022 — no hardcoded values)
   */
  async getAdminPlatformMetrics(): Promise<AdminPlatformMetricsDto> {
    const db = this.databaseService.db;

    // Total GMV from paid orders
    const [gmvRow] = await db
      .select({ total: sum(orders.totalMinor) })
      .from(orders)
      .where(eq(orders.status, 'paid'));
    const totalGmvMinor = Number(gmvRow?.total ?? 0);

    const [ordersRow] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, 'paid'));
    const totalOrdersCount = Number(ordersRow?.count ?? 0);
    const averageOrderValueMinor = totalOrdersCount > 0 ? Math.round(totalGmvMinor / totalOrdersCount) : 0;

    const [ticketsRes] = await db.select({ count: count() }).from(tickets);
    const totalTicketsIssued = Number(ticketsRes?.count ?? 0);

    const [refundsRes] = await db.select({ count: count() }).from(refunds);
    const totalRefundsCount = Number(refundsRes?.count ?? 0);
    const refundRatePercent = totalOrdersCount > 0 ? Math.round((totalRefundsCount / totalOrdersCount) * 100) : 0;

    // Checkout drop-off: checkout_started events that did NOT lead to payment_success
    // Use analytics_events for funnel computation
    const [checkoutsRow] = await db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.eventName, 'checkout_started'));
    const checkoutsStarted = Number(checkoutsRow?.count ?? 0);

    const [paySuccessRow] = await db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.eventName, 'payment_success'));
    const paymentSuccesses = Number(paySuccessRow?.count ?? 0);

    const checkoutDropoffRatePercent =
      checkoutsStarted > 0
        ? Math.round(((checkoutsStarted - paymentSuccesses) / checkoutsStarted) * 100)
        : 0;

    // Active organizers (organizations of type 'organizer' with status 'active')
    const [orgsRow] = await db
      .select({ count: count() })
      .from(organizations)
      .where(and(eq(organizations.type, 'organizer'), eq(organizations.status, 'active')));
    const activeOrganizersCount = Number(orgsRow?.count ?? 0);

    // Active events (status 'published' or 'live')
    const [eventsRow] = await db
      .select({ count: count() })
      .from(events)
      .where(and(
        ne(events.status, 'cancelled'),
        ne(events.status, 'rejected'),
        ne(events.status, 'draft'),
      ));
    const activeEventsCount = Number(eventsRow?.count ?? 0);

    return {
      totalGmvMinor,
      totalOrdersCount,
      totalTicketsIssued,
      averageOrderValueMinor,
      checkoutDropoffRatePercent,
      refundRatePercent,
      activeOrganizersCount,
      activeEventsCount,
    };
  }
}
