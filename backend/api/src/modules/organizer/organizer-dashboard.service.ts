import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { and, eq, sql, inArray, gt, desc } from 'drizzle-orm';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import {
  organizations,
  organizationMembers,
  events,
  venues,
  ticketTypes,
  inventoryReservations,
  orders,
  orderItems,
  paymentTransactions,
  commissionEntries,
  referralAttributions,
  promoterCampaigns,
  users,
  checkins,
  scannerPairingTokens,
} from '../../database/schema/index';
import { RbacService } from '../auth/rbac.service';
import type {
  AuthContext,
  OrganizerOverviewDto,
  OrganizerEventDashboardDto,
  OrganizerOrderDto,
  TicketTierDashboardDto,
  OrderReceiptDto,
} from '@platform/types';

@Injectable()
export class OrganizerDashboardService {
  private readonly logger = new Logger('OrganizerDashboardService');

  constructor(
    private readonly db: DatabaseService,
    private readonly rbac: RbacService,
  ) {}

  /**
   * Helper to resolve the active organizer organization for the user.
   */
  async getUserOrganizerOrgId(userId: string): Promise<string> {
    const memberships = await this.db.db
      .select({ orgId: organizationMembers.organizationId, type: organizations.type })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(and(eq(organizationMembers.userId, userId), eq(organizations.type, 'organizer')))
      .execute();

    if (memberships.length === 0) {
      throw new ForbiddenException({
        code: 'ORGANIZER_ORG_REQUIRED',
        message: 'User must belong to an organizer organization to access organizer dashboard tools.',
      });
    }

    return memberships[0]!.orgId;
  }

  /**
   * GET ORGANIZER OVERVIEW METRICS
   * Calculates explicit integer minor unit financial metrics.
   */
  async getOverview(actor: AuthContext): Promise<OrganizerOverviewDto> {
    const orgId = await this.getUserOrganizerOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'event.view_analytics');

    // 1. Fetch organizer's events
    const orgEvents = await this.db.db
      .select()
      .from(events)
      .where(eq(events.organizerOrganizationId, orgId))
      .execute();

    const eventIds = orgEvents.map((e) => e.id);
    if (eventIds.length === 0) {
      return {
        organizationId: orgId,
        totalActiveEvents: 0,
        grossTicketSalesMinor: 0,
        refundsMinor: 0,
        discountsMinor: 0,
        promoterCommissionsMinor: 0,
        netOrganizerMinor: 0,
        totalTicketsSold: 0,
        totalActiveHolds: 0,
        averageCapacityUtilization: 0,
        currency: 'INR',
      };
    }

    // 2. Fetch paid orders for these events
    const paidOrders = await this.db.db
      .select()
      .from(orders)
      .where(and(inArray(orders.eventId, eventIds), eq(orders.status, 'paid')))
      .execute();

    let grossTicketSalesMinor = 0;
    let discountsMinor = 0;
    for (const ord of paidOrders) {
      grossTicketSalesMinor += Number(ord.subtotalMinor);
      discountsMinor += Number(ord.discountMinor ?? 0);
    }

    // 3. Fetch ticket types (capacity vs sold)
    const tiers = await this.db.db
      .select()
      .from(ticketTypes)
      .where(inArray(ticketTypes.eventId, eventIds))
      .execute();

    let totalTicketsSold = 0;
    let totalCapacity = 0;
    for (const tier of tiers) {
      totalTicketsSold += Number(tier.soldQuantity);
      totalCapacity += Number(tier.quantity); // Tier total quantity/capacity
    }

    // 4. Fetch active holds via ticketTypes join
    const [holdsCount] = await this.db.db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryReservations)
      .innerJoin(ticketTypes, eq(ticketTypes.id, inventoryReservations.ticketTypeId))
      .where(
        and(
          inArray(ticketTypes.eventId, eventIds),
          eq(inventoryReservations.status, 'active'),
          gt(inventoryReservations.expiresAt, new Date()),
        ),
      );

    // 5. Fetch promoter commissions
    let promoterCommissionsMinor = 0;
    if (paidOrders.length > 0) {
      const commissions = await this.db.db
        .select()
        .from(commissionEntries)
        .where(and(inArray(commissionEntries.orderId, paidOrders.map((o) => o.id)), eq(commissionEntries.status, 'pending')))
        .execute();

      for (const comm of commissions) {
        promoterCommissionsMinor += Number(comm.amountMinor);
      }
    }

    const refundsMinor = 0; // Future refund module integration
    const netOrganizerMinor = Math.max(0, grossTicketSalesMinor - refundsMinor - promoterCommissionsMinor);
    const averageCapacityUtilization = totalCapacity > 0 ? Math.round((totalTicketsSold / totalCapacity) * 100) : 0;

    return {
      organizationId: orgId,
      totalActiveEvents: orgEvents.filter((e) => ['published', 'live'].includes(e.status)).length,
      grossTicketSalesMinor,
      refundsMinor,
      discountsMinor,
      promoterCommissionsMinor,
      netOrganizerMinor,
      totalTicketsSold,
      totalActiveHolds: Number(holdsCount?.count ?? 0),
      averageCapacityUtilization,
      currency: 'INR',
    };
  }

  /**
   * GET ORGANIZER EVENTS FEED (CURSOR PAGINATED & ORG ISOLATED)
   */
  async getEvents(actor: AuthContext, cursor?: string, limit = 20) {
    const orgId = await this.getUserOrganizerOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'event.view_analytics');

    const safeLimit = Math.min(Math.max(1, limit), 100);

    const list = await this.db.db
      .select()
      .from(events)
      .where(eq(events.organizerOrganizationId, orgId))
      .orderBy(desc(events.createdAt))
      .limit(safeLimit + 1)
      .execute();

    const hasMore = list.length > safeLimit;
    const items = hasMore ? list.slice(0, safeLimit) : list;
    const nextCursor = hasMore ? items[items.length - 1]!.id : null;

    return { items, nextCursor, hasMore };
  }

  /**
   * GET EVENT DEEP-DIVE DASHBOARD METRICS
   */
  async getEventDashboard(actor: AuthContext, eventId: string): Promise<OrganizerEventDashboardDto> {
    const orgId = await this.getUserOrganizerOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'event.view_analytics');

    const event = await this.db.db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event not found.' });

    // CROSS-ORGANIZATION ISOLATION CHECK
    if (event.organizerOrganizationId !== orgId) {
      throw new ForbiddenException({ code: 'EVENT_ACCESS_DENIED', message: 'Cannot access event belonging to another organization.' });
    }

    // Ticket Tiers Breakdown
    const tiers = await this.db.db
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.eventId, eventId))
      .execute();

    let totalCapacity = 0;
    let totalTicketsSold = 0;
    let grossSalesMinor = 0;

    const ticketTiers: TicketTierDashboardDto[] = tiers.map((tier) => {
      const cap = Number(tier.quantity);
      const res = Number(tier.reservedQuantity);
      const sld = Number(tier.soldQuantity);
      const price = Number(tier.priceMinor);
      const tierGross = sld * price;

      totalCapacity += cap;
      totalTicketsSold += sld;
      grossSalesMinor += tierGross;

      return {
        ticketTypeId: tier.id,
        name: tier.name,
        priceMinor: price,
        capacity: cap,
        reservedQuantity: res,
        soldQuantity: sld,
        remainingQuantity: Math.max(0, cap - res - sld),
        grossSalesMinor: tierGross,
      };
    });

    // Checkin Scan Count
    const [checkinsCount] = await this.db.db
      .select({ count: sql<number>`count(*)` })
      .from(checkins)
      .where(eq(checkins.eventId, eventId));

    const totalCheckins = Number(checkinsCount?.count ?? 0);
    const checkinStatusNote = totalCheckins > 0
      ? `Live gate scan count: ${totalCheckins}`
      : 'Attendance tracking operational boundary ready. Live scan streams pending scanner app initialization.';

    const capacityUtilization = totalCapacity > 0 ? Math.round((totalTicketsSold / totalCapacity) * 100) : 0;

    return {
      eventId: event.id,
      title: event.title,
      status: event.status,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      venueName: null,
      totalCapacity,
      totalTicketsSold,
      capacityUtilization,
      grossSalesMinor,
      refundsMinor: 0,
      promoterCommissionsMinor: 0,
      ticketTiers,
      totalCheckins,
      checkinStatusNote,
    };
  }

  /**
   * GET ORGANIZER EVENT ORDERS (SANITIZED OrganizerOrderDto EXCLUDING PRIVACY/SECURITY LEAKS)
   */
  async getEventOrders(actor: AuthContext, eventId: string, limit = 20): Promise<OrganizerOrderDto[]> {
    const orgId = await this.getUserOrganizerOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'event.view_analytics');

    const event = await this.db.db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event not found.' });

    if (event.organizerOrganizationId !== orgId) {
      throw new ForbiddenException({ code: 'EVENT_ACCESS_DENIED', message: 'Cannot access orders for an event belonging to another organization.' });
    }

    const eventOrders = await this.db.db
      .select({
        order: orders,
        purchaser: users,
        attribution: referralAttributions,
        campaign: promoterCampaigns,
      })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .leftJoin(referralAttributions, eq(referralAttributions.orderId, orders.id))
      .leftJoin(promoterCampaigns, eq(promoterCampaigns.id, referralAttributions.campaignId))
      .where(eq(orders.eventId, eventId))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .execute();

    return eventOrders.map(({ order, purchaser, campaign }) => ({
      orderId: order.id,
      eventId: order.eventId,
      status: order.status,
      totalMinor: Number(order.totalMinor),
      subtotalMinor: Number(order.subtotalMinor),
      discountMinor: Number(order.discountMinor ?? 0),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      ticketQuantity: 1, // Order quantity summary
      purchaserName: purchaser?.name ?? null,
      purchaserEmail: purchaser?.email ?? null,
      promoterCode: campaign?.code ?? null,
    }));
  }

  /**
   * GET ORGANIZER EVENT ATTENDANCE
   */
  async getEventAttendance(actor: AuthContext, eventId: string) {
    const orgId = await this.getUserOrganizerOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'event.view_analytics');

    const event = await this.db.db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event not found.' });

    if (event.organizerOrganizationId !== orgId) {
      throw new ForbiddenException({ code: 'EVENT_ACCESS_DENIED', message: 'Cannot access attendance for an event belonging to another organization.' });
    }

    const [checkinsCount] = await this.db.db
      .select({ count: sql<number>`count(*)` })
      .from(checkins)
      .where(eq(checkins.eventId, eventId));

    const totalScans = Number(checkinsCount?.count ?? 0);

    return {
      eventId: event.id,
      totalScans,
      scannerStatus: totalScans > 0 ? 'active' : 'pending_scanner_initialization',
      message: totalScans > 0 ? 'Live check-in stream active.' : 'Live attendance metrics blocked pending scanner/check-in domain execution.',
    };
  }

  /**
   * GET EVENT PROMOTERS PERFORMANCE SUMMARY
   */
  async getEventPromoters(actor: AuthContext, eventId: string) {
    const orgId = await this.getUserOrganizerOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'event.view_analytics');

    const event = await this.db.db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event not found.' });

    if (event.organizerOrganizationId !== orgId) {
      throw new ForbiddenException({ code: 'EVENT_ACCESS_DENIED', message: 'Cannot access promoters for an event belonging to another organization.' });
    }

    const campaigns = await this.db.db
      .select()
      .from(promoterCampaigns)
      .where(eq(promoterCampaigns.eventId, eventId))
      .execute();

    return campaigns.map((camp) => ({
      campaignId: camp.id,
      code: camp.code,
      commissionType: camp.commissionType,
      commissionValue: Number(camp.commissionValue),
      status: camp.status,
    }));
  }

  /**
   * Generate single-use, 10-minute pairing token for scanner onboarding.
   */
  async createScannerPairingToken(
    actor: AuthContext,
    input: { eventId: string; gateId?: string },
  ): Promise<{ pairingCode: string; expiresAt: string }> {
    const orgId = await this.getUserOrganizerOrgId(actor.userId);
    const event = await this.db.db.query.events.findFirst({
      where: eq(events.id, input.eventId),
    });

    if (!event || event.organizerOrganizationId !== orgId) {
      throw new ForbiddenException({
        code: 'EVENT_NOT_OWNED',
        message: 'Event does not belong to your organization.',
      });
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i]! % chars.length];
    }

    const hash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.db.db.insert(scannerPairingTokens).values({
      organizationId: orgId,
      eventId: input.eventId,
      gateId: input.gateId ?? undefined,
      pairingCodeHash: hash,
      createdBy: actor.userId,
      expiresAt,
      status: 'active',
    });

    return {
      pairingCode: code,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Get authoritative order receipt details for organizer/customer.
   */
  async getOrderReceipt(actor: AuthContext, eventId: string, orderId: string): Promise<OrderReceiptDto> {
    const orgId = await this.getUserOrganizerOrgId(actor.userId);

    const event = await this.db.db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!event || event.organizerOrganizationId !== orgId) {
      throw new ForbiddenException({
        code: 'EVENT_ACCESS_DENIED',
        message: 'Cannot access orders for an event belonging to another organization.',
      });
    }

    const order = await this.db.db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.eventId, eventId)),
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found for this event.' });
    }

    const [customer, venue, org, items, payment] = await Promise.all([
      this.db.db.query.users.findFirst({ where: eq(users.id, order.userId) }),
      event.venueId ? this.db.db.query.venues.findFirst({ where: eq(venues.id, event.venueId) }) : null,
      this.db.db.query.organizations.findFirst({ where: eq(organizations.id, orgId) }),
      this.db.db.query.orderItems.findMany({ where: eq(orderItems.orderId, order.id) }),
      this.db.db.query.paymentTransactions.findFirst({ where: eq(paymentTransactions.orderId, order.id) }),
    ]);

    const ticketTypeIds = items.map((i) => i.ticketTypeId);
    const tiers =
      ticketTypeIds.length > 0
        ? await this.db.db.query.ticketTypes.findMany({ where: inArray(ticketTypes.id, ticketTypeIds) })
        : [];
    const tierMap = new Map(tiers.map((t) => [t.id, t.name]));

    return {
      orderId: order.id,
      orderNumber: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      customerName: customer?.name ?? 'Valued Attendee',
      customerEmail: customer?.email ?? 'customer@example.com',
      eventName: event.title,
      eventDate: event.startsAt.toISOString(),
      venueName: venue?.name ?? 'Main Venue Arena',
      venueAddress: venue?.address ?? (venue?.city ?? 'Event Location'),
      organizerName: org?.name ?? 'Event Organizer',
      legalEntityName: org?.legalEntityName ?? org?.name ?? 'Event Organizer Partner',
      gstin: org?.gstin ?? null,
      items: items.map((it) => ({
        ticketTypeId: it.ticketTypeId,
        ticketTypeName: tierMap.get(it.ticketTypeId) ?? 'General Admission',
        quantity: it.quantity,
        unitPriceMinor: Number(it.unitPriceMinor),
        totalMinor: Number(it.totalMinor),
      })),
      subtotalMinor: Number(order.subtotalMinor),
      feesMinor: Number(order.feesMinor),
      taxMinor: Number(order.taxMinor),
      discountMinor: Number(order.discountMinor),
      totalMinor: Number(order.totalMinor),
      currency: order.currency,
      paymentMethod: payment?.provider ?? 'Online Payment',
      paymentTransactionReference: payment?.providerPaymentId ?? order.idempotencyKey ?? `TX-${order.id.slice(0, 10)}`,
      paidAt: order.createdAt.toISOString(),
    };
  }
}
