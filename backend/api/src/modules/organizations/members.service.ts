import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Logger,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import {
  organizationMembers,
  organizationInvitations,
  organizations,
  users,
  roles,
} from '../../database/schema/index';
import { AuditService } from '../../common/audit/audit.service';
import { RbacService } from '../auth/rbac.service';
import type { InviteMemberInput, ChangeRoleInput } from './dto/organization.dto';

/**
 * Hash an invitation token for safe storage.
 * Only the hash is stored in DB — never the raw token.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class MembersService {
  private readonly logger = new Logger('MembersService');

  constructor(
    private readonly db: DatabaseService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
  ) {}

  /**
   * List active members of an organization.
   * Requires the actor to be a member of the org.
   */
  async listMembers(actorId: string, orgId: string) {
    // Org membership scope enforced
    await this.rbac.assertOrgMembership(actorId, orgId);

    return this.db.db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
        roleId: organizationMembers.roleId,
        roleName: roles.name,
        status: organizationMembers.status,
        createdAt: organizationMembers.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(organizationMembers)
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.status, 'active'),
        ),
      )
      .execute();
  }

  /**
   * Invite a user to the organization.
   *
   * SECURITY CHECKS:
   *   1. Actor must have active membership in org
   *   2. Actor must have 'member.invite' permission in org (org-scoped check)
   *   3. Role being assigned must be an org-scoped role (not a platform role)
   *   4. Role's organization_type must match the org's type
   *   5. No existing active membership for invited email
   *   6. Token is generated server-side — never trusted from client
   *   7. Only token_hash (sha256) is stored; raw token returned once in response
   */
  async invite(actorId: string, orgId: string, input: InviteMemberInput) {
    // 1. Verify actor membership (org-scoped)
    await this.rbac.assertOrgMembership(actorId, orgId);

    // 2. Verify org-scoped permission
    await this.rbac.assertPermissionInOrg(actorId, orgId, 'member.invite');

    // 3. Load org to get type
    const org = await this.db.db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });
    if (!org) throw new NotFoundException({ code: 'ORG_NOT_FOUND' });

    // 4. Validate that role is org-scoped and matches this org's type
    const roleValidation = await this.rbac.validateRoleForOrg(input.roleId, org.type);
    if (!roleValidation.valid) {
      throw new ForbiddenException({
        code: 'INVALID_ROLE_FOR_ORG',
        message: roleValidation.reason ?? 'Invalid role for this organization type.',
      });
    }

    // 5. Check no existing active membership for the invited email
    const existingUser = await this.db.db.query.users.findFirst({
      where: eq(users.email, input.email),
    });
    if (existingUser) {
      const existingMembership = await this.rbac.checkOrgMembership(existingUser.id, orgId);
      if (existingMembership) {
        throw new ConflictException({
          code: 'ALREADY_MEMBER',
          message: 'This user is already a member of the organization.',
        });
      }
    }

    // 6. Generate token server-side — never from client
    const rawToken = uuidv4();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 7. Insert invitation (stores hash, not raw token)
    await this.db.db.insert(organizationInvitations).values({
      organizationId: orgId,
      invitedEmail: input.email,
      roleId: input.roleId,
      invitedBy: actorId,
      tokenHash,
      status: 'pending',
      expiresAt,
    });

    // Audit: store token_hash only — NEVER the raw token
    this.audit.log({
      actorUserId: actorId,
      action: 'member.invited',
      category: 'membership',
      entityType: 'organization_invitation',
      entityId: orgId,
      metadata: {
        invitedEmail: input.email,
        roleId: input.roleId,
        tokenHash,
        orgId,
      },
    });

    // Return the raw token ONCE — this is the only time it is ever exposed
    return {
      message: 'Invitation sent',
      token: rawToken,
      invitedEmail: input.email,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Accept an invitation.
   *
   * INVITATION RECORD IS THE SOURCE OF TRUTH for organization and role.
   * The client provides only the token. The org_id in the URL (if any) is
   * only a consistency check and must NEVER override the invitation's org_id.
   *
   * Verification order (all within one DB transaction):
   *   1. Hash the provided token
   *   2. Find invitation by token_hash (SELECT FOR UPDATE to prevent concurrent accept)
   *   3. Verify status = 'pending'
   *   4. Verify expires_at > now()
   *   5. Verify acceptor's email matches invitation.invited_email (case-insensitive)
   *   6. Verify org consistency with URL param if provided
   *   7. Verify the role is still valid for the org
   *   8. Verify no duplicate membership exists (also enforced by UNIQUE constraint)
   *   9. Create membership + consume invitation (atomic)
   */
  async acceptInvitation(
    rawToken: string,
    acceptorUserId: string,
    consistencyOrgId?: string,  // From URL :id — consistency check only
  ) {
    const tokenHash = hashToken(rawToken);

    return this.db.db.transaction(async (tx) => {
      // SELECT FOR UPDATE prevents concurrent acceptance of the same invitation
      const invRows = await tx
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.tokenHash, tokenHash))
        .for('update')
        .limit(1)
        .execute();

      const invitation = invRows[0];

      // 1. Token not found
      if (!invitation) {
        throw new NotFoundException({
          code: 'INVITATION_NOT_FOUND',
          message: 'Invitation not found.',
        });
      }

      // 2. Already used or revoked
      if (invitation.status !== 'pending') {
        throw new ConflictException({
          code: 'INVITATION_ALREADY_USED',
          message: 'This invitation has already been used or revoked.',
        });
      }

      // 3. Expired
      if (invitation.expiresAt < new Date()) {
        // Mark as expired (idempotent)
        await tx
          .update(organizationInvitations)
          .set({ status: 'expired' })
          .where(eq(organizationInvitations.id, invitation.id));
        throw new GoneException({
          code: 'INVITATION_EXPIRED',
          message: 'This invitation has expired.',
        });
      }

      // 4. Load the acceptor's email
      const acceptor = await tx.query.users.findFirst({
        where: eq(users.id, acceptorUserId),
      });
      if (!acceptor) {
        throw new NotFoundException({ code: 'USER_NOT_FOUND' });
      }

      // 5. Email must match (case-insensitive — both are citext)
      // citext comparison is case-insensitive at DB level; we normalize here as extra safety
      const acceptorEmail = (acceptor.email ?? '').toLowerCase().trim();
      const invitedEmail = invitation.invitedEmail.toLowerCase().trim();
      if (acceptorEmail !== invitedEmail) {
        this.audit.log({
          actorUserId: acceptorUserId,
          action: 'security.invitation_email_mismatch',
          category: 'security',
          entityType: 'organization_invitation',
          metadata: { tokenHash, orgId: invitation.organizationId },
        });
        throw new ForbiddenException({
          code: 'INVITATION_EMAIL_MISMATCH',
          message: 'This invitation was sent to a different email address.',
        });
      }

      // 6. Org consistency check (invitation is authoritative — URL param is advisory only)
      if (consistencyOrgId) {
        await this.rbac.verifyOrgConsistency(invitation.organizationId, consistencyOrgId);
      }

      // 7. Verify the role is still valid
      const org = await tx.query.organizations.findFirst({
        where: eq(organizations.id, invitation.organizationId),
      });
      if (!org) throw new NotFoundException({ code: 'ORG_NOT_FOUND' });

      const roleValidation = await this.rbac.validateRoleForOrg(invitation.roleId, org.type);
      if (!roleValidation.valid) {
        throw new ForbiddenException({
          code: 'INVALID_ROLE_FOR_ORG',
          message: 'The role on this invitation is no longer valid.',
        });
      }

      // 8. Check no duplicate membership (DB UNIQUE constraint is backup)
      const existingMembership = await tx
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, invitation.organizationId),
            eq(organizationMembers.userId, acceptorUserId),
            eq(organizationMembers.status, 'active'),
          ),
        )
        .limit(1)
        .execute();

      if (existingMembership.length > 0) {
        throw new ConflictException({
          code: 'ALREADY_MEMBER',
          message: 'You are already a member of this organization.',
        });
      }

      // 9. ATOMIC: Create membership + consume invitation
      const [membership] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: invitation.organizationId,
          userId: acceptorUserId,
          roleId: invitation.roleId,
          status: 'active',
        })
        .returning();

      await tx
        .update(organizationInvitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedBy: acceptorUserId,
        })
        .where(eq(organizationInvitations.id, invitation.id));

      // Audit: token_hash only, never raw token
      this.audit.log({
        actorUserId: acceptorUserId,
        action: 'member.accepted',
        category: 'membership',
        entityType: 'organization_member',
        entityId: membership?.id,
        metadata: {
          tokenHash,
          orgId: invitation.organizationId,
          roleId: invitation.roleId,
        },
      });

      this.logger.log(
        `User ${acceptorUserId} accepted invitation to org ${invitation.organizationId}`,
      );

      return membership;
    });
  }

  /**
   * Remove a member from the organization.
   *
   * SECURITY:
   *   - Requires 'member.remove' permission in org (org-scoped)
   *   - Cannot remove the last owner of an org
   */
  async removeMember(actorId: string, orgId: string, targetUserId: string) {
    // Verify actor membership + org-scoped permission
    await this.rbac.assertOrgMembership(actorId, orgId);
    await this.rbac.assertPermissionInOrg(actorId, orgId, 'member.remove');

    // Load target membership
    const target = await this.db.db
      .select()
      .from(organizationMembers)
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, targetUserId),
          eq(organizationMembers.status, 'active'),
        ),
      )
      .limit(1)
      .execute();

    if (!target[0]) {
      throw new NotFoundException({ code: 'MEMBER_NOT_FOUND' });
    }

    // Prevent removing the last owner
    if (target[0].roles.name === 'owner') {
      const ownerCount = await this.rbac.countOwnersInOrg(orgId, 'owner');
      if (ownerCount <= 1) {
        throw new ForbiddenException({
          code: 'LAST_OWNER',
          message: 'Cannot remove the last owner of an organization.',
        });
      }
    }

    await this.db.db
      .update(organizationMembers)
      .set({ status: 'removed' })
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, targetUserId),
        ),
      );

    this.audit.log({
      actorUserId: actorId,
      action: 'member.removed',
      category: 'membership',
      entityType: 'organization_member',
      metadata: { orgId, removedUserId: targetUserId },
    });
  }

  /**
   * Change a member's role in the organization.
   *
   * SECURITY:
   *   - Requires 'member.manage' permission in org (org-scoped)
   *   - New role must be an org-scoped role (not a platform role)
   *   - New role must match org type
   *   - Cannot self-demote if last owner
   */
  async changeRole(
    actorId: string,
    orgId: string,
    targetUserId: string,
    input: ChangeRoleInput,
  ) {
    // Verify actor membership + org-scoped permission
    await this.rbac.assertOrgMembership(actorId, orgId);
    await this.rbac.assertPermissionInOrg(actorId, orgId, 'member.manage');

    // Load org type
    const org = await this.db.db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });
    if (!org) throw new NotFoundException({ code: 'ORG_NOT_FOUND' });

    // SECURITY: Validate new role is org-scoped, correct type — never a platform role
    const roleValidation = await this.rbac.validateRoleForOrg(input.roleId, org.type);
    if (!roleValidation.valid) {
      throw new ForbiddenException({
        code: 'INVALID_ROLE_FOR_ORG',
        message: roleValidation.reason ?? 'Invalid role for this organization.',
      });
    }

    // Load current membership
    const current = await this.db.db
      .select()
      .from(organizationMembers)
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, targetUserId),
          eq(organizationMembers.status, 'active'),
        ),
      )
      .limit(1)
      .execute();

    if (!current[0]) {
      throw new NotFoundException({ code: 'MEMBER_NOT_FOUND' });
    }

    const currentRoleName = current[0].roles.name;
    const oldRoleId = current[0].organization_members.roleId;

    // Prevent self-demotion if last owner
    const newRole = await this.db.db.query.roles.findFirst({
      where: eq(roles.id, input.roleId),
    });
    if (
      currentRoleName === 'owner' &&
      newRole?.name !== 'owner' &&
      targetUserId === actorId
    ) {
      const ownerCount = await this.rbac.countOwnersInOrg(orgId, 'owner');
      if (ownerCount <= 1) {
        throw new ForbiddenException({
          code: 'LAST_OWNER',
          message: 'Cannot demote yourself as the last owner.',
        });
      }
    }

    const [updated] = await this.db.db
      .update(organizationMembers)
      .set({ roleId: input.roleId })
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, targetUserId),
        ),
      )
      .returning();

    this.audit.log({
      actorUserId: actorId,
      action: 'member.role_changed',
      category: 'membership',
      entityType: 'organization_member',
      entityId: updated?.id,
      metadata: {
        orgId,
        targetUserId,
        oldRoleId,
        newRoleId: input.roleId,
      },
    });

    return updated;
  }
}
