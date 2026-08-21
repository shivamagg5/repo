import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { FinanceModule } from '../finance/finance.module';

/**
 * FIX-001: MockPaymentGateway is only provided outside of production.
 * In production, the factory returns undefined which is absorbed by @Optional()
 * on PaymentsService constructor. This ensures the mock gateway cannot be
 * instantiated, injected, or reached in any production code path.
 */
const mockGatewayProvider = {
  provide: MockPaymentGateway,
  useFactory: (configService: ConfigService) => {
    if (process.env.NODE_ENV === 'production') {
      return null; // Absorbed by @Optional() — mock is unreachable in production
    }
    return new MockPaymentGateway();
  },
  inject: [ConfigService],
};

@Module({
  imports: [ConfigModule, AuthModule, AuditModule, InventoryModule, OrdersModule, TicketsModule, FinanceModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    RazorpayPaymentGateway,
    mockGatewayProvider,
    PaymentTransactionStateMachineService,
  ],
  exports: [PaymentsService, RazorpayPaymentGateway, PaymentTransactionStateMachineService],
})
export class PaymentsModule {}
