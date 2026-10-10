import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../../common/audit/audit.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

/**
 * Support Module
 * 
 * Domain: support
 * Status: Scaffolded (Task 0.1) — business logic implemented in later phases.
 * 
 * Phase schedule:
 * - Auth/Users/Orgs: Task 1.1
 * - Venues/Events: Task 2.x
 * - Tickets/Orders: Task 4.x
 * - Payments/Refunds: Task 5.x
 * - Scanner: Task 7.x
 * - Finance/Settlements: Task 9.x / 10.x
 * - Promoters/Commissions: Task 10.x
 * - Notifications/CMS: Task 11.x
 * - Analytics: Task 12.x
 * - Support/Moderation/Admin: Task 8.x / 9.x
 */
@Module({
  imports: [AdminModule, AuditModule],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
