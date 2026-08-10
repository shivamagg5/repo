import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  organizations,
  organizationMembers,
  roles,
} from '../../database/schema/index';
import { AuditService } from '../../common/audit/audit.service';
import { RbacService } from '../auth/rbac.service';
import type { CreateOrganizationInput, UpdateOrganizationInput } from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger('OrganizationsService');

  constructor(
    private readonly db: DatabaseService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create an organization and assign the creator as owner.
   *
   * TRANSACTION: Organization creation + owner membership creation are atomic.
   * If either fails, neither is committed.
   */
  async create(actorId: string, input: CreateOrganizationInput) {
    // Check slug uniqueness before starting transaction
    const existing = await this.db.db.query.organizations.findFirst({
      where: eq(organizations.slug, input.slug),
    });
    if (existing) {
      throw new ConflictException({
        code: 'SLUG_TAKEN',
        message: `The slug "${input.slug}" is already in use.`,
      });
    }

    // Find the owner role for this org type
    const ownerRole = await this.db.db.query.roles.findFirst({
      where: eq(roles.name, 'owner'),
    });

    // We need the specific org-type owner role
    const orgOwnerRole = await this.db.db
      .select()
      .from(roles)
      .where(eq(roles.organizationType, input.type))
      .execute()
      .then((r) => r.find((ro) => ro.name === 'owner'));

    if (!orgOwnerRole) {
      throw new NotFoundException({
        code: 'OWNER_ROLE_NOT_FOUND',
        message: `Owner role for org type "${input.type}" not found. Run the permission seeder first.`,
      });
    }

    // Atomic transaction: create org + owner membership
    const result = await this.db.db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({
          type: input.type,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          logoUrl: input.logoUrl ?? null,
          status: 'active', // New orgs start as active for development; review for production
        })
        .returning();

      if (!org) throw new Error('Organization creation failed');

      await tx.insert(organizationMembers).values({
        organizationId: org.id,
        userId: actorId,
        roleId: orgOwnerRole.id,
        status: 'active',
      });

      return org;
    });

    this.audit.log({
      actorUserId: actorId,
      action: 'organization.created',
      category: 'organization',
      entityType: 'organization',
      entityId: result.id,
      metadata: { name: result.name, slug: result.slug, type: result.type },
    });

    return result;
  }

  /**
   * List organizations the current user is an active member of.
   */
  async findMyOrganizations(userId: string) {
    const memberships = await this.db.db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))
      .execute();

    if (!memberships.length) return [];

    const orgIds = memberships.map((m) => m.organizationId);

    return this.db.db
      .select()
      .from(organizations)
      .where(inArray(organizations.id, orgIds))
      .execute();
  }

  /**
   * Get a single organization — only if the requesting user is a member.
   * Organization scope is enforced here — non-members cannot view org details.
   */
  async findOne(actorId: string, orgId: string) {
    // Enforce org membership scope
    await this.rbac.assertOrgMembership(actorId, orgId);

    const org = await this.db.db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!org) {
      throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
    }

    return org;
  }

  /**
   * Update organization. Requires organization.edit permission in org scope.
   *
   * BLOCKED: slug, type, status, id
   */
  async update(actorId: string, orgId: string, input: UpdateOrganizationInput) {
    // Org membership + permission check (org-scoped, not global)
    await this.rbac.assertOrgMembership(actorId, orgId);
    await this.rbac.assertPermissionInOrg(actorId, orgId, 'organization.edit');

    const [updated] = await this.db.db
      .update(organizations)
      .set({
        name: input.name ?? undefined,
        description: input.description !== undefined ? input.description : undefined,
        logoUrl: input.logoUrl !== undefined ? input.logoUrl : undefined,
        updatedAt: new Date(),
        // NEVER update: slug, type, status
      })
      .where(eq(organizations.id, orgId))
      .returning();

    this.audit.log({
      actorUserId: actorId,
      action: 'organization.updated',
      category: 'organization',
      entityType: 'organization',
      entityId: orgId,
      metadata: { changes: input },
    });

    return updated;
  }
}
