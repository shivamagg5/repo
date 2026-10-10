import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReservationsController } from './reservations.controller';
import { ReservationService } from './reservation.service';
import { HoldStateMachineService } from './hold-state-machine.service';
import { HoldExpirationService } from './hold-expiration.service';
import { HoldExpiryWorkerService } from './hold-expiry-worker.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    AuditModule,
    IdempotencyModule,
    RealtimeModule,
  ],
  controllers: [ReservationsController],
  providers: [
    ReservationService,
    HoldStateMachineService,
    HoldExpirationService,
    HoldExpiryWorkerService,
  ],
  exports: [ReservationService, HoldStateMachineService, HoldExpirationService],
})
export class InventoryModule {}
