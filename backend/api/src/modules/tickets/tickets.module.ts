import { Module } from '@nestjs/common';
import { TicketTypesController } from './ticket-types.controller';
import { TicketsController } from './tickets.controller';
import { TicketTypesService } from './ticket-types.service';
import { TicketsService } from './tickets.service';
import { TicketIssuanceService } from './ticket-issuance.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [TicketTypesController, TicketsController],
  providers: [TicketTypesService, TicketsService, TicketIssuanceService],
  exports: [TicketTypesService, TicketsService, TicketIssuanceService],
})
export class TicketsModule {}
