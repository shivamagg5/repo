import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { MembersService } from './members.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, MembersService],
  exports: [OrganizationsService, MembersService],
})
export class OrganizationsModule {}
