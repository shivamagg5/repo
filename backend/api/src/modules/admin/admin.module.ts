import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * Admin Module — platform-level administrative operations and governance.
 *
 * Route authority:
 * - AdminUsersController: GET/POST /admin/users/* (typed PERMISSIONS constants)
 * - AdminController: GET/POST /admin/events/*, /admin/orders/*, /admin/audit-logs
 *
 * IMPORTANT: AdminController must NOT define routes under /admin/users — those
 * belong exclusively to AdminUsersController to avoid NestJS route conflicts.
 */
@Module({
  imports: [UsersModule, EventsModule, PaymentsModule, AuditModule],
  controllers: [AdminController, AdminUsersController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
