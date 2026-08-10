import { Module } from '@nestjs/common';
import { PromotersController } from './promoters.controller';
import { PromotersService } from './promoters.service';
import { ReferralService } from './referral.service';
import { CommissionService } from './commission.service';
import { CommissionStateMachineService } from './promoter-state-machine.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [PromotersController],
  providers: [
    PromotersService,
    ReferralService,
    CommissionService,
    CommissionStateMachineService,
  ],
  exports: [
    PromotersService,
    ReferralService,
    CommissionService,
    CommissionStateMachineService,
  ],
})
export class PromotersModule {}
