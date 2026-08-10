import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { reviewEventSchema } from '@platform/validation';
import type { AuthContext, ReviewEventInput } from '@platform/types';
import { PERMISSIONS } from '@platform/types';

@Controller('admin/events')
@UseGuards(AuthGuard, RbacGuard)
export class AdminEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EVENT_APPROVE)
  listSubmittedEvents(@CurrentUser() user: AuthContext) {
    return this.eventsService.listSubmittedEventsForAdmin(user);
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.EVENT_APPROVE)
  reviewEvent(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reviewEventSchema)) body: ReviewEventInput,
  ) {
    return this.eventsService.reviewEvent(user, id, body);
  }
}
