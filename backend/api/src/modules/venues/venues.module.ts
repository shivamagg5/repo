import { Module } from '@nestjs/common';
import { VenuesController } from './venues.controller';
import { PublicVenuesController } from './public-venues.controller';
import { VenuesService } from './venues.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [VenuesController, PublicVenuesController],
  providers: [VenuesService],
  exports: [VenuesService],
})
export class VenuesModule {}
