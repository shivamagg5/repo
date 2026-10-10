import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TicketsService } from './tickets.service';
import type { AuthContext } from '@platform/types';

@Controller('tickets')
@UseGuards(AuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  getUserTickets(@CurrentUser() actor: AuthContext) {
    return this.ticketsService.findUserTickets(actor);
  }

  @Get(':id')
  getTicketById(
    @CurrentUser() actor: AuthContext,
    @Param('id') id: string,
  ) {
    return this.ticketsService.findTicketById(actor, id);
  }

  @Get(':id/qr')
  async getTicketQr(
    @CurrentUser() actor: AuthContext,
    @Param('id') id: string,
  ) {
    const ticket = await this.ticketsService.findTicketById(actor, id);
    return { token: ticket.qrToken ?? '' };
  }
}
