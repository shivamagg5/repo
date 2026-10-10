import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { createOrderSchema } from '@platform/validation';
import type { AuthContext } from '@platform/types';

import { TicketsService } from '../tickets/tickets.service';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly ticketsService: TicketsService,
  ) {}

  @Post()
  createOrder(
    @CurrentUser() actor: AuthContext,
    @Body() body: unknown,
  ) {
    const validated = createOrderSchema.parse(body);
    return this.ordersService.getOrCreateOrderForReservation(actor, validated.reservationId);
  }

  @Get()
  listUserOrders(@CurrentUser() actor: AuthContext) {
    return this.ordersService.findUserOrders(actor);
  }

  @Get(':id')
  getOrder(
    @CurrentUser() actor: AuthContext,
    @Param('id') id: string,
  ) {
    return this.ordersService.findOrderById(actor, id);
  }

  @Get(':id/tickets')
  getOrderTickets(
    @CurrentUser() actor: AuthContext,
    @Param('id') id: string,
  ) {
    return this.ticketsService.findTicketsByOrderId(actor, id);
  }

  @Post(':id/confirm')
  confirmOrderPayment(
    @CurrentUser() actor: AuthContext,
    @Param('id') id: string,
  ) {
    return this.ordersService.confirmOrderPayment(actor, id);
  }
}
