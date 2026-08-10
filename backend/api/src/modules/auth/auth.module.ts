import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RbacService } from './rbac.service';
import { PermissionSeeder } from './permissions.seed';
import { AuditModule } from '../../common/audit/audit.module';
import { AuthMiddleware } from '../../common/middleware/auth.middleware';

@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [AuthService, RbacService, PermissionSeeder, AuthMiddleware],
  exports: [AuthService, RbacService, AuthMiddleware],
})
export class AuthModule {}

