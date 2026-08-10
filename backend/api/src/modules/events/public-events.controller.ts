import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { EventsService } from './events.service';
import { DiscoveryCacheService } from '../discovery/discovery-cache.service';

@Controller('public')
export class PublicEventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly cacheService: DiscoveryCacheService,
  ) {}

  @Public()
  @Get('events')
  async listPublicEvents(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('venueId') venueId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('datePreset') datePreset?: 'today' | 'tomorrow' | 'this_weekend' | 'this_week' | 'this_month',
    @Query('sort') sort: 'date' | 'newest' | 'relevance' = 'date',
    @Query('limit') limit = 24,
    @Query('cursor') cursor?: string,
    @Query('timezone') timezone?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    if (res) {
      res.setHeader('Cache-Control', this.cacheService.getPublicCacheControlHeader(60, 300));
    }

    return this.eventsService.findPublicEventsFeed({
      q,
      category,
      city,
      venueId,
      dateFrom,
      dateTo,
      datePreset,
      sort,
      limit: Number(limit),
      cursor,
      timezone,
    });
  }

  @Public()
  @Get('events/:slug')
  async getPublicEventBySlug(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    if (res) {
      res.setHeader('Cache-Control', this.cacheService.getPublicCacheControlHeader(120, 600));
    }

    return this.eventsService.findPublicEventDetailBySlug(slug);
  }

  @Public()
  @Get('categories')
  async listCategories(
    @Res({ passthrough: true }) res?: Response,
  ) {
    if (res) {
      res.setHeader('Cache-Control', this.cacheService.getPublicCacheControlHeader(300, 1800));
    }

    return this.eventsService.listCategories();
  }
}
