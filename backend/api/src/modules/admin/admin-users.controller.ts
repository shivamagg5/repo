import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UsersService } from '../users/users.service';
import type { AuthContext } from '@platform/types';
import { PERMISSIONS } from '@platform/types';

const SuspendBodySchema = z.object({ reason: z.string().min(1).max(500) }).strict();
type SuspendBody = z.infer<typeof SuspendBodySchema>;

/**
 * AdminUsersController — platform-admin user management.
 *
 * SECURITY:
 * - All routes require PLATFORM-LEVEL permissions (admin.users.manage, user.suspend, etc.)
 * - These permissions can ONLY be granted by assigning platform roles
 *   (super_admin, operations_admin) via admin APIs — never via org invite/role-change.
 * - Organization-level admins cannot access these endpoints.
 */
@Controller('admin/users')
@UseGuards(AuthGuard, RbacGuard)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/admin/users
   * List all users. Requires platform-level admin.users.manage permission.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.ADMIN_USERS_MANAGE)
  listUsers(@Query('page') page = 1, @Query('pageSize') pageSize = 25) {
    return this.usersService.listUsers(Number(page), Number(pageSize));
  }

  /**
   * POST /api/v1/admin/users/:id/suspend
   * Suspend a user. Requires platform-level user.suspend permission.
   */
  @Post(':id/suspend')
  @RequirePermissions(PERMISSIONS.USER_SUSPEND)
  @HttpCode(HttpStatus.OK)
  suspend(
    @CurrentUser() actor: AuthContext,
    @Param('id', ParseUUIDPipe) targetId: string,
    @Body(new ZodValidationPipe(SuspendBodySchema)) body: SuspendBody,
  ) {
    return this.usersService.suspendUser(actor.userId, targetId, body.reason);
  }

  /**
   * POST /api/v1/admin/users/:id/restore
   * Restore a suspended user. Requires platform-level user.restore permission.
   */
  @Post(':id/restore')
  @RequirePermissions(PERMISSIONS.USER_RESTORE)
  @HttpCode(HttpStatus.OK)
  restore(
    @CurrentUser() actor: AuthContext,
    @Param('id', ParseUUIDPipe) targetId: string,
  ) {
    return this.usersService.restoreUser(actor.userId, targetId);
  }
}
