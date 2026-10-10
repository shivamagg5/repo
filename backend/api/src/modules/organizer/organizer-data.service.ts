import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { eq, inArray, and, desc, sql, or, ilike } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  organizations,
  organizationMembers,
  events,
  orders,
  tickets,
  ticketTypes,
  users,
  checkins,
  checkinGates,
  promoterCampaigns,
  referralAttributions,
} from '../../database/schema/index';
import { RbacService } from '../auth/rbac.service';
import type {
  AuthContext,
  OrganizerAttendeeDto,
  OrganizerScanMetricsDto,
} from '@platform/types';

@Injectable()
export class OrganizerDataService {
  private readonly logger = new Logger('OrganizerDataService');

  constructor(
    private readonly db: DatabaseService,
    private readonly rbac: RbacService,
  ) {}

  private async getUserOrganizerOrgId(userId: string): Promise<string> {
    const memberships = await this.db.db
      .select({ orgId: organizationMembers.organizationId, type: organizations.type })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(and(eq(organizationMembers.userId, userId), eq(organizations.type, 'organizer')))
      .execute();

    if (memberships.length === 0) {
      throw new ForbiddenException({
        code: 'ORGANIZER_ORG_REQUIRED',
        message: 'User must belong to an organizer organization to access audience data.',
      });
    }

    return memberships[0]!.orgId;
  }

  /**
   * GET ATTENDEES (MULTI-FILTERED & ORG TENANT ISOLATED)
   */
  async getAttendees(
    actor: AuthContext,
    query: {
      eventId?: string;
      search?: string;
      genre?: string;
      firstTxnDate?: string;
      lastTxnDate?: string;
      sortBy?: 'lastTxn' | 'totalSpend' | 'totalTxns';
      limit?: number;
    },
  ): Promise<OrganizerAttendeeDto[]> {
    const orgId = await this.getUserOrganizerOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'event.view_analytics');

    // 1. Resolve Organizer Event IDs
    let orgEvents = await this.db.db
      .select({ id: events.id, title: events.title })
      .from(events)
      .where(eq(events.organizerOrganizationId, orgId))
      .execute();

    if (query.eventId) {
      orgEvents = orgEvents.filter((e) => e.id === query.eventId);
    }

    const eventIds = orgEvents.map((e) => e.id);
    if (eventIds.length === 0) return [];

    const eventTitleMap = new Map<string, string>();
    for (const e of orgEvents) eventTitleMap.set(e.id, e.title);

    // 2. Fetch paid orders for these events
    const orderConditions: any[] = [
      inArray(orders.eventId, eventIds),
      eq(orders.status, 'paid'),
    ];

    if (query.firstTxnDate) {
      orderConditions.push(sql`${orders.createdAt} >= ${new Date(query.firstTxnDate)}`);
    }
    if (query.lastTxnDate) {
      const nextDay = new Date(query.lastTxnDate);
      nextDay.setDate(nextDay.getDate() + 1);
      orderConditions.push(sql`${orders.createdAt} <= ${nextDay}`);
    }

    const eventOrders = await this.db.db
      .select({
        order: orders,
        purchaser: users,
      })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .where(and(...orderConditions))
      .orderBy(desc(orders.createdAt))
      .execute();

    // 3. Fetch all tickets and ticket tiers for these events
    const allTickets = await this.db.db
      .select({
        ticket: tickets,
        tier: ticketTypes,
      })
      .from(tickets)
      .innerJoin(ticketTypes, eq(ticketTypes.id, tickets.ticketTypeId))
      .where(inArray(tickets.eventId, eventIds))
      .execute();

    const ticketsByOrderId = new Map<string, Array<typeof allTickets[0]>>();
    for (const item of allTickets) {
      const arr = ticketsByOrderId.get(item.ticket.orderId) ?? [];
      arr.push(item);
      ticketsByOrderId.set(item.ticket.orderId, arr);
    }

    // 4. Group by Attendee / Purchaser
    const attendeeMap = new Map<string, OrganizerAttendeeDto>();

    for (const { order, purchaser } of eventOrders) {
      const userId = purchaser?.id ?? order.userId;
      const userName = purchaser?.name ?? 'Guest Buyer';
      const userEmail = purchaser?.email ?? null;
      const userPhone = purchaser?.phone ?? null;

      // Filter by search query if provided
      if (query.search && query.search.trim()) {
        const s = query.search.toLowerCase();
        const matchesName = userName.toLowerCase().includes(s);
        const matchesEmail = userEmail ? userEmail.toLowerCase().includes(s) : false;
        const matchesPhone = userPhone ? userPhone.includes(s) : false;
        if (!matchesName && !matchesEmail && !matchesPhone) {
          continue;
        }
      }

      const orderTickets = ticketsByOrderId.get(order.id) ?? [];
      const formattedTickets = orderTickets.map((t) => ({
        ticketId: t.ticket.id,
        ticketNumber: t.ticket.ticketNumber,
        eventName: eventTitleMap.get(t.ticket.eventId) ?? 'Event',
        tierName: t.tier.name,
        priceMinor: Number(t.tier.priceMinor),
        status: t.ticket.status,
        checkedInAt: t.ticket.checkedInAt ? t.ticket.checkedInAt.toISOString() : null,
      }));

      const existing = attendeeMap.get(userId);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpendMinor += Number(order.totalMinor);
        existing.tickets.push(...formattedTickets);
        if (!existing.lastOrderAt || new Date(order.createdAt) > new Date(existing.lastOrderAt)) {
          existing.lastOrderAt = order.createdAt.toISOString();
        }
      } else {
        attendeeMap.set(userId, {
          id: userId,
          name: userName,
          email: userEmail,
          phone: userPhone,
          totalOrders: 1,
          totalSpendMinor: Number(order.totalMinor),
          lastOrderAt: order.createdAt.toISOString(),
          interestedGenres: ['Music', 'Festivals'],
          tickets: formattedTickets,
        });
      }
    }

    const list = Array.from(attendeeMap.values());

    // 5. Apply sorting
    if (query.sortBy === 'totalSpend') {
      list.sort((a, b) => b.totalSpendMinor - a.totalSpendMinor);
    } else if (query.sortBy === 'totalTxns') {
      list.sort((a, b) => b.totalOrders - a.totalOrders);
    } else {
      list.sort((a, b) => {
        const tA = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
        const tB = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
        return tB - tA;
      });
    }

    const limit = query.limit ?? 50;
    return list.slice(0, limit);
  }

  /**
   * GET PROMOTER PERFORMANCE ACROSS ORGANIZER'S EVENTS
   */
  async getPromoterPerformance(actor: AuthContext) {
    const orgId = await this.getUserOrganizerOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'event.view_analytics');

    const orgEvents = await this.db.db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.organizerOrganizationId, orgId))
      .execute();

    const eventIds = orgEvents.map((e) => e.id);
    if (eventIds.length === 0) return [];

    const campaigns = await this.db.db
      .select()
      .from(promoterCampaigns)
      .where(inArray(promoterCampaigns.eventId, eventIds))
      .execute();

    const result = [];
    for (const c of campaigns) {
      const attributions = await this.db.db
        .select({ order: orders })
        .from(referralAttributions)
        .innerJoin(orders, eq(orders.id, referralAttributions.orderId))
        .where(and(eq(referralAttributions.campaignId, c.id), eq(orders.status, 'paid')))
        .execute();

      let salesMinor = 0;
      for (const { order } of attributions) {
        salesMinor += Number(order.totalMinor);
      }

      result.push({
        id: c.id,
        name: `Promoter (${c.code})`,
        code: c.code,
        ticketsSold: attributions.length,
        salesMinor,
      });
    }

    return result;
  }

  /**
   * GET SCAN RATE & GATE-LEVEL METRICS
   */
  async getScanMetrics(actor: AuthContext, eventId?: string): Promise<OrganizerScanMetricsDto> {
    const orgId = await this.getUserOrganizerOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'event.view_analytics');

    const orgEvents = await this.db.db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.organizerOrganizationId, orgId))
      .execute();

    const orgEventIds = orgEvents.map((e) => e.id);
    const targetEventIds = eventId ? orgEventIds.filter((id) => id === eventId) : orgEventIds;

    if (targetEventIds.length === 0) {
      return {
        eventId: eventId ?? 'all',
        totalTicketsIssued: 0,
        totalCheckedIn: 0,
        checkinPercentage: 0,
        gatesBreakdown: [],
      };
    }

    const [issued] = await this.db.db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(inArray(tickets.eventId, targetEventIds));

    const [checkedIn] = await this.db.db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(and(inArray(tickets.eventId, targetEventIds), eq(tickets.status, 'checked_in')));

    const totalIssued = Number(issued?.count ?? 0);
    const totalScanned = Number(checkedIn?.count ?? 0);
    const pct = totalIssued > 0 ? Math.round((totalScanned / totalIssued) * 100) : 0;

    const gateScans = await this.db.db
      .select({
        gateId: checkinGates.id,
        gateName: checkinGates.name,
        scans: sql<number>`count(${checkins.id})`,
      })
      .from(checkinGates)
      .leftJoin(checkins, eq(checkins.gateId, checkinGates.id))
      .where(inArray(checkinGates.eventId, targetEventIds))
      .groupBy(checkinGates.id, checkinGates.name)
      .execute();

    return {
      eventId: eventId ?? 'all',
      totalTicketsIssued: totalIssued,
      totalCheckedIn: totalScanned,
      checkinPercentage: pct,
      gatesBreakdown: gateScans.map((g) => ({
        gateId: g.gateId,
        gateName: g.gateName,
        scansCount: Number(g.scans),
      })),
    };
  }

  /**
   * EXPORT ATTENDEES CSV (SANITIZED HEADERS & ENCODING)
   */
  async exportAttendeesCsv(actor: AuthContext, eventId?: string): Promise<string> {
    const attendees = await this.getAttendees(actor, { eventId, limit: 10000 });

    const escapeCsv = (str: string | null | undefined) => {
      if (str === null || str === undefined) return '""';
      const escaped = String(str).replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const headers = [
      'Name',
      'Email',
      'Contact',
      'Total Transactions',
      'Total Spend (INR)',
      'Last Transaction Date',
      'Tickets Count',
    ];

    const rows = attendees.map((a) => [
      escapeCsv(a.name),
      escapeCsv(a.email ?? 'N/A'),
      escapeCsv(a.phone ?? 'N/A'),
      a.totalOrders,
      (a.totalSpendMinor / 100).toFixed(2),
      escapeCsv(a.lastOrderAt ? a.lastOrderAt.split('T')[0] : 'N/A'),
      a.tickets.length,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    return csvContent;
  }
}
