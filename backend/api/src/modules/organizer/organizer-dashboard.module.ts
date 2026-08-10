import { Module } from '@nestjs/common';
import { OrganizerDashboardController } from './organizer-dashboard.controller';
import { OrganizerDashboardService } from './organizer-dashboard.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { EventsModule } from '../events/events.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { PromotersModule } from '../promoters/promoters.module';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    OrganizationsModule,
    EventsModule,
    OrdersModule,
    PaymentsModule,
    PromotersModule,
  ],
  controllers: [OrganizerDashboardController],
  providers: [OrganizerDashboardService],
  exports: [OrganizerDashboardService],
})
export class OrganizerDashboardModule {}
