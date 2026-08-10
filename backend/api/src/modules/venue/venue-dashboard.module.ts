import { Module } from '@nestjs/common';
import { VenueDashboardController } from './venue-dashboard.controller';
import { VenueDashboardService } from './venue-dashboard.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { VenuesModule } from '../venues/venues.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    OrganizationsModule,
    VenuesModule,
    EventsModule,
  ],
  controllers: [VenueDashboardController],
  providers: [VenueDashboardService],
  exports: [VenueDashboardService],
})
export class VenueDashboardModule {}
