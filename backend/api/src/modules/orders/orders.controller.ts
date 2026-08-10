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

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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

  @Post(':id/confirm')
  confirmOrderPayment(
    @CurrentUser() actor: AuthContext,
    @Param('id') id: string,
  ) {
    return this.ordersService.confirmOrderPayment(actor, id);
  }
}
