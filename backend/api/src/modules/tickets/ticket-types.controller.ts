import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { TicketTypesService } from './ticket-types.service';
import {
  createTicketTypeSchema,
  updateTicketTypeSchema,
} from '@platform/validation';
import type { AuthContext } from '@platform/types';

@Controller()
export class TicketTypesController {
  constructor(private readonly ticketTypesService: TicketTypesService) {}

  @Public()
  @Get('events/:eventId/ticket-types')
  listTicketTypes(@Param('eventId') eventId: string) {
    return this.ticketTypesService.findEventTicketTypes(eventId);
  }

  @UseGuards(AuthGuard)
  @Post('events/:eventId/ticket-types')
  createTicketType(
    @CurrentUser() actor: AuthContext,
    @Param('eventId') eventId: string,
    @Body() body: unknown,
  ) {
    const validated = createTicketTypeSchema.parse({ ...(body as any), eventId });
    return this.ticketTypesService.createTicketType(actor, validated);
  }

  @UseGuards(AuthGuard)
  @Patch('ticket-types/:id')
  updateTicketType(
    @CurrentUser() actor: AuthContext,
    @Param('id') ticketTypeId: string,
    @Body() body: unknown,
  ) {
    const validated = updateTicketTypeSchema.parse(body);
    return this.ticketTypesService.updateTicketType(actor, ticketTypeId, validated);
  }
}
