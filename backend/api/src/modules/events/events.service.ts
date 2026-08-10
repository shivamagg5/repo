import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  events,
  eventCategories,
  eventMedia,
  eventLineups,
  venues,
} from '../../database/schema/index';
import { AuditService } from '../../common/audit/audit.service';
import { RbacService } from '../auth/rbac.service';
import { EventStateMachineService } from './event-state-machine.service';
import { SearchService } from '../discovery/search.service';
import type {
  Event,
  EventListItemDto,
  EventDetailPublicDto,
  CursorPaginatedResponse,
  EventCategory,
  CreateEventInput,
  UpdateEventInput,
  ReviewEventInput,
  AuthContext,
  EventStatus,
} from '@platform/types';

@Injectable()
export class EventsService {
  private readonly logger = new Logger('EventsService');

  constructor(
    private readonly db: DatabaseService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly stateMachine: EventStateMachineService,
    private readonly searchService: SearchService,
  ) {}

  /**
   * Create a new event in DRAFT status.
   */
  async create(actor: AuthContext, orgId: string, input: CreateEventInput): Promise<Event> {
    // 1. Verify organization membership & event.create permission in org scope
    await this.rbac.assertOrgMembership(actor.userId, orgId);
    await this.rbac.assertPermissionInOrg(actor.userId, orgId, 'event.create');

    // 2. Slug uniqueness check
    const existing = await this.db.db.query.events.findFirst({
      where: eq(events.slug, input.slug),
    });
    if (existing) {
      throw new ConflictException({
        code: 'SLUG_TAKEN',
        message: `Event slug "${input.slug}" is already in use.`,
      });
    }

    // 3. Verify venue assignment if provided
    if (input.venueId) {
      await this.assertVenueValid(input.venueId);
    }

    // 4. Verify category if provided
    if (input.categoryId) {
      await this.assertCategoryValid(input.categoryId);
    }

    // 5. Date validation
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException({
        code: 'INVALID_EVENT_DATES',
        message: 'Event end date must be after start date.',
      });
    }

    // 6. Insert event as DRAFT
    const [event] = await this.db.db
      .insert(events)
      .values({
        organizerOrganizationId: orgId,
        venueId: input.venueId ?? null,
        categoryId: input.categoryId ?? null,
        title: input.title,
        slug: input.slug,
        description: input.description ?? null,
        status: 'draft',
        startsAt,
        endsAt,
        timezone: input.timezone ?? 'Asia/Kolkata',
        capacity: input.capacity ?? null,
        ageRestriction: input.ageRestriction ?? null,
      })
      .returning();

    if (!event) throw new Error('Event creation failed');

    // 7. Audit log & analytics instrumentation
    this.audit.log({
      actorUserId: actor.userId,
      action: 'event.created',
      category: 'organization',
      entityType: 'event',
      entityId: event.id,
      metadata: { orgId, title: event.title, slug: event.slug, analyticsEvent: 'event_created' },
    });

    return this.toEvent(event);
  }

  /**
   * Update event details (allowed in DRAFT, SUBMITTED, REJECTED status).
   */
  async update(actor: AuthContext, eventId: string, input: UpdateEventInput): Promise<Event> {
    return this.db.db.transaction(async (tx) => {
      // Concurrency lock: SELECT FOR UPDATE
      const rows = await tx
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .for('update')
        .limit(1)
        .execute();

      const event = rows[0];
      if (!event) {
        throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
      }

      // Security: Verify user is a member of the event's organizer organization & has permission
      await this.rbac.assertOrgMembership(actor.userId, event.organizerOrganizationId);
      await this.rbac.assertPermissionInOrg(actor.userId, event.organizerOrganizationId, 'event.edit');

      // Cannot update published/live/completed/cancelled events directly
      if (['published', 'live', 'completed', 'cancelled'].includes(event.status)) {
        throw new ForbiddenException({
          code: 'EVENT_LOCKED',
          message: `Cannot edit an event in "${event.status}" status. Unpublish or revert state first.`,
        });
      }

      // Verify venue if changing
      if (input.venueId !== undefined && input.venueId !== null) {
        await this.assertVenueValid(input.venueId);
      }

      // Verify category if changing
      if (input.categoryId !== undefined && input.categoryId !== null) {
        await this.assertCategoryValid(input.categoryId);
      }

      const startsAt = input.startsAt ? new Date(input.startsAt) : event.startsAt;
      const endsAt = input.endsAt ? new Date(input.endsAt) : event.endsAt;
      if (endsAt <= startsAt) {
        throw new BadRequestException({
          code: 'INVALID_EVENT_DATES',
          message: 'Event end date must be after start date.',
        });
      }

      const [updated] = await tx
        .update(events)
        .set({
          venueId: input.venueId !== undefined ? input.venueId : event.venueId,
          categoryId: input.categoryId !== undefined ? input.categoryId : event.categoryId,
          title: input.title ?? event.title,
          description: input.description !== undefined ? input.description : event.description,
          startsAt,
          endsAt,
          timezone: input.timezone ?? event.timezone,
          capacity: input.capacity !== undefined ? input.capacity : event.capacity,
          ageRestriction: input.ageRestriction !== undefined ? input.ageRestriction : event.ageRestriction,
          updatedAt: new Date(),
          // NEVER UPDATE STATUS FROM HERE
        })
        .where(eq(events.id, eventId))
        .returning();

      this.audit.log({
        actorUserId: actor.userId,
        action: 'event.updated',
        category: 'organization',
        entityType: 'event',
        entityId: eventId,
        metadata: { changes: input },
      });

      return this.toEvent(updated!);
    });
  }

  /**
   * Submit event for review.
   */
  async submitForReview(actor: AuthContext, eventId: string): Promise<Event> {
    return this.executeTransition(actor, eventId, 'submitted');
  }

  /**
   * Admin Review (Approve or Reject).
   */
  async reviewEvent(actor: AuthContext, eventId: string, input: ReviewEventInput): Promise<Event> {
    const targetState: EventStatus = input.decision === 'approve' ? 'approved' : 'rejected';
    return this.executeTransition(actor, eventId, targetState, input.reason);
  }

  /**
   * Publish approved event.
   */
  async publishEvent(actor: AuthContext, eventId: string): Promise<Event> {
    return this.executeTransition(actor, eventId, 'published');
  }

  /**
   * Unpublish published event.
   */
  async unpublishEvent(actor: AuthContext, eventId: string): Promise<Event> {
    return this.executeTransition(actor, eventId, 'approved');
  }

  /**
   * Cancel event.
   */
  async cancelEvent(actor: AuthContext, eventId: string): Promise<Event> {
    return this.executeTransition(actor, eventId, 'cancelled');
  }

  /**
   * Centralized transition executor with DB locking for concurrency safety.
   */
  private async executeTransition(
    actor: AuthContext,
    eventId: string,
    targetState: EventStatus,
    reason?: string,
  ): Promise<Event> {
    return this.db.db.transaction(async (tx) => {
      // FOR UPDATE lock prevents concurrent approval/rejection/publication collisions
      const rows = await tx
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .for('update')
        .limit(1)
        .execute();

      const event = rows[0];
      if (!event) {
        throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
      }

      // Check venue status if assigned
      let venueStatus: string | null = null;
      if (event.venueId) {
        const v = await tx.query.venues.findFirst({ where: eq(venues.id, event.venueId) });
        venueStatus = v?.status ?? null;
      }

      // Validate transition rules & permissions via state machine
      const result = this.stateMachine.validateTransition(event.status as EventStatus, targetState, {
        actor,
        event: {
          id: event.id,
          organizerOrganizationId: event.organizerOrganizationId,
          venueId: event.venueId,
          categoryId: event.categoryId,
          title: event.title,
          status: event.status as EventStatus,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          timezone: event.timezone,
          capacity: event.capacity,
        },
        venueStatus,
        reason,
      });

      // Update event status
      const isPublishing = targetState === 'published';
      const [updated] = await tx
        .update(events)
        .set({
          status: result.targetState,
          publishedAt: isPublishing ? (event.publishedAt ?? new Date()) : event.publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(events.id, eventId))
        .returning();

      // Audit log & non-blocking analytics hooks
      this.audit.log({
        actorUserId: actor.userId,
        action: result.auditAction,
        category: 'organization',
        entityType: 'event',
        entityId: eventId,
        metadata: {
          previousStatus: event.status,
          newStatus: result.targetState,
          reason,
          analyticsEvent: `event_${result.targetState}`,
        },
      });

      return this.toEvent(updated!);
    });
  }

  /**
   * Find management event by ID (requires org membership).
   */
  async findOne(actor: AuthContext, eventId: string): Promise<Event> {
    const event = await this.db.db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!event) {
      throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
    }

    await this.rbac.assertOrgMembership(actor.userId, event.organizerOrganizationId);
    return this.toEvent(event);
  }

  /**
   * List management events for user's organization.
   */
  async findMyEvents(actor: AuthContext, orgId: string): Promise<Event[]> {
    await this.rbac.assertOrgMembership(actor.userId, orgId);

    const list = await this.db.db
      .select()
      .from(events)
      .where(eq(events.organizerOrganizationId, orgId))
      .execute();

    return list.map((e) => this.toEvent(e));
  }

  /**
   * List submitted events for admin review.
   */
  async listSubmittedEventsForAdmin(actor: AuthContext): Promise<Event[]> {
    if (!actor.permissions?.includes('event.approve' as any)) {
      throw new ForbiddenException({ code: 'INSUFFICIENT_PERMISSIONS' });
    }

    const list = await this.db.db
      .select()
      .from(events)
      .where(inArray(events.status, ['submitted', 'under_review']))
      .execute();

    return list.map((e) => this.toEvent(e));
  }

  /**
   * Add media to event.
   */
  async addMedia(actor: AuthContext, eventId: string, media: { url: string; type?: string; sortOrder?: number }) {
    const event = await this.db.db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND' });

    await this.rbac.assertOrgMembership(actor.userId, event.organizerOrganizationId);
    await this.rbac.assertPermissionInOrg(actor.userId, event.organizerOrganizationId, 'event.edit');

    const [created] = await this.db.db
      .insert(eventMedia)
      .values({
        eventId,
        url: media.url,
        type: media.type ?? 'image',
        sortOrder: media.sortOrder ?? 0,
      })
      .returning();

    if (created) {
      this.audit.log({
        actorUserId: actor.userId,
        action: 'event.media_added',
        category: 'organization',
        entityType: 'event_media',
        entityId: created.id,
        metadata: { eventId, url: media.url },
      });
    }

    return created;
  }

  /**
   * Remove media from event.
   */
  async removeMedia(actor: AuthContext, eventId: string, mediaId: string): Promise<void> {
    const event = await this.db.db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND' });

    await this.rbac.assertOrgMembership(actor.userId, event.organizerOrganizationId);
    await this.rbac.assertPermissionInOrg(actor.userId, event.organizerOrganizationId, 'event.edit');

    await this.db.db
      .delete(eventMedia)
      .where(and(eq(eventMedia.id, mediaId), eq(eventMedia.eventId, eventId)));

    this.audit.log({
      actorUserId: actor.userId,
      action: 'event.media_removed',
      category: 'organization',
      entityType: 'event_media',
      entityId: mediaId,
      metadata: { eventId },
    });
  }

  /**
   * Set event lineup.
   */
  async setLineup(actor: AuthContext, eventId: string, lineup: Array<{ name: string; role?: string | null; sortOrder?: number }>) {
    const event = await this.db.db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND' });

    await this.rbac.assertOrgMembership(actor.userId, event.organizerOrganizationId);
    await this.rbac.assertPermissionInOrg(actor.userId, event.organizerOrganizationId, 'event.edit');

    return this.db.db.transaction(async (tx) => {
      await tx.delete(eventLineups).where(eq(eventLineups.eventId, eventId));

      if (lineup.length === 0) return [];

      const inserted = await tx
        .insert(eventLineups)
        .values(
          lineup.map((item, idx) => ({
            eventId,
            name: item.name,
            role: item.role ?? null,
            sortOrder: item.sortOrder ?? idx,
          })),
        )
        .returning();

      return inserted;
    });
  }

  /**
   * PUBLIC DISCOVERY — List published/live events with cursor pagination and search/filtering.
   * Sanitized — returns EventListItemDto.
   */
  async findPublicEventsFeed(query: {
    q?: string;
    category?: string;
    city?: string;
    venueId?: string;
    dateFrom?: string;
    dateTo?: string;
    datePreset?: 'today' | 'tomorrow' | 'this_weekend' | 'this_week' | 'this_month';
    sort?: 'date' | 'newest' | 'relevance';
    limit?: number;
    cursor?: string;
    timezone?: string;
  }): Promise<CursorPaginatedResponse<EventListItemDto>> {
    const limit = Math.min(query.limit ?? 24, 100);
    const tz = query.timezone ?? 'Asia/Kolkata';

    // Parse date presets or custom date range into UTC bounds
    let dateFromUtc: Date | undefined = query.dateFrom ? new Date(query.dateFrom) : undefined;
    let dateToUtc: Date | undefined = query.dateTo ? new Date(query.dateTo) : undefined;

    if (query.datePreset) {
      const bounds = this.calculateDatePresetBounds(query.datePreset, tz);
      dateFromUtc = bounds.dateFrom;
      dateToUtc = bounds.dateTo;
    }

    // Build SQL conditions via SearchService
    const conditions = this.searchService.buildSearchConditions({
      q: query.q,
      categorySlug: query.category,
      city: query.city,
      venueId: query.venueId,
      dateFrom: dateFromUtc,
      dateTo: dateToUtc,
      sort: query.sort,
    });

    // Decode cursor
    const cursorInfo = this.searchService.decodeCursor(query.cursor);
    if (cursorInfo) {
      const cursorDate = new Date(cursorInfo.lastVal);
      // Deterministic tie-breaker ordering: (startsAt, id) > (cursorDate, lastId)
      conditions.push(
        sql`(${events.startsAt}, ${events.id}) > (${cursorDate}, ${cursorInfo.lastId}::uuid)`,
      );
    }

    // Determine sort ordering (default: starts_at ASC, id ASC for deterministic feed)
    const orderClause = query.sort === 'newest'
      ? [sql`${events.publishedAt} DESC`, sql`${events.id} DESC`]
      : [sql`${events.startsAt} ASC`, sql`${events.id} ASC`];

    // Fetch +1 to determine hasMore
    const rawList = await this.db.db
      .select({
        event: events,
        venueName: venues.name,
        venueSlug: venues.slug,
        venueCity: venues.city,
        categoryName: eventCategories.name,
        categorySlug: eventCategories.slug,
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .leftJoin(eventCategories, eq(events.categoryId, eventCategories.id))
      .where(and(...conditions))
      .orderBy(...orderClause)
      .limit(limit + 1)
      .execute();

    const hasMore = rawList.length > limit;
    const items = rawList.slice(0, limit);

    // Fetch cover image for items
    const eventIds = items.map((i) => i.event.id);
    const mediaList = eventIds.length > 0
      ? await this.db.db
          .select()
          .from(eventMedia)
          .where(and(inArray(eventMedia.eventId, eventIds), eq(eventMedia.type, 'image')))
          .execute()
      : [];

    const coverMap = new Map<string, string>();
    for (const m of mediaList) {
      if (!coverMap.has(m.eventId) || m.sortOrder < 0) {
        coverMap.set(m.eventId, m.url);
      }
    }

    const dtos: EventListItemDto[] = items.map(({ event, venueName, venueSlug, venueCity, categoryName, categorySlug }) => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      timezone: event.timezone,
      coverImage: coverMap.get(event.id) ?? null,
      city: venueCity ?? null,
      venueName: venueName ?? null,
      venueSlug: venueSlug ?? null,
      categoryName: categoryName ?? null,
      categorySlug: categorySlug ?? null,
    }));

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1]!.event;
      const valStr = query.sort === 'newest'
        ? (lastItem.publishedAt?.toISOString() ?? lastItem.createdAt.toISOString())
        : lastItem.startsAt.toISOString();
      nextCursor = this.searchService.encodeCursor(valStr, lastItem.id);
    }

    // Non-blocking canonical analytics logging
    if (query.q) {
      this.logger.log(`[Analytics: search_completed] q="${query.q}" results=${dtos.length}`);
    }
    if (query.category || query.city || query.datePreset) {
      this.logger.log(`[Analytics: filter_applied] category=${query.category} city=${query.city} datePreset=${query.datePreset}`);
    }

    return {
      items: dtos,
      nextCursor,
      hasMore,
    };
  }

  /**
   * PUBLIC DISCOVERY — Find published/live event by slug.
   * Sanitized — returns EventDetailPublicDto.
   */
  async findPublicEventDetailBySlug(slug: string): Promise<EventDetailPublicDto> {
    const event = await this.db.db.query.events.findFirst({
      where: and(eq(events.slug, slug), inArray(events.status, ['published', 'live'])),
    });

    if (!event) {
      throw new NotFoundException({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found or not currently published.',
      });
    }

    // Load category
    let categoryDto = null;
    if (event.categoryId) {
      const c = await this.db.db.query.eventCategories.findFirst({ where: eq(eventCategories.id, event.categoryId) });
      if (c) categoryDto = { id: c.id, name: c.name, slug: c.slug };
    }

    // Load public venue if assigned
    let venuePublic = null;
    if (event.venueId) {
      const v = await this.db.db.query.venues.findFirst({ where: eq(venues.id, event.venueId) });
      if (v && v.status === 'active') {
        venuePublic = {
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

    // Load media & lineup
    const media = await this.db.db
      .select()
      .from(eventMedia)
      .where(eq(eventMedia.eventId, event.id))
      .execute();

    const lineup = await this.db.db
      .select()
      .from(eventLineups)
      .where(eq(eventLineups.eventId, event.id))
      .execute();

    // Non-blocking canonical analytics logging
    this.logger.log(`[Analytics: event_view] eventId=${event.id} slug=${slug}`);

    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      timezone: event.timezone,
      ageRestriction: event.ageRestriction,
      publishedAt: event.publishedAt ? event.publishedAt.toISOString() : null,
      category: categoryDto,
      venue: venuePublic,
      media: media.map((m) => ({ id: m.id, url: m.url, type: m.type, sortOrder: m.sortOrder })),
      lineup: lineup.map((l) => ({ id: l.id, name: l.name, role: l.role, sortOrder: l.sortOrder })),
    };
  }

  /**
   * Legacy helper — backward compatibility for existing callers.
   */
  async findPublicEvents(page = 1, limit = 20, categorySlug?: string): Promise<any[]> {
    const res = await this.findPublicEventsFeed({ limit, category: categorySlug } as any);
    return res.items as any[];
  }

  /**
   * Legacy helper — backward compatibility.
   */
  async findPublicEventBySlug(slug: string): Promise<any> {
    const detail = await this.findPublicEventDetailBySlug(slug);
    return detail as any;
  }

  /**
   * List active event categories.
   */
  async listCategories(): Promise<EventCategory[]> {
    return this.db.db
      .select()
      .from(eventCategories)
      .where(eq(eventCategories.status, 'active'))
      .execute();
  }

  /**
   * Calculate UTC date range boundaries for date presets using the target discovery timezone.
   */
  private calculateDatePresetBounds(preset: string, tz: string): { dateFrom: Date; dateTo: Date } {
    const now = new Date();
    const nowTzStr = now.toLocaleString('en-US', { timeZone: tz });
    const localNow = new Date(nowTzStr);

    const startOfToday = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate(), 0, 0, 0);

    switch (preset) {
      case 'today': {
        const endOfToday = new Date(startOfToday.getTime() + 86400000 - 1);
        return { dateFrom: startOfToday, dateTo: endOfToday };
      }
      case 'tomorrow': {
        const startOfTomorrow = new Date(startOfToday.getTime() + 86400000);
        const endOfTomorrow = new Date(startOfTomorrow.getTime() + 86400000 - 1);
        return { dateFrom: startOfTomorrow, dateTo: endOfTomorrow };
      }
      case 'this_weekend': {
        const dayOfWeek = localNow.getDay(); // 0 = Sun, 6 = Sat
        const daysUntilSat = (6 - dayOfWeek + 7) % 7;
        const saturdayStart = new Date(startOfToday.getTime() + daysUntilSat * 86400000);
        const sundayEnd = new Date(saturdayStart.getTime() + 2 * 86400000 - 1);
        return { dateFrom: saturdayStart, dateTo: sundayEnd };
      }
      case 'this_week': {
        const dayOfWeek = localNow.getDay(); // 0 = Sun, 1 = Mon
        const distToMon = (dayOfWeek + 6) % 7;
        const mondayStart = new Date(startOfToday.getTime() - distToMon * 86400000);
        const sundayEnd = new Date(mondayStart.getTime() + 7 * 86400000 - 1);
        return { dateFrom: mondayStart, dateTo: sundayEnd };
      }
      case 'this_month': {
        const monthStart = new Date(localNow.getFullYear(), localNow.getMonth(), 1, 0, 0, 0);
        const nextMonthStart = new Date(localNow.getFullYear(), localNow.getMonth() + 1, 1, 0, 0, 0);
        const monthEnd = new Date(nextMonthStart.getTime() - 1);
        return { dateFrom: monthStart, dateTo: monthEnd };
      }
      default:
        return { dateFrom: startOfToday, dateTo: new Date(startOfToday.getTime() + 30 * 86400000) };
    }
  }

  private async assertVenueValid(venueId: string): Promise<void> {
    const venue = await this.db.db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    });
    if (!venue) {
      throw new NotFoundException({ code: 'VENUE_NOT_FOUND', message: 'Assigned venue not found.' });
    }
    if (venue.status !== 'active') {
      throw new BadRequestException({
        code: 'VENUE_NOT_ACTIVE',
        message: `Venue "${venue.name}" is not active.`,
      });
    }
  }

  private async assertCategoryValid(categoryId: string): Promise<void> {
    const cat = await this.db.db.query.eventCategories.findFirst({
      where: eq(eventCategories.id, categoryId),
    });
    if (!cat || cat.status !== 'active') {
      throw new BadRequestException({
        code: 'INVALID_CATEGORY',
        message: 'Category does not exist or is inactive.',
      });
    }
  }

  private toEvent(e: typeof events.$inferSelect): Event {
    return {
      id: e.id,
      organizerOrganizationId: e.organizerOrganizationId,
      venueId: e.venueId,
      categoryId: e.categoryId,
      title: e.title,
      slug: e.slug,
      description: e.description,
      status: e.status as EventStatus,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      timezone: e.timezone,
      capacity: e.capacity,
      ageRestriction: e.ageRestriction,
      publishedAt: e.publishedAt ? e.publishedAt.toISOString() : null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }

  private async toEventPublic(e: typeof events.$inferSelect): Promise<EventDetailPublicDto> {
    // Load public venue if assigned
    let venuePublic = null;
    if (e.venueId) {
      const v = await this.db.db.query.venues.findFirst({ where: eq(venues.id, e.venueId) });
      if (v && v.status === 'active') {
        venuePublic = {
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

    // Load category
    let category = null;
    if (e.categoryId) {
      const c = await this.db.db.query.eventCategories.findFirst({ where: eq(eventCategories.id, e.categoryId) });
      if (c) category = { id: c.id, name: c.name, slug: c.slug };
    }

    // Load media & lineups
    const media = await this.db.db
      .select()
      .from(eventMedia)
      .where(eq(eventMedia.eventId, e.id))
      .execute();

    const lineup = await this.db.db
      .select()
      .from(eventLineups)
      .where(eq(eventLineups.eventId, e.id))
      .execute();

    return {
      id: e.id,
      title: e.title,
      slug: e.slug,
      description: e.description,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      timezone: e.timezone,
      ageRestriction: e.ageRestriction,
      publishedAt: e.publishedAt ? e.publishedAt.toISOString() : null,
      category,
      venue: venuePublic,
      media: media.map((m) => ({ id: m.id, url: m.url, type: m.type, sortOrder: m.sortOrder })),
      lineup: lineup.map((l) => ({ id: l.id, name: l.name, role: l.role, sortOrder: l.sortOrder })),
    };
  }
}
