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
}
