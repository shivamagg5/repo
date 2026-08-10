import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { users } from '../../database/schema/index';
import { AuditService } from '../../common/audit/audit.service';
import type { UserProfile, AuthContext } from '@platform/types';
import type { SyncUserBody } from './dto/sync-user.dto';
import { RbacService } from './rbac.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly db: DatabaseService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Upsert the application user from a verified Supabase identity.
   *
   * SECURITY INVARIANTS:
   * - supabaseAuthId and email come ONLY from the verified JWT (req.user).
   * - The request body may only supply: name, avatarUrl (profile info).
   * - This operation is idempotent — safe to call on every login.
   * - Duplicate users are prevented by the UNIQUE constraint on supabase_auth_id.
   *
   * @param supabaseAuthId - from verified Supabase JWT (req.user.supabaseAuthId)
   * @param email          - from verified Supabase JWT (req.user.email)
   * @param body           - safe profile fields from request body (name, avatarUrl)
   */
  async syncUser(
    supabaseAuthId: string,
    email: string | null,
    body: SyncUserBody,
  ): Promise<UserProfile> {
    const name = body.name ?? email?.split('@')[0] ?? 'User';

    // Upsert: if supabase_auth_id exists, update profile info only
    // Status, email, and supabaseAuthId are NEVER updated from body
    const [result] = await this.db.db
      .insert(users)
      .values({
        supabaseAuthId,
        email: email ?? undefined,
        name,
        avatarUrl: body.avatarUrl ?? undefined,
        status: 'active',
      })
      .onConflictDoUpdate({
        target: users.supabaseAuthId,
        set: {
          // Update safe profile fields; never update status or supabaseAuthId
          name,
          avatarUrl: body.avatarUrl ?? undefined,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!result) {
      throw new ConflictException('Failed to sync user');
    }

    // Audit on first creation (name was derived from email = likely first time)
    if (result.createdAt === result.updatedAt) {
      this.audit.log({
        actorUserId: result.id,
        action: 'auth.user_created',
        category: 'auth',
        entityType: 'user',
        entityId: result.id,
        metadata: { supabaseAuthId },
      });
    }

    return this.toProfile(result);
  }

  /**
   * Get the current user's profile (safe fields only).
   * Never returns supabase_auth_id or internal fields.
   */
  async getMe(userId: string): Promise<UserProfile | null> {
    const user = await this.db.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) return null;
    return this.toProfile(user);
  }

  /**
   * Load the full auth context for a given supabaseAuthId.
   * Used by the auth middleware after JWT verification.
   */
  async getUserWithContext(supabaseAuthId: string): Promise<AuthContext | null> {
    const user = await this.db.db.query.users.findFirst({
      where: eq(users.supabaseAuthId, supabaseAuthId),
    });
    if (!user) return null;

    const permKeys = await this.rbac.getUserPermissions(user.id);

    return {
      userId: user.id,
      supabaseAuthId,
      email: user.email ?? null,
      status: user.status,
      permissions: permKeys,
    };
  }

  /**
   * Audit a logout event. Actual session invalidation is handled client-side
   * via Supabase Auth — the backend cannot revoke Supabase tokens directly
   * without the admin API (deferred to Task 14 — Security Hardening).
   */
  async logout(userId: string, requestId?: string): Promise<void> {
    this.audit.log({
      actorUserId: userId,
      action: 'auth.logout',
      category: 'auth',
      entityType: 'user',
      entityId: userId,
      metadata: {},
      requestId,
    });
  }

  private toProfile(user: typeof users.$inferSelect): UserProfile {
    return {
      id: user.id,
      email: user.email ?? null,
      name: user.name,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
