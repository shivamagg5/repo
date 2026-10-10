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

import { OrganizerMarketingService } from './organizer-marketing.service';
import { OrganizerDataService } from './organizer-data.service';
import { OrganizerPayoutService } from './organizer-payout.service';

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
  providers: [
    OrganizerDashboardService,
    OrganizerMarketingService,
    OrganizerDataService,
    OrganizerPayoutService,
  ],
  exports: [
    OrganizerDashboardService,
    OrganizerMarketingService,
    OrganizerDataService,
    OrganizerPayoutService,
  ],
})
export class OrganizerDashboardModule {}
