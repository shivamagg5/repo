import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  users,
  organizationMembers,
  roles,
  rolePermissions,
  permissions,
} from '../../database/schema/index';
import type { AuthContext, PermissionKey } from '@platform/types';

/**
 * AuthMiddleware — verifies Supabase Auth JWTs and loads the application user.
 *
 * Flow for EVERY request (except public routes):
 *   1. Check for Authorization: Bearer <token>
 *   2. If no token present → pass through (route guards handle enforcement)
 *   3. If token present → verify with Supabase (service-role client, created once)
 *   4. Load application user WHERE supabase_auth_id = $jwt_sub
 *   5. Reject suspended or deleted users (403/401)
 *   6. Load all permission keys across all active org memberships (flattened)
 *   7. Attach AuthContext to req.user
 *
 * SECURITY INVARIANTS:
 * - userId, email, role, permissions are NEVER read from the request body/headers.
 * - All identity comes from the verified Supabase JWT.
 * - The flattened permissions[] is for PLATFORM-LEVEL checks only.
 *   Organization-scoped checks use RbacService.checkPermissionInOrg().
 * - Supabase client is created ONCE at module init, not per-request.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware, OnModuleInit {
  private readonly logger = new Logger('AuthMiddleware');
  private supabase!: SupabaseClient;

  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!url || !key) {
      this.logger.warn(
        'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured. ' +
          'JWT verification will not work until credentials are provided.',
      );
      return;
    }

    // Service-role client — used ONLY for JWT verification via getUser()
    // This key bypasses RLS — NEVER expose it to clients
    this.supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.logger.log('Supabase service-role client initialized');
  }

  use(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];

    // No bearer token — pass through (AuthGuard will enforce if needed)
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7);

    // Test environment bypass — ONLY active when NODE_ENV=test and special header is set
    if (
      process.env['NODE_ENV'] === 'test' &&
      req.headers['x-test-user-id']
    ) {
      const testUserId = req.headers['x-test-user-id'] as string;
      const testPermissions = req.headers['x-test-permissions']
        ? (req.headers['x-test-permissions'] as string).split(',').filter(Boolean)
        : [];
      const testStatus = (req.headers['x-test-status'] as string) ?? 'active';

      (req as Request & { user?: AuthContext }).user = {
        userId: testUserId,
        supabaseAuthId: testUserId,
        email: null,
        status: testStatus as 'active' | 'suspended' | 'deleted',
        permissions: testPermissions as PermissionKey[],
      };
      return next();
    }

    if (!this.supabase) {
      this.logger.warn('Supabase client not initialized — skipping JWT verification');
      return next();
    }

    // Verify token with Supabase (non-blocking async)
    void this.verifyAndAttach(token, req, next);
  }

  private async verifyAndAttach(
    token: string,
    req: Request,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Verify JWT with Supabase — this validates signature + expiry
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data.user) {
        return next(new UnauthorizedException('Invalid or expired token'));
      }

      const supabaseAuthId = data.user.id;
      const supabaseEmail = data.user.email ?? null;

      // Load the application user by supabase_auth_id
      const appUser = await this.db.db.query.users.findFirst({
        where: eq(users.supabaseAuthId, supabaseAuthId),
      });

      if (!appUser) {
        // Token is valid but no application user exists yet.
        // The client must call POST /auth/sync to create the app user.
        // For now, pass through with minimal context so /auth/sync can work.
        (req as Request & { user?: AuthContext }).user = {
          userId: '',        // No app user yet — sync endpoint handles this
          supabaseAuthId,
          email: supabaseEmail,
          status: 'active',
          permissions: [],
        };
        return next();
      }

      // Enforce user lifecycle
      if (appUser.status === 'suspended') {
        return next(
          new ForbiddenException({
            code: 'USER_SUSPENDED',
            message: 'Your account has been suspended.',
          }),
        );
      }
      if (appUser.status === 'deleted') {
        return next(
          new UnauthorizedException({
            code: 'ACCOUNT_DELETED',
            message: 'This account no longer exists.',
          }),
        );
      }

      // Load all permissions across all ACTIVE org memberships (flattened)
      // Used for platform-level checks only.
      // Org-scoped checks use RbacService.checkPermissionInOrg() separately.
      const memberPermRows = await this.db.db
        .select({ key: permissions.key })
        .from(organizationMembers)
        .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
        .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(eq(organizationMembers.userId, appUser.id))
        .execute();

      const permissionKeys = [
        ...new Set(memberPermRows.map((r) => r.key as PermissionKey)),
      ];

      const authCtx: AuthContext = {
        userId: appUser.id,
        supabaseAuthId,
        email: appUser.email ?? supabaseEmail,
        status: appUser.status,
        permissions: permissionKeys,
      };

      (req as Request & { user?: AuthContext }).user = authCtx;
      next();
    } catch (err: unknown) {
      this.logger.error('Auth middleware error', err);
      next(new UnauthorizedException('Authentication failed'));
    }
  }
}
