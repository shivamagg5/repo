import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  cmsBanners,
  cmsFeaturedEvents,
  cmsCollections,
  cmsCollectionEvents,
  cmsEditorialBlocks,
  events,
} from '../../database/schema/index';
import { eq, and, inArray, gte, lte, or, isNull, asc, desc } from 'drizzle-orm';
import type {
  CmsBannerDto,
  CreateCmsBannerInput,
  CmsFeaturedEventDto,
  CmsCollectionDto,
  CreateCmsCollectionInput,
  CmsEditorialBlockDto,
  CreateCmsEditorialBlockInput,
} from '@platform/types';

export const PUBLIC_ELIGIBLE_EVENT_STATUSES = ['approved', 'published', 'live', 'completed'];

@Injectable()
export class CmsService {
  private readonly logger = new Logger(CmsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * SANITIZE MARKDOWN & MEDIA URLS (XSS & EXECUTABLE SCRIPT PROTECTION)
   */
  sanitizeMarkdown(text: string): string {
    if (!text) return '';
    // Strip malicious script, iframe, javascript: URLs and dangerous HTML tags
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/onload=/gi, '')
      .replace(/onerror=/gi, '');
  }

  /**
   * PUBLIC GET BANNERS (WITH SCHEDULING WINDOW & PUBLISH STATUS FILTER)
   */
  async getPublicBanners(): Promise<CmsBannerDto[]> {
    const db = this.databaseService.db;
    const now = new Date();

    const rows = await db.query.cmsBanners.findMany({
      where: and(
        eq(cmsBanners.status, 'published'),
        or(isNull(cmsBanners.startAt), lte(cmsBanners.startAt, now)),
        or(isNull(cmsBanners.endAt), gte(cmsBanners.endAt, now)),
      ),
      orderBy: [asc(cmsBanners.displayOrder)],
    });

    return rows.map((b) => ({
      id: b.id,
      title: this.sanitizeMarkdown(b.title),
      imageUrl: b.imageUrl,
      targetUrl: b.targetUrl,
      displayOrder: b.displayOrder,
      status: b.status as any,
      startAt: b.startAt ? b.startAt.toISOString() : null,
      endAt: b.endAt ? b.endAt.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
    }));
  }

  /**
   * CREATE CMS BANNER (ADMIN)
   */
  async createBanner(input: CreateCmsBannerInput, actorUserId: string): Promise<CmsBannerDto> {
    const db = this.databaseService.db;
    const sanitizedTitle = this.sanitizeMarkdown(input.title);

    const [banner] = await db
      .insert(cmsBanners)
      .values({
        title: sanitizedTitle,
        imageUrl: input.imageUrl,
        targetUrl: input.targetUrl,
        displayOrder: input.displayOrder ?? 0,
        status: input.status ?? 'draft',
        startAt: input.startAt ? new Date(input.startAt) : null,
        endAt: input.endAt ? new Date(input.endAt) : null,
      })
      .returning();

    this.auditService.log({
      actorUserId,
      action: 'cms.banner_created',
      category: 'admin',
      entityType: 'cms_banner',
      entityId: banner!.id,
      metadata: { title: sanitizedTitle, status: banner!.status },
    });

    return {
      id: banner!.id,
      title: banner!.title,
      imageUrl: banner!.imageUrl,
      targetUrl: banner!.targetUrl,
      displayOrder: banner!.displayOrder,
      status: banner!.status as any,
      startAt: banner!.startAt ? banner!.startAt.toISOString() : null,
      endAt: banner!.endAt ? banner!.endAt.toISOString() : null,
      createdAt: banner!.createdAt.toISOString(),
    };
  }

  /**
   * PUBLIC FEATURED EVENTS (WITH PUBLIC ELIGIBILITY FILTER)
   */
  async getPublicFeaturedEvents(): Promise<CmsFeaturedEventDto[]> {
    const db = this.databaseService.db;
    const rows = await db.query.cmsFeaturedEvents.findMany({
      where: eq(cmsFeaturedEvents.status, 'published'),
      orderBy: [asc(cmsFeaturedEvents.displayOrder)],
      with: {
        event: true,
      },
    });

    // Filter out non-public events
    const eligible = rows.filter(
      (fe: any) => fe.event && PUBLIC_ELIGIBLE_EVENT_STATUSES.includes(fe.event.status),
    );

    return eligible.map((fe) => ({
      id: fe.id,
      eventId: fe.eventId,
      displayOrder: fe.displayOrder,
      badgeText: fe.badgeText,
      status: fe.status as any,
      createdAt: fe.createdAt ? new Date(fe.createdAt).toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * CREATE CMS COLLECTION WITH RELATIONAL EVENTS & PUBLISH VALIDATION
   */
  async createCollection(input: CreateCmsCollectionInput, actorUserId: string): Promise<CmsCollectionDto> {
    const db = this.databaseService.db;

    // Validate referenced event IDs public eligibility at publish time
    if (input.eventIds && input.eventIds.length > 0) {
      const targetEvents = await db.query.events.findMany({
        where: inArray(events.id, input.eventIds),
      });

      for (const ev of targetEvents) {
        if (!PUBLIC_ELIGIBLE_EVENT_STATUSES.includes(ev.status)) {
          throw new BadRequestException(
            `Event "${ev.title}" (${ev.id}) is in status "${ev.status}" and cannot be featured in a public CMS collection.`,
          );
        }
      }
    }

    const [collection] = await db
      .insert(cmsCollections)
      .values({
        title: this.sanitizeMarkdown(input.title),
        slug: input.slug,
        description: input.description ? this.sanitizeMarkdown(input.description) : null,
        coverImageUrl: input.coverImageUrl ?? null,
        status: input.status ?? 'draft',
        publishedAt: input.status === 'published' ? new Date() : null,
      })
      .returning();

    // Create relational collection items (cmsCollectionEvents)
    const collectionEventItems: any[] = [];
    if (input.eventIds && input.eventIds.length > 0) {
      const itemsToInsert = input.eventIds.map((eventId, idx) => ({
        collectionId: collection!.id,
        eventId,
        displayOrder: idx,
      }));

      const inserted = await db.insert(cmsCollectionEvents).values(itemsToInsert).returning();
      collectionEventItems.push(...inserted);
    }

    this.auditService.log({
      actorUserId,
      action: 'cms.collection_created',
      category: 'admin',
      entityType: 'cms_collection',
      entityId: collection!.id,
      metadata: { slug: input.slug, itemCount: collectionEventItems.length },
    });

    return {
      id: collection!.id,
      title: collection!.title,
      slug: collection!.slug,
      description: collection!.description,
      coverImageUrl: collection!.coverImageUrl,
      status: collection!.status as any,
      publishedAt: collection!.publishedAt ? collection!.publishedAt.toISOString() : null,
      createdAt: collection!.createdAt.toISOString(),
      events: collectionEventItems.map((item) => ({
        id: item.id,
        collectionId: item.collectionId,
        eventId: item.eventId,
        displayOrder: item.displayOrder,
      })),
    };
  }

  /**
   * PUBLIC GET EDITORIAL BLOCKS (WITH MARKDOWN SANITIZATION)
   */
  async getPublicEditorialBlocks(): Promise<CmsEditorialBlockDto[]> {
    const db = this.databaseService.db;
    const rows = await db.query.cmsEditorialBlocks.findMany({
      where: eq(cmsEditorialBlocks.status, 'published'),
      orderBy: [asc(cmsEditorialBlocks.displayOrder)],
    });

    return rows.map((b) => ({
      id: b.id,
      blockType: b.blockType,
      headline: this.sanitizeMarkdown(b.headline),
      bodyMarkdown: this.sanitizeMarkdown(b.bodyMarkdown),
      mediaUrl: b.mediaUrl,
      displayOrder: b.displayOrder,
      status: b.status as any,
      createdAt: b.createdAt.toISOString(),
    }));
  }

  /**
   * ADMIN GET ALL BANNERS (ALL STATUSES: draft, scheduled, published, archived)
   */
  async getAllBannersAdmin(): Promise<CmsBannerDto[]> {
    const db = this.databaseService.db;
    const rows = await db.query.cmsBanners.findMany({
      orderBy: [asc(cmsBanners.displayOrder)],
    });

    return rows.map((b) => ({
      id: b.id,
      title: b.title,
      imageUrl: b.imageUrl,
      targetUrl: b.targetUrl,
      displayOrder: b.displayOrder,
      status: b.status as any,
      startAt: b.startAt ? b.startAt.toISOString() : null,
      endAt: b.endAt ? b.endAt.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
    }));
  }

  /**
   * UPDATE CMS BANNER (ADMIN)
   */
  async updateBanner(id: string, input: Partial<CreateCmsBannerInput>, actorUserId: string): Promise<CmsBannerDto> {
    const db = this.databaseService.db;
    const existing = await db.query.cmsBanners.findFirst({
      where: eq(cmsBanners.id, id),
    });

    if (!existing) {
      throw new NotFoundException(`CMS banner ${id} not found.`);
    }

    const updates: any = {};
    if (input.title !== undefined) updates.title = this.sanitizeMarkdown(input.title);
    if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl;
    if (input.targetUrl !== undefined) updates.targetUrl = input.targetUrl;
    if (input.displayOrder !== undefined) updates.displayOrder = input.displayOrder;
    if (input.status !== undefined) updates.status = input.status;
    if (input.startAt !== undefined) updates.startAt = input.startAt ? new Date(input.startAt) : null;
    if (input.endAt !== undefined) updates.endAt = input.endAt ? new Date(input.endAt) : null;

    const [updated] = await db
      .update(cmsBanners)
      .set(updates)
      .where(eq(cmsBanners.id, id))
      .returning();

    this.auditService.log({
      actorUserId,
      action: 'cms.banner_updated',
      category: 'admin',
      entityType: 'cms_banner',
      entityId: id,
      metadata: updates,
    });

    return {
      id: updated!.id,
      title: updated!.title,
      imageUrl: updated!.imageUrl,
      targetUrl: updated!.targetUrl,
      displayOrder: updated!.displayOrder,
      status: updated!.status as any,
      startAt: updated!.startAt ? updated!.startAt.toISOString() : null,
      endAt: updated!.endAt ? updated!.endAt.toISOString() : null,
      createdAt: updated!.createdAt.toISOString(),
    };
  }

  /**
   * DELETE CMS BANNER (ADMIN)
   */
  async deleteBanner(id: string, actorUserId: string): Promise<{ success: boolean; id: string }> {
    const db = this.databaseService.db;
    const existing = await db.query.cmsBanners.findFirst({
      where: eq(cmsBanners.id, id),
    });

    if (!existing) {
      throw new NotFoundException(`CMS banner ${id} not found.`);
    }

    await db.delete(cmsBanners).where(eq(cmsBanners.id, id));

    this.auditService.log({
      actorUserId,
      action: 'cms.banner_deleted',
      category: 'admin',
      entityType: 'cms_banner',
      entityId: id,
      metadata: { title: existing.title },
    });

    return { success: true, id };
  }

  /**
   * GET COLLECTIONS (ADMIN & PUBLIC)
   */
  async getCollections(): Promise<CmsCollectionDto[]> {
    const db = this.databaseService.db;
    const rows = await db.query.cmsCollections.findMany({
      orderBy: [desc(cmsCollections.createdAt)],
    });

    return rows.map((c: any) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      coverImageUrl: c.coverImageUrl,
      status: c.status as any,
      publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  /**
   * CREATE EDITORIAL BLOCK (ADMIN)
   */
  async createEditorialBlock(input: CreateCmsEditorialBlockInput, actorUserId: string): Promise<CmsEditorialBlockDto> {
    const db = this.databaseService.db;
    const sanitizedHeadline = this.sanitizeMarkdown(input.headline);
    const sanitizedBody = this.sanitizeMarkdown(input.bodyMarkdown);

    const [block] = await db
      .insert(cmsEditorialBlocks)
      .values({
        blockType: input.blockType,
        headline: sanitizedHeadline,
        bodyMarkdown: sanitizedBody,
        mediaUrl: input.mediaUrl ?? null,
        displayOrder: input.displayOrder ?? 0,
        status: input.status ?? 'draft',
      })
      .returning();

    this.auditService.log({
      actorUserId,
      action: 'cms.editorial_block_created',
      category: 'admin',
      entityType: 'cms_editorial_block',
      entityId: block!.id,
      metadata: { blockType: input.blockType, headline: sanitizedHeadline },
    });

    return {
      id: block!.id,
      blockType: block!.blockType,
      headline: block!.headline,
      bodyMarkdown: block!.bodyMarkdown,
      mediaUrl: block!.mediaUrl,
      displayOrder: block!.displayOrder,
      status: block!.status as any,
      createdAt: block!.createdAt.toISOString(),
    };
  }

  /**
   * ADD FEATURED EVENT PIN (ADMIN)
   */
  async addFeaturedEvent(eventId: string, displayOrder = 0, badgeText?: string, actorUserId = 'admin'): Promise<CmsFeaturedEventDto> {
    const db = this.databaseService.db;
    const ev = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!ev) {
      throw new NotFoundException(`Event ${eventId} not found.`);
    }

    if (!PUBLIC_ELIGIBLE_EVENT_STATUSES.includes(ev.status)) {
      throw new BadRequestException(`Event ${ev.title} is in status ${ev.status} and cannot be featured.`);
    }

    const [featured] = await db
      .insert(cmsFeaturedEvents)
      .values({
        eventId,
        displayOrder,
        badgeText: badgeText ?? null,
        status: 'published',
      })
      .onConflictDoUpdate({
        target: cmsFeaturedEvents.eventId,
        set: {
          displayOrder,
          badgeText: badgeText ?? null,
          status: 'published',
        },
      })
      .returning();

    this.auditService.log({
      actorUserId,
      action: 'cms.featured_event_pinned',
      category: 'admin',
      entityType: 'cms_featured_event',
      entityId: featured!.id,
      metadata: { eventId, displayOrder, badgeText },
    });

    return {
      id: featured!.id,
      eventId: featured!.eventId,
      displayOrder: featured!.displayOrder,
      badgeText: featured!.badgeText,
      status: featured!.status as any,
      createdAt: featured!.createdAt ? new Date(featured!.createdAt).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * REMOVE FEATURED EVENT PIN (ADMIN)
   */
  async removeFeaturedEvent(id: string, actorUserId: string): Promise<{ success: boolean; id: string }> {
    const db = this.databaseService.db;
    await db.delete(cmsFeaturedEvents).where(eq(cmsFeaturedEvents.id, id));

    this.auditService.log({
      actorUserId,
      action: 'cms.featured_event_unpinned',
      category: 'admin',
      entityType: 'cms_featured_event',
      entityId: id,
    });

    return { success: true, id };
  }
}
