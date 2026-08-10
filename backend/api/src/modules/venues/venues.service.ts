import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  venues,
  venueMedia,
  organizationMembers,
} from '../../database/schema/index';
import { AuditService } from '../../common/audit/audit.service';
import { RbacService } from '../auth/rbac.service';
import type {
  Venue,
  VenuePublic,
  CreateVenueInput,
  UpdateVenueInput,
} from '@platform/types';

@Injectable()
export class VenuesService {
  private readonly logger = new Logger('VenuesService');

  constructor(
    private readonly db: DatabaseService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a new venue owned by the user's organization.
   */
  async create(actorId: string, orgId: string, input: CreateVenueInput): Promise<Venue> {
    // 1. Verify organization membership & venue.create permission in org scope
    await this.rbac.assertOrgMembership(actorId, orgId);
    await this.rbac.assertPermissionInOrg(actorId, orgId, 'venue.create');

    // 2. Check slug uniqueness
    const existing = await this.db.db.query.venues.findFirst({
      where: eq(venues.slug, input.slug),
    });
    if (existing) {
      throw new ConflictException({
        code: 'SLUG_TAKEN',
        message: `Venue slug "${input.slug}" is already in use.`,
      });
    }

    // 3. Insert venue
    const [venue] = await this.db.db
      .insert(venues)
      .values({
        organizationId: orgId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        country: input.country ?? 'IN',
        latitude: input.latitude ? String(input.latitude) : null,
        longitude: input.longitude ? String(input.longitude) : null,
        capacity: input.capacity ?? null,
        status: 'active',
      })
      .returning();

    if (!venue) throw new Error('Venue creation failed');

    // 4. Audit event
    this.audit.log({
      actorUserId: actorId,
      action: 'venue.created',
      category: 'organization',
      entityType: 'venue',
      entityId: venue.id,
      metadata: { orgId, name: venue.name, slug: venue.slug },
    });

    return this.toVenue(venue);
  }

  /**
   * Update an existing venue.
   */
  async update(
    actorId: string,
    venueId: string,
    input: UpdateVenueInput,
  ): Promise<Venue> {
    const venue = await this.db.db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    });
    if (!venue) {
      throw new NotFoundException({ code: 'VENUE_NOT_FOUND', message: 'Venue not found.' });
    }

    // Security: Verify user is a member of the venue's owning organization & has permission
    await this.rbac.assertOrgMembership(actorId, venue.organizationId);
    await this.rbac.assertPermissionInOrg(actorId, venue.organizationId, 'venue.edit');

    const [updated] = await this.db.db
      .update(venues)
      .set({
        name: input.name ?? venue.name,
        description: input.description !== undefined ? input.description : venue.description,
        address: input.address !== undefined ? input.address : venue.address,
        city: input.city !== undefined ? input.city : venue.city,
        state: input.state !== undefined ? input.state : venue.state,
        country: input.country !== undefined ? input.country : venue.country,
        latitude: input.latitude !== undefined ? (input.latitude ? String(input.latitude) : null) : venue.latitude,
        longitude: input.longitude !== undefined ? (input.longitude ? String(input.longitude) : null) : venue.longitude,
        capacity: input.capacity !== undefined ? input.capacity : venue.capacity,
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venueId))
      .returning();

    this.audit.log({
      actorUserId: actorId,
      action: 'venue.updated',
      category: 'organization',
      entityType: 'venue',
      entityId: venueId,
      metadata: { changes: input },
    });

    return this.toVenue(updated!);
  }

  /**
   * Find venue by ID for organization member.
   */
  async findOne(actorId: string, venueId: string): Promise<Venue> {
    const venue = await this.db.db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    });
    if (!venue) {
      throw new NotFoundException({ code: 'VENUE_NOT_FOUND', message: 'Venue not found.' });
    }

    await this.rbac.assertOrgMembership(actorId, venue.organizationId);
    return this.toVenue(venue);
  }

  /**
   * List venues owned by user's organization.
   */
  async findMyVenues(actorId: string, orgId: string): Promise<Venue[]> {
    await this.rbac.assertOrgMembership(actorId, orgId);

    const list = await this.db.db
      .select()
      .from(venues)
      .where(eq(venues.organizationId, orgId))
      .execute();

    return list.map((v) => this.toVenue(v));
  }

  /**
   * Add media to a venue.
   */
  async addMedia(actorId: string, venueId: string, media: { url: string; type?: string; sortOrder?: number }) {
    const venue = await this.db.db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    });
    if (!venue) throw new NotFoundException({ code: 'VENUE_NOT_FOUND' });

    await this.rbac.assertOrgMembership(actorId, venue.organizationId);
    await this.rbac.assertPermissionInOrg(actorId, venue.organizationId, 'venue.edit');

    const [created] = await this.db.db
      .insert(venueMedia)
      .values({
        venueId,
        url: media.url,
        type: media.type ?? 'image',
        sortOrder: media.sortOrder ?? 0,
      })
      .returning();

    return created;
  }

  /**
   * Delete media from a venue.
   */
  async deleteMedia(actorId: string, venueId: string, mediaId: string): Promise<void> {
    const venue = await this.db.db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    });
    if (!venue) throw new NotFoundException({ code: 'VENUE_NOT_FOUND' });

    await this.rbac.assertOrgMembership(actorId, venue.organizationId);
    await this.rbac.assertPermissionInOrg(actorId, venue.organizationId, 'venue.edit');

    await this.db.db
      .delete(venueMedia)
      .where(and(eq(venueMedia.id, mediaId), eq(venueMedia.venueId, venueId)));
  }

  /**
   * Public discovery — List active venues.
   */
  async findPublicVenues(page = 1, limit = 20): Promise<VenuePublic[]> {
    const offset = (page - 1) * limit;
    const list = await this.db.db
      .select()
      .from(venues)
      .where(eq(venues.status, 'active'))
      .limit(limit)
      .offset(offset)
      .execute();

    return list.map((v) => this.toVenuePublic(v));
  }

  /**
   * Public discovery — Find public venue by slug.
   */
  async findPublicVenueBySlug(slug: string): Promise<VenuePublic> {
    const venue = await this.db.db.query.venues.findFirst({
      where: and(eq(venues.slug, slug), eq(venues.status, 'active')),
    });
    if (!venue) {
      throw new NotFoundException({ code: 'VENUE_NOT_FOUND', message: 'Venue not found or inactive.' });
    }

    const media = await this.db.db
      .select()
      .from(venueMedia)
      .where(eq(venueMedia.venueId, venue.id))
      .execute();

    return {
      ...this.toVenuePublic(venue),
      media: media.map((m) => ({
        id: m.id,
        venueId: m.venueId,
        url: m.url,
        type: m.type,
        sortOrder: m.sortOrder,
      })),
    };
  }

  private toVenue(v: typeof venues.$inferSelect): Venue {
    return {
      id: v.id,
      organizationId: v.organizationId,
      name: v.name,
      slug: v.slug,
      description: v.description,
      address: v.address,
      city: v.city,
      state: v.state,
      country: v.country,
      latitude: v.latitude,
      longitude: v.longitude,
      capacity: v.capacity,
      status: v.status,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    };
  }

  private toVenuePublic(v: typeof venues.$inferSelect): VenuePublic {
    return {
      id: v.id,
      name: v.name,
      slug: v.slug,
      description: v.description,
      address: v.address,
      city: v.city,
      state: v.state,
      country: v.country,
      latitude: v.latitude,
      longitude: v.longitude,
      capacity: v.capacity,
    };
  }
}
