import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VenuesService } from './venues.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createVenueSchema,
  updateVenueSchema,
  addVenueMediaSchema,
} from '@platform/validation';
import type { AuthContext, CreateVenueInput, UpdateVenueInput } from '@platform/types';

@Controller('venues')
@UseGuards(AuthGuard)
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthContext,
    @Query('organizationId', ParseUUIDPipe) orgId: string,
    @Body(new ZodValidationPipe(createVenueSchema)) body: CreateVenueInput,
  ) {
    return this.venuesService.create(user.userId, orgId, body);
  }

  @Get()
  findMyVenues(
    @CurrentUser() user: AuthContext,
    @Query('organizationId', ParseUUIDPipe) orgId: string,
  ) {
    return this.venuesService.findMyVenues(user.userId, orgId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.venuesService.findOne(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateVenueSchema)) body: UpdateVenueInput,
  ) {
    return this.venuesService.update(user.userId, id, body);
  }

  @Post(':id/media')
  addMedia(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(addVenueMediaSchema)) body: { url: string; type?: string; sortOrder?: number },
  ) {
    return this.venuesService.addMedia(user.userId, id, body);
  }

  @Delete(':id/media/:mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMedia(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
  ) {
    return this.venuesService.deleteMedia(user.userId, id, mediaId);
  }
}
