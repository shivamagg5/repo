import { Module } from '@nestjs/common';
import { PromotersController } from './promoters.controller';
import { PromotersService } from './promoters.service';
import { ReferralService } from './referral.service';
import { CommissionService } from './commission.service';
import { CommissionStateMachineService } from './promoter-state-machine.service';
import { GuestlistService } from './guestlist.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { ScannerModule } from '../scanner/scanner.module';

@Module({
  imports: [AuthModule, AuditModule, ScannerModule],
  controllers: [PromotersController],
  providers: [
    PromotersService,
    ReferralService,
    CommissionService,
    CommissionStateMachineService,
    GuestlistService,
  ],
  exports: [
    PromotersService,
    ReferralService,
    CommissionService,
    CommissionStateMachineService,
    GuestlistService,
  ],
})
export class PromotersModule {}

