import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createEventSchema,
  updateEventSchema,
  addEventMediaSchema,
  setEventLineupSchema,
} from '@platform/validation';
import type {
  AuthContext,
  CreateEventInput,
  UpdateEventInput,
} from '@platform/types';

@Controller('events')
@UseGuards(AuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthContext,
    @Query('organizationId', ParseUUIDPipe) orgId: string,
    @Body(new ZodValidationPipe(createEventSchema)) body: CreateEventInput,
  ) {
    return this.eventsService.create(user, orgId, body);
  }

  @Get()
  findMyEvents(
    @CurrentUser() user: AuthContext,
    @Query('organizationId', ParseUUIDPipe) orgId: string,
  ) {
    return this.eventsService.findMyEvents(user, orgId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateEventSchema)) body: UpdateEventInput,
  ) {
    return this.eventsService.update(user, id, body);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  submitForReview(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.submitForReview(user, id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.publishEvent(user, id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  unpublish(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.unpublishEvent(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.cancelEvent(user, id);
  }

  @Post(':id/media')
  addMedia(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(addEventMediaSchema)) body: { url: string; type?: string; sortOrder?: number },
  ) {
    return this.eventsService.addMedia(user, id, body);
  }

  @Delete(':id/media/:mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMedia(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
  ) {
    return this.eventsService.removeMedia(user, id, mediaId);
  }

  @Put(':id/lineup')
  setLineup(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(setEventLineupSchema)) body: { lineup: Array<{ name: string; role?: string | null; sortOrder?: number }> },
  ) {
    return this.eventsService.setLineup(user, id, body.lineup);
  }
}
