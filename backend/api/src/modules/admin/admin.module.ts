import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersModule } from '../users/users.module';

/**
 * Admin Module — platform-level administrative operations.
 *
 * Task 1.1: User management (list, suspend, restore)
 * Future tasks: Event approval, finance, settlements, moderation, analytics
 */
@Module({
  imports: [UsersModule],
  controllers: [AdminUsersController],
  providers: [],
  exports: [],
})
export class AdminModule {}
