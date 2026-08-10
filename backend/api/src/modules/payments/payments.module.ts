import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RazorpayPaymentGateway } from './gateways/razorpay-payment.gateway';
import { MockPaymentGateway } from './gateways/mock-payment.gateway';
import { PaymentTransactionStateMachineService } from './payment-transaction-state-machine.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { TicketsModule } from '../tickets/tickets.module';

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, AuthModule, AuditModule, InventoryModule, OrdersModule, TicketsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    RazorpayPaymentGateway,
    MockPaymentGateway,
    PaymentTransactionStateMachineService,
  ],
  exports: [PaymentsService, RazorpayPaymentGateway, MockPaymentGateway, PaymentTransactionStateMachineService],
})
export class PaymentsModule {}
