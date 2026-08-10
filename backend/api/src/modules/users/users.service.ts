import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { users } from '../../database/schema/index';
import { AuditService } from '../../common/audit/audit.service';
import type { UserProfile } from '@platform/types';
import type { UpdateProfileInput } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger('UsersService');

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Get the current user's public profile.
   * Never returns supabase_auth_id.
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.db.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    return this.toProfile(user);
  }

  /**
   * Update the current user's profile.
   *
   * ALLOWED: name, phone, avatarUrl
   * BLOCKED: status, supabaseAuthId, email, role, permissions, organizationId
   *
   * Double-enforced: Zod .strict() at DTO level + explicit field allowlist here.
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const user = await this.db.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    const [updated] = await this.db.db
      .update(users)
      .set({
        // Explicit allowlist — only these fields are ever updated
        name: input.name ?? user.name,
        phone: input.phone !== undefined ? input.phone ?? null : user.phone,
        avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl ?? null : user.avatarUrl,
        updatedAt: new Date(),
        // NEVER update: supabaseAuthId, status, email
      })
      .where(eq(users.id, userId))
      .returning();

    return this.toProfile(updated!);
  }

  /**
   * Suspend a user account. Platform admin action only.
   * Guards enforce 'user.suspend' permission before this is called.
   */
  async suspendUser(
    actorId: string,
    targetUserId: string,
    reason: string,
    requestId?: string,
  ): Promise<void> {
    const target = await this.db.db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!target) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    if (target.status === 'suspended') {
      throw new ForbiddenException({ code: 'USER_ALREADY_SUSPENDED' });
    }

    await this.db.db
      .update(users)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    this.audit.log({
      actorUserId: actorId,
      action: 'admin.user_suspended',
      category: 'admin',
      entityType: 'user',
      entityId: targetUserId,
      metadata: { reason, targetEmail: target.email },
      requestId,
    });

    this.logger.log(`User ${targetUserId} suspended by admin ${actorId}`);
  }

  /**
   * Restore a suspended user account. Platform admin action only.
   */
  async restoreUser(
    actorId: string,
    targetUserId: string,
    requestId?: string,
  ): Promise<void> {
    const target = await this.db.db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!target) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    if (target.status !== 'suspended') {
      throw new ForbiddenException({ code: 'USER_NOT_SUSPENDED' });
    }

    await this.db.db
      .update(users)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    this.audit.log({
      actorUserId: actorId,
      action: 'admin.user_restored',
      category: 'admin',
      entityType: 'user',
      entityId: targetUserId,
      metadata: { targetEmail: target.email },
      requestId,
    });
  }

  /**
   * List users — admin only.
   */
  async listUsers(page = 1, pageSize = 25) {
    const offset = (page - 1) * pageSize;
    const allUsers = await this.db.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .limit(pageSize)
      .offset(offset)
      .execute();

    return allUsers.map((u) => ({
      ...u,
      email: u.email ?? null,
      createdAt: u.createdAt.toISOString(),
    }));
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
