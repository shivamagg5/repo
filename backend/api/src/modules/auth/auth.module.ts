import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SmsOtpService } from './sms-otp.service';
import { RbacService } from './rbac.service';
import { PermissionSeeder } from './permissions.seed';
import { AuditModule } from '../../common/audit/audit.module';
import { AuthMiddleware } from '../../common/middleware/auth.middleware';

@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [AuthService, SmsOtpService, RbacService, PermissionSeeder, AuthMiddleware],
  exports: [AuthService, SmsOtpService, RbacService, AuthMiddleware],
})
export class AuthModule {}
