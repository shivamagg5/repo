import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { LedgerService } from './ledger.service';
import { ReconciliationService } from './reconciliation.service';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [FinanceController],
  providers: [LedgerService, ReconciliationService],
  exports: [LedgerService, ReconciliationService],
})
export class FinanceModule {}
