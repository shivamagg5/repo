import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { and, eq, desc } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  organizations,
  organizationMembers,
  venues,
  events,
} from '../../database/schema/index';
import { RbacService } from '../auth/rbac.service';
import type {
  AuthContext,
  VenueProfileDto,
  VenueCalendarDto,
  VenueCalendarEventDto,
} from '@platform/types';

@Injectable()
export class VenueDashboardService {
  private readonly logger = new Logger('VenueDashboardService');

  constructor(
    private readonly db: DatabaseService,
    private readonly rbac: RbacService,
  ) {}

  /**
   * Helper to resolve active venue organization for the user.
   */
  async getUserVenueOrgId(userId: string): Promise<string> {
    const memberships = await this.db.db
      .select({ orgId: organizationMembers.organizationId, type: organizations.type })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(and(eq(organizationMembers.userId, userId), eq(organizations.type, 'venue')))
      .execute();

    if (memberships.length === 0) {
      throw new ForbiddenException({
        code: 'VENUE_ORG_REQUIRED',
        message: 'User must belong to a venue organization to access venue dashboard tools.',
      });
    }

    return memberships[0]!.orgId;
  }

  /**
   * GET VENUE PROFILE (VENUE OWNERSHIP ISOLATED)
   */
  async getProfile(actor: AuthContext): Promise<VenueProfileDto> {
    const orgId = await this.getUserVenueOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'venue.view_analytics');

    const venue = await this.db.db.query.venues.findFirst({
      where: eq(venues.organizationId, orgId),
    });

    if (!venue) {
      // Auto-provision placeholder venue record if organization profile exists
      const org = await this.db.db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
      const [created] = await this.db.db
        .insert(venues)
        .values({
          organizationId: orgId,
          name: org?.name ?? 'Main Venue',
          slug: (org?.slug ?? 'main-venue') + '-v',
          capacity: 1000,
          status: 'active',
        })
        .returning();

      return {
        id: created!.id,
        organizationId: created!.organizationId,
        name: created!.name,
        slug: created!.slug,
        address: created!.address,
        city: created!.city,
        state: created!.state,
        country: created!.country,
        postalCode: null,
        capacity: created!.capacity,
        status: created!.status,
      };
    }

    return {
      id: venue.id,
      organizationId: venue.organizationId,
      name: venue.name,
      slug: venue.slug,
      address: venue.address,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      postalCode: null,
      capacity: venue.capacity,
      status: venue.status,
    };
  }

  /**
   * UPDATE VENUE PROFILE (CLIENT CANNOT OVERRIDE ORG ID OR STATUS)
   */
  async updateProfile(actor: AuthContext, input: Partial<VenueProfileDto>): Promise<VenueProfileDto> {
    const orgId = await this.getUserVenueOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'venue.edit');

    const existing = await this.getProfile(actor);

    const [updated] = await this.db.db
      .update(venues)
      .set({
        name: input.name ?? existing.name,
        address: input.address ?? existing.address,
        city: input.city ?? existing.city,
        state: input.state ?? existing.state,
        country: input.country ?? existing.country,
        capacity: input.capacity !== undefined ? input.capacity : existing.capacity,
        updatedAt: new Date(),
      })
      .where(eq(venues.id, existing.id))
      .returning();

    return {
      id: updated!.id,
      organizationId: updated!.organizationId,
      name: updated!.name,
      slug: updated!.slug,
      address: updated!.address,
      city: updated!.city,
      state: updated!.state,
      country: updated!.country,
      postalCode: null,
      capacity: updated!.capacity,
      status: updated!.status,
    };
  }

  /**
   * GET VENUE BOOKING CALENDAR (UPCOMING EVENTS & CONFLICT CHECKS)
   */
  async getCalendar(actor: AuthContext): Promise<VenueCalendarDto> {
    const orgId = await this.getUserVenueOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'venue.view_analytics');

    const profile = await this.getProfile(actor);

    // Fetch events assigned to this venue
    const hostedEvents = await this.db.db
      .select({
        event: events,
        organizer: organizations,
      })
      .from(events)
      .innerJoin(organizations, eq(organizations.id, events.organizerOrganizationId))
      .where(eq(events.venueId, profile.id))
      .orderBy(events.startsAt)
      .execute();

    const calendarEvents: VenueCalendarEventDto[] = hostedEvents.map(({ event, organizer }) => ({
      eventId: event.id,
      eventTitle: event.title,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      status: event.status,
      organizerName: organizer.name,
    }));

    return {
      venueId: profile.id,
      venueName: profile.name,
      timezone: 'Asia/Kolkata', // Default canonical timezone
      events: calendarEvents,
    };
  }

  /**
   * GET HOSTED EVENTS FEED WITH OCCUPANCY METRICS
   */
  async getEvents(actor: AuthContext) {
    const orgId = await this.getUserVenueOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'venue.view_analytics');

    const profile = await this.getProfile(actor);

    const hostedEvents = await this.db.db
      .select()
      .from(events)
      .where(eq(events.venueId, profile.id))
      .orderBy(desc(events.startsAt))
      .execute();

    return hostedEvents.map((e) => ({
      eventId: e.id,
      title: e.title,
      status: e.status,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
    }));
  }

  /**
   * VIP TABLES & BOTTLE SERVICE FLOORPLAN MANAGEMENT
   */
  private readonly tableStore = new Map<string, any>([
    [
      'tbl-stage-01',
      {
        id: 'tbl-stage-01',
        tableNumber: 'VIP 1',
        zone: 'STAGE_VIP',
        capacity: 10,
        minSpend: 150000,
        currentSpend: 165000,
        status: 'OCCUPIED',
        guestName: 'Arjun Singhania',
        guestPhone: '+91 98201 11223',
        partySize: 8,
        serverName: 'Vikram (Lead Host)',
        reservedTime: '10:30 PM',
        bottleOrders: ['Dom Pérignon Luminous x 2', 'Clase Azul Reposado x 1', 'Belvedere 1.5L x 1'],
        x: 22,
        y: 18,
      },
    ],
    [
      'tbl-stage-02',
      {
        id: 'tbl-stage-02',
        tableNumber: 'VIP 2',
        zone: 'STAGE_VIP',
        capacity: 12,
        minSpend: 200000,
        currentSpend: 185000,
        status: 'OCCUPIED',
        guestName: 'Kabir Oberoi',
        guestPhone: '+91 98110 33445',
        partySize: 11,
        serverName: 'Neha (VIP Host)',
        reservedTime: '11:00 PM',
        bottleOrders: ['Ace of Spades Gold x 2', 'Macallan 18yr x 1'],
        x: 50,
        y: 14,
      },
    ],
    [
      'tbl-stage-03',
      {
        id: 'tbl-stage-03',
        tableNumber: 'VIP 3',
        zone: 'STAGE_VIP',
        capacity: 10,
        minSpend: 150000,
        currentSpend: 0,
        status: 'RESERVED',
        guestName: 'Dr. Rohan Mehta',
        guestPhone: '+91 98212 99887',
        partySize: 6,
        serverName: 'Vikram (Lead Host)',
        reservedTime: '11:30 PM',
        bottleOrders: ['Pre-ordered: Don Julio 1942 x 1'],
        x: 78,
        y: 18,
      },
    ],
    [
      'tbl-df-01',
      {
        id: 'tbl-df-01',
        tableNumber: 'DF 1',
        zone: 'DANCEFLOOR',
        capacity: 6,
        minSpend: 60000,
        currentSpend: 72000,
        status: 'OCCUPIED',
        guestName: 'Ananya Roy',
        guestPhone: '+91 99201 44556',
        partySize: 6,
        serverName: 'Rahul',
        reservedTime: '10:00 PM',
        bottleOrders: ['Grey Goose 750ml x 2', 'Moët & Chandon x 1'],
        x: 20,
        y: 45,
      },
    ],
    [
      'tbl-df-02',
      {
        id: 'tbl-df-02',
        tableNumber: 'DF 2',
        zone: 'DANCEFLOOR',
        capacity: 6,
        minSpend: 60000,
        currentSpend: 0,
        status: 'AVAILABLE',
        serverName: 'Rahul',
        bottleOrders: [],
        x: 38,
        y: 48,
      },
    ],
    [
      'tbl-df-03',
      {
        id: 'tbl-df-03',
        tableNumber: 'DF 3',
        zone: 'DANCEFLOOR',
        capacity: 6,
        minSpend: 60000,
        currentSpend: 60000,
        status: 'RESERVED',
        guestName: 'Siddharth V.',
        guestPhone: '+91 97690 12345',
        partySize: 5,
        serverName: 'Kunal',
        reservedTime: '11:15 PM',
        bottleOrders: ['Pre-ordered: Hendrick’s Gin x 1', 'Jagermeister x 1'],
        x: 62,
        y: 48,
      },
    ],
    [
      'tbl-df-04',
      {
        id: 'tbl-df-04',
        tableNumber: 'DF 4',
        zone: 'DANCEFLOOR',
        capacity: 6,
        minSpend: 60000,
        currentSpend: 0,
        status: 'AVAILABLE',
        serverName: 'Kunal',
        bottleOrders: [],
        x: 80,
        y: 45,
      },
    ],
    [
      'tbl-mez-01',
      {
        id: 'tbl-mez-01',
        tableNumber: 'M 1',
        zone: 'MEZZANINE',
        capacity: 8,
        minSpend: 80000,
        currentSpend: 95000,
        status: 'OCCUPIED',
        guestName: 'Tanvi Khanna',
        guestPhone: '+91 98205 66778',
        partySize: 7,
        serverName: 'Rhea',
        reservedTime: '10:15 PM',
        bottleOrders: ['Veuve Clicquot x 2', 'Tequila Casamigos x 1'],
        x: 18,
        y: 72,
      },
    ],
    [
      'tbl-mez-02',
      {
        id: 'tbl-mez-02',
        tableNumber: 'M 2',
        zone: 'MEZZANINE',
        capacity: 8,
        minSpend: 80000,
        currentSpend: 0,
        status: 'AVAILABLE',
        serverName: 'Rhea',
        bottleOrders: [],
        x: 40,
        y: 74,
      },
    ],
    [
      'tbl-mez-03',
      {
        id: 'tbl-mez-03',
        tableNumber: 'M 3',
        zone: 'MEZZANINE',
        capacity: 8,
        minSpend: 80000,
        currentSpend: 82000,
        status: 'OCCUPIED',
        guestName: 'Deepak Chopra',
        guestPhone: '+91 98209 11111',
        partySize: 8,
        serverName: 'Sameer',
        reservedTime: '10:45 PM',
        bottleOrders: ['Blue Label x 1', 'Moët Rosé x 1'],
        x: 60,
        y: 74,
      },
    ],
    [
      'tbl-mez-04',
      {
        id: 'tbl-mez-04',
        tableNumber: 'M 4',
        zone: 'MEZZANINE',
        capacity: 8,
        minSpend: 80000,
        currentSpend: 0,
        status: 'RESERVED',
        guestName: 'Priya Malhotra',
        guestPhone: '+91 98190 22334',
        partySize: 6,
        serverName: 'Sameer',
        reservedTime: '11:45 PM',
        bottleOrders: ['Pre-ordered: Grey Goose 1L x 1'],
        x: 82,
        y: 72,
      },
    ],
    [
      'tbl-ter-01',
      {
        id: 'tbl-ter-01',
        tableNumber: 'T 1',
        zone: 'TERRACE',
        capacity: 4,
        minSpend: 35000,
        currentSpend: 42000,
        status: 'OCCUPIED',
        guestName: 'Zoya Akhtar',
        guestPhone: '+91 98200 44332',
        partySize: 4,
        serverName: 'Farhan',
        reservedTime: '09:45 PM',
        bottleOrders: ['Chandon Brut x 2', 'Bombay Sapphire x 1'],
        x: 30,
        y: 92,
      },
    ],
    [
      'tbl-ter-02',
      {
        id: 'tbl-ter-02',
        tableNumber: 'T 2',
        zone: 'TERRACE',
        capacity: 4,
        minSpend: 35000,
        currentSpend: 0,
        status: 'AVAILABLE',
        serverName: 'Farhan',
        bottleOrders: [],
        x: 50,
        y: 92,
      },
    ],
    [
      'tbl-ter-03',
      {
        id: 'tbl-ter-03',
        tableNumber: 'T 3',
        zone: 'TERRACE',
        capacity: 4,
        minSpend: 35000,
        currentSpend: 0,
        status: 'AVAILABLE',
        serverName: 'Farhan',
        bottleOrders: [],
        x: 70,
        y: 92,
      },
    ],
  ]);

  async getTables(actor: AuthContext) {
    const orgId = await this.getUserVenueOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'venue.view_analytics');
    return Array.from(this.tableStore.values());
  }

  async updateTable(actor: AuthContext, tableId: string, input: any) {
    const orgId = await this.getUserVenueOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'venue.edit');

    const table = this.tableStore.get(tableId);
    if (!table) {
      throw new NotFoundException({ code: 'TABLE_NOT_FOUND', message: `Table ${tableId} not found.` });
    }

    const updated = {
      ...table,
      ...input,
      id: tableId,
      tableNumber: table.tableNumber,
      zone: table.zone,
    };

    if (input.status === 'AVAILABLE') {
      updated.guestName = undefined;
      updated.guestPhone = undefined;
      updated.partySize = undefined;
      updated.reservedTime = undefined;
      updated.currentSpend = 0;
      updated.bottleOrders = [];
    }

    this.tableStore.set(tableId, updated);
    return updated;
  }

  async addBottleOrder(actor: AuthContext, tableId: string, bottleName: string, price: number = 0) {
    const orgId = await this.getUserVenueOrgId(actor.userId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'venue.edit');

    const table = this.tableStore.get(tableId);
    if (!table) {
      throw new NotFoundException({ code: 'TABLE_NOT_FOUND', message: `Table ${tableId} not found.` });
    }

    const updatedOrders = [...(table.bottleOrders || []), bottleName];
    const updatedSpend = (table.currentSpend || 0) + price;

    const updated = {
      ...table,
      bottleOrders: updatedOrders,
      currentSpend: updatedSpend,
      status: table.status === 'AVAILABLE' ? 'OCCUPIED' : table.status,
    };

    this.tableStore.set(tableId, updated);
    return updated;
  }

  async resetTable(actor: AuthContext, tableId: string) {
    return this.updateTable(actor, tableId, { status: 'AVAILABLE' });
  }
}
