import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { AdminEventsController } from './admin-events.controller';
import { PublicEventsController } from './public-events.controller';
import { EventsService } from './events.service';
import { EventStateMachineService } from './event-state-machine.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { DiscoveryModule } from '../discovery/discovery.module';

@Module({
  imports: [AuthModule, AuditModule, DiscoveryModule],
  controllers: [EventsController, AdminEventsController, PublicEventsController],
  providers: [EventsService, EventStateMachineService],
  exports: [EventsService, EventStateMachineService],
})
export class EventsModule {}
