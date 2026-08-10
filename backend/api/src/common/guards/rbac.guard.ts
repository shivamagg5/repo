import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthContext } from '@platform/types';

/**
 * RbacGuard — enforces permission-based access control.
 *
 * IMPORTANT SECURITY NOTE:
 * This guard handles PLATFORM-LEVEL permission checks using the flattened
 * permissions[] in AuthContext. It is NOT sufficient for organization-scoped
 * resource authorization.
 *
 * For org-scoped resources, controllers/services must additionally call:
 *   rbacService.checkOrgMembership(userId, orgId)
 *   rbacService.checkPermissionInOrg(userId, orgId, permission)
 *
 * Authorization model:
 *   1. Is route public? → allow
 *   2. Is user authenticated? → 401 if not
 *   3. Is user status 'active'? → 403 USER_SUSPENDED if not
 *   4. Does route require permissions? → check all present in user.permissions[]
 *
 * Usage:
 *   @UseGuards(AuthGuard, RbacGuard)
 *   @RequirePermissions('event.publish')
 *   async publishEvent() { ... }
 */
@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger('RbacGuard');

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip if explicitly marked public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthContext }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Reject suspended or deleted users before any permission check
    if (user.status === 'suspended') {
      throw new ForbiddenException({
        code: 'USER_SUSPENDED',
        message: 'Your account has been suspended.',
      });
    }
    if (user.status === 'deleted') {
      throw new UnauthorizedException({
        code: 'ACCOUNT_DELETED',
        message: 'This account no longer exists.',
      });
    }

    // Read required permissions from route metadata
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No specific permissions required — authenticated + active user is enough
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const userPermissions: string[] = user.permissions ?? [];

    // Check that the user has ALL required permissions
    const hasAll = requiredPermissions.every((p) => userPermissions.includes(p));

    if (!hasAll) {
      const missing = requiredPermissions.filter((p) => !userPermissions.includes(p));
      this.logger.warn(
        `User ${user.userId} denied. Required: [${requiredPermissions.join(', ')}]. Missing: [${missing.join(', ')}]`,
      );
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to perform this action.',
      });
    }

    return true;
  }
}
