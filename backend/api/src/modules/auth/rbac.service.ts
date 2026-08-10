import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  organizationMembers,
  roles,
  rolePermissions,
  permissions,
  organizations,
} from '../../database/schema/index';
import type { PermissionKey, PlatformRole } from '@platform/types';
import { PLATFORM_ROLES } from '@platform/types';

export interface OrgMembership {
  membershipId: string;
  organizationId: string;
  userId: string;
  roleId: string;
  roleName: string;
  organizationType: string | null;
  status: string;
}

/**
 * RbacService — authoritative source for organization-scoped authorization.
 *
 * IMPORTANT: The flattened permissions[] in AuthContext is for platform-level checks only.
 * For ANY organization-scoped resource, use these methods:
 *   checkOrgMembership()     — verify active membership
 *   checkPermissionInOrg()   — verify permission within org scope
 *   assertPermissionInOrg()  — same but throws on failure
 *   isOrgRole()              — verify a role is org-scoped (not platform-level)
 *   validateRoleForOrg()     — verify role is valid for a given org type
 */
@Injectable()
export class RbacService {
  private readonly logger = new Logger('RbacService');

  constructor(private readonly db: DatabaseService) {}

  /**
   * Load all permission keys for a user across all active org memberships.
   * Used by auth middleware for the flattened permissions[] context.
   */
  async getUserPermissions(userId: string): Promise<PermissionKey[]> {
    const rows = await this.db.db
      .select({ key: permissions.key })
      .from(organizationMembers)
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.status, 'active'),
        ),
      )
      .execute();

    return [...new Set(rows.map((r) => r.key as PermissionKey))];
  }

  /**
   * Check if a user has an active membership in a specific organization.
   * Returns the membership or null.
   *
   * This is the PRIMARY org-scope check. Must be called for ALL org-scoped operations.
   */
  async checkOrgMembership(
    userId: string,
    orgId: string,
  ): Promise<OrgMembership | null> {
    const row = await this.db.db
      .select({
        membershipId: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        roleId: organizationMembers.roleId,
        roleName: roles.name,
        organizationType: roles.organizationType,
        status: organizationMembers.status,
      })
      .from(organizationMembers)
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.status, 'active'),
        ),
      )
      .limit(1)
      .execute();

    return row[0] ?? null;
  }

  /**
   * Asserts the user has active membership. Throws 403 if not.
   */
  async assertOrgMembership(userId: string, orgId: string): Promise<OrgMembership> {
    const membership = await this.checkOrgMembership(userId, orgId);
    if (!membership) {
      throw new ForbiddenException({
        code: 'NOT_ORG_MEMBER',
        message: 'You are not a member of this organization.',
      });
    }
    return membership;
  }

  /**
   * Check if user has a specific permission within a specific organization.
   *
   * SECURITY: This is the authoritative org-scoped permission check.
   * The flattened permissions[] in AuthContext must NOT be used for this.
   *
   * Authorization model: membership active + role has permission
   */
  async checkPermissionInOrg(
    userId: string,
    orgId: string,
    permission: PermissionKey | string,
  ): Promise<boolean> {
    const rows = await this.db.db
      .select({ key: permissions.key })
      .from(organizationMembers)
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.status, 'active'),
          eq(permissions.key, permission),
        ),
      )
      .limit(1)
      .execute();

    return rows.length > 0;
  }

  /**
   * Assert user has permission in org. Throws 403 if not.
   */
  async assertPermissionInOrg(
    userId: string,
    orgId: string,
    permission: PermissionKey | string,
  ): Promise<void> {
    const has = await this.checkPermissionInOrg(userId, orgId, permission);
    if (!has) {
      this.logger.warn(
        `User ${userId} lacks permission ${permission} in org ${orgId}`,
      );
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to perform this action.',
      });
    }
  }

  /**
   * Check if user has a platform-level role (organization_type IS NULL).
   * Platform roles: super_admin, finance_admin, operations_admin, etc.
   */
  async isPlatformRole(userId: string, roleName: PlatformRole): Promise<boolean> {
    const rows = await this.db.db
      .select({ id: roles.id })
      .from(organizationMembers)
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.status, 'active'),
          eq(roles.name, roleName),
        ),
      )
      .limit(1)
      .execute();

    return rows.length > 0;
  }

  /**
   * Check if a role is an org-scoped role (NOT a platform role).
   *
   * SECURITY: Used to prevent org admins from assigning platform roles
   * (super_admin, finance_admin, etc.) via org invite/role-change APIs.
   * Organization roles have organization_type NOT NULL.
   */
  async isOrgRole(roleId: string): Promise<boolean> {
    const row = await this.db.db
      .select({ organizationType: roles.organizationType })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1)
      .execute();

    if (!row[0]) return false;

    // Platform roles have organization_type = NULL
    // Org roles have a specific organization_type
    return row[0].organizationType !== null;
  }

  /**
   * Validate that a role is appropriate for a given organization type.
   *
   * SECURITY:
   * - Org admins can only assign roles matching their org's type
   * - Platform roles (organizationType=NULL) can NEVER be assigned via org APIs
   *
   * @returns true if the role is valid for the org type AND is not a platform role
   */
  async validateRoleForOrg(
    roleId: string,
    orgType: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    const row = await this.db.db
      .select({ organizationType: roles.organizationType, name: roles.name })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1)
      .execute();

    if (!row[0]) {
      return { valid: false, reason: 'ROLE_NOT_FOUND' };
    }

    const role = row[0];

    // Platform roles have organizationType = NULL — never assignable via org APIs
    if (role.organizationType === null) {
      this.logger.warn(
        `Attempt to assign platform role "${role.name}" via org API for org type "${orgType}"`,
      );
      return {
        valid: false,
        reason: 'PLATFORM_ROLE_NOT_ASSIGNABLE_VIA_ORG_API',
      };
    }

    // Also block if role name matches known platform roles (defense in depth)
    if (PLATFORM_ROLES.includes(role.name as PlatformRole)) {
      return {
        valid: false,
        reason: 'PLATFORM_ROLE_NOT_ASSIGNABLE_VIA_ORG_API',
      };
    }

    // Role must match the org's type
    if (role.organizationType !== orgType) {
      return {
        valid: false,
        reason: `ROLE_WRONG_ORG_TYPE: expected "${orgType}", got "${role.organizationType}"`,
      };
    }

    return { valid: true };
  }

  /**
   * Get the active membership count for a user in a specific org.
   * Used to prevent removing the last owner.
   */
  async countOwnersInOrg(orgId: string, ownerRoleName = 'owner'): Promise<number> {
    const rows = await this.db.db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.status, 'active'),
          eq(roles.name, ownerRoleName),
        ),
      )
      .execute();

    return rows.length;
  }

  /**
   * Verify that the user's org membership is for the correct org.
   * Used when URL :id is provided as a consistency check alongside the
   * invitation record's organization_id.
   *
   * SECURITY NOTE: The invitation record is ALWAYS the source of truth for
   * organization scope. The URL :id is only a consistency check.
   */
  async verifyOrgConsistency(
    invitationOrgId: string,
    requestOrgId: string | undefined,
  ): Promise<void> {
    if (requestOrgId && requestOrgId !== invitationOrgId) {
      this.logger.warn(
        `Org ID mismatch: invitation org=${invitationOrgId}, request org=${requestOrgId}`,
      );
      throw new ForbiddenException({
        code: 'ORG_SCOPE_MISMATCH',
        message: 'The invitation does not belong to the specified organization.',
      });
    }
  }
}
