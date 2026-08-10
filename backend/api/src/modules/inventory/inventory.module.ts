import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationService } from './reservation.service';
import { HoldStateMachineService } from './hold-state-machine.service';
import { HoldExpirationService } from './hold-expiration.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';

@Module({
  imports: [AuthModule, AuditModule, IdempotencyModule],
  controllers: [ReservationsController],
  providers: [ReservationService, HoldStateMachineService, HoldExpirationService],
  exports: [ReservationService, HoldStateMachineService, HoldExpirationService],
})
export class InventoryModule {}
