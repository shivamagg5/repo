import { Module } from '@nestjs/common';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';
import { SettlementStateMachineService } from './settlement-state-machine.service';
import { FinanceModule } from '../finance/finance.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [FinanceModule, AuditModule],
  controllers: [SettlementsController],
  providers: [SettlementsService, SettlementStateMachineService],
  exports: [SettlementsService, SettlementStateMachineService],
})
export class SettlementsModule {}
