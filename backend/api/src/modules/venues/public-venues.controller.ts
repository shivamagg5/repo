import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { VenuesService } from './venues.service';

@Controller('public/venues')
export class PublicVenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Public()
  @Get()
  listPublicVenues(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.venuesService.findPublicVenues(Number(page), Number(limit));
  }

  @Public()
  @Get(':slug')
  getPublicVenueBySlug(@Param('slug') slug: string) {
    return this.venuesService.findPublicVenueBySlug(slug);
  }
}
