import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { roles, permissions, rolePermissions } from '../../database/schema/index';
import { PERMISSIONS } from '@platform/types';

// ---------------------------------------------------------------------------
// Canonical permissions — matches PERMISSIONS constant in @platform/types
// ---------------------------------------------------------------------------
const ALL_PERMISSIONS: Array<{ key: string; description: string }> = [
  { key: PERMISSIONS.PROFILE_VIEW, description: 'View user profile' },
  { key: PERMISSIONS.PROFILE_EDIT, description: 'Edit own profile' },
  { key: PERMISSIONS.ORG_CREATE, description: 'Create an organization' },
  { key: PERMISSIONS.ORG_EDIT, description: 'Edit organization settings' },
  { key: PERMISSIONS.ORG_DELETE, description: 'Delete an organization' },
  { key: PERMISSIONS.MEMBER_INVITE, description: 'Invite members to organization' },
  { key: PERMISSIONS.MEMBER_REMOVE, description: 'Remove members from organization' },
  { key: PERMISSIONS.MEMBER_MANAGE, description: 'Manage organization member roles' },
  { key: PERMISSIONS.EVENT_CREATE, description: 'Create events' },
  { key: PERMISSIONS.EVENT_EDIT, description: 'Edit events' },
  { key: PERMISSIONS.EVENT_PUBLISH, description: 'Publish events' },
  { key: PERMISSIONS.EVENT_CANCEL, description: 'Cancel events' },
  { key: PERMISSIONS.EVENT_VIEW_ANALYTICS, description: 'View event analytics' },
  { key: PERMISSIONS.EVENT_APPROVE, description: 'Approve events (admin)' },
  { key: PERMISSIONS.EVENT_REJECT, description: 'Reject events (admin)' },
  { key: PERMISSIONS.EVENT_SUSPEND, description: 'Suspend events (admin)' },
  { key: PERMISSIONS.EVENT_FEATURE, description: 'Feature events on homepage' },
  { key: PERMISSIONS.VENUE_CREATE, description: 'Create venue profile' },
  { key: PERMISSIONS.VENUE_EDIT, description: 'Edit venue profile' },
  { key: PERMISSIONS.VENUE_DELETE, description: 'Delete venue profile' },
  { key: PERMISSIONS.VENUE_MANAGE_STAFF, description: 'Manage venue staff' },
  { key: PERMISSIONS.TICKET_MANAGE, description: 'Manage ticket types' },
  { key: PERMISSIONS.TICKET_VIEW, description: 'View ticket details' },
  { key: PERMISSIONS.TICKET_VOID, description: 'Void tickets' },
  { key: PERMISSIONS.TICKET_REFUND, description: 'Process ticket refunds' },
  { key: PERMISSIONS.TICKET_TRANSFER, description: 'Transfer tickets' },
  { key: PERMISSIONS.ORDER_VIEW, description: 'View orders' },
  { key: PERMISSIONS.ORDER_CANCEL, description: 'Cancel orders' },
  { key: PERMISSIONS.FINANCE_VIEW, description: 'View financial reports' },
  { key: PERMISSIONS.SETTLEMENT_VIEW, description: 'View settlements' },
  { key: PERMISSIONS.SETTLEMENT_APPROVE, description: 'Approve settlements' },
  { key: PERMISSIONS.SCANNER_USE, description: 'Use scanner for check-in' },
  { key: PERMISSIONS.SCANNER_MANAGE_DEVICES, description: 'Manage scanner devices' },
  { key: PERMISSIONS.PROMOTER_CREATE_CAMPAIGN, description: 'Create promoter campaigns' },
  { key: PERMISSIONS.PROMOTER_VIEW_EARNINGS, description: 'View promoter earnings' },
  { key: PERMISSIONS.CMS_MANAGE, description: 'Manage CMS content' },
  { key: PERMISSIONS.SUPPORT_VIEW, description: 'View support tickets' },
  { key: PERMISSIONS.SUPPORT_RESPOND, description: 'Respond to support tickets' },
  { key: PERMISSIONS.ADMIN_USERS_MANAGE, description: 'Manage platform users (admin)' },
  { key: PERMISSIONS.USER_SUSPEND, description: 'Suspend user accounts' },
  { key: PERMISSIONS.USER_RESTORE, description: 'Restore user accounts' },
  { key: PERMISSIONS.ADMIN_ROLES, description: 'Manage roles and permissions' },
  { key: PERMISSIONS.ADMIN_AUDIT, description: 'View audit logs' },
  { key: PERMISSIONS.ADMIN_MODERATION, description: 'Manage moderation cases' },
];

// ---------------------------------------------------------------------------
// Role definitions
// organization_type = 'organizer' | 'venue' | 'promoter' | null (platform roles)
// ---------------------------------------------------------------------------
const ROLE_DEFINITIONS = [
  // ---- Organizer roles ----
  {
    name: 'owner',
    orgType: 'organizer' as const,
    permissions: [
      PERMISSIONS.ORG_EDIT, PERMISSIONS.ORG_DELETE,
      PERMISSIONS.MEMBER_INVITE, PERMISSIONS.MEMBER_REMOVE, PERMISSIONS.MEMBER_MANAGE,
      PERMISSIONS.EVENT_CREATE, PERMISSIONS.EVENT_EDIT, PERMISSIONS.EVENT_PUBLISH,
      PERMISSIONS.EVENT_CANCEL, PERMISSIONS.EVENT_VIEW_ANALYTICS,
      PERMISSIONS.TICKET_MANAGE, PERMISSIONS.TICKET_VIEW, PERMISSIONS.TICKET_VOID,
      PERMISSIONS.TICKET_REFUND, PERMISSIONS.TICKET_TRANSFER,
      PERMISSIONS.ORDER_VIEW, PERMISSIONS.ORDER_CANCEL,
      PERMISSIONS.FINANCE_VIEW, PERMISSIONS.SETTLEMENT_VIEW,
      PERMISSIONS.SCANNER_USE, PERMISSIONS.SCANNER_MANAGE_DEVICES,
    ],
  },
  {
    name: 'manager',
    orgType: 'organizer' as const,
    permissions: [
      PERMISSIONS.EVENT_CREATE, PERMISSIONS.EVENT_EDIT, PERMISSIONS.EVENT_PUBLISH,
      PERMISSIONS.EVENT_CANCEL, PERMISSIONS.EVENT_VIEW_ANALYTICS,
      PERMISSIONS.TICKET_MANAGE, PERMISSIONS.TICKET_VIEW,
      PERMISSIONS.ORDER_VIEW,
      PERMISSIONS.FINANCE_VIEW, PERMISSIONS.SETTLEMENT_VIEW,
      PERMISSIONS.SCANNER_USE,
    ],
  },
  {
    name: 'staff',
    orgType: 'organizer' as const,
    permissions: [
      PERMISSIONS.EVENT_VIEW_ANALYTICS,
      PERMISSIONS.TICKET_VIEW,
      PERMISSIONS.ORDER_VIEW,
      PERMISSIONS.SCANNER_USE,
    ],
  },
  // ---- Venue roles ----
  {
    name: 'owner',
    orgType: 'venue' as const,
    permissions: [
      PERMISSIONS.ORG_EDIT,
      PERMISSIONS.MEMBER_INVITE, PERMISSIONS.MEMBER_REMOVE, PERMISSIONS.MEMBER_MANAGE,
      PERMISSIONS.VENUE_CREATE, PERMISSIONS.VENUE_EDIT, PERMISSIONS.VENUE_DELETE,
      PERMISSIONS.VENUE_MANAGE_STAFF,
      PERMISSIONS.SETTLEMENT_VIEW, PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.SCANNER_USE, PERMISSIONS.SCANNER_MANAGE_DEVICES,
    ],
  },
  {
    name: 'manager',
    orgType: 'venue' as const,
    permissions: [
      PERMISSIONS.VENUE_EDIT,
      PERMISSIONS.VENUE_MANAGE_STAFF,
      PERMISSIONS.SCANNER_USE,
    ],
  },
  {
    name: 'staff',
    orgType: 'venue' as const,
    permissions: [
      PERMISSIONS.SCANNER_USE,
    ],
  },
  // ---- Promoter roles ----
  {
    name: 'owner',
    orgType: 'promoter' as const,
    permissions: [
      PERMISSIONS.PROMOTER_CREATE_CAMPAIGN, PERMISSIONS.PROMOTER_VIEW_EARNINGS,
      PERMISSIONS.MEMBER_INVITE, PERMISSIONS.MEMBER_MANAGE,
      PERMISSIONS.FINANCE_VIEW,
    ],
  },
  {
    name: 'staff',
    orgType: 'promoter' as const,
    permissions: [
      PERMISSIONS.PROMOTER_VIEW_EARNINGS,
    ],
  },
] as const;

// Platform roles (organization_type = NULL) — assignable only via admin APIs
const PLATFORM_ROLE_DEFINITIONS = [
  {
    name: 'super_admin',
    permissions: Object.values(PERMISSIONS), // All permissions
  },
  {
    name: 'finance_admin',
    permissions: [
      PERMISSIONS.FINANCE_VIEW, PERMISSIONS.SETTLEMENT_VIEW,
      PERMISSIONS.SETTLEMENT_APPROVE, PERMISSIONS.ORDER_VIEW,
      PERMISSIONS.TICKET_REFUND, PERMISSIONS.ADMIN_AUDIT,
    ],
  },
  {
    name: 'operations_admin',
    permissions: [
      PERMISSIONS.ADMIN_USERS_MANAGE, PERMISSIONS.USER_SUSPEND, PERMISSIONS.USER_RESTORE,
      PERMISSIONS.EVENT_APPROVE, PERMISSIONS.EVENT_REJECT, PERMISSIONS.EVENT_SUSPEND,
      PERMISSIONS.ADMIN_AUDIT, PERMISSIONS.ADMIN_MODERATION,
      PERMISSIONS.SUPPORT_VIEW, PERMISSIONS.SUPPORT_RESPOND,
      PERMISSIONS.ORDER_VIEW, PERMISSIONS.FINANCE_VIEW,
    ],
  },
  {
    name: 'content_admin',
    permissions: [
      PERMISSIONS.CMS_MANAGE, PERMISSIONS.EVENT_FEATURE, PERMISSIONS.ADMIN_AUDIT,
    ],
  },
  {
    name: 'support_agent',
    permissions: [
      PERMISSIONS.SUPPORT_VIEW, PERMISSIONS.SUPPORT_RESPOND,
      PERMISSIONS.ORDER_VIEW, PERMISSIONS.TICKET_VIEW,
    ],
  },
];

// ---------------------------------------------------------------------------
// PermissionSeeder
// ---------------------------------------------------------------------------
@Injectable()
export class PermissionSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger('PermissionSeeder');

  constructor(private readonly db: DatabaseService) {}

  /**
   * Runs on application bootstrap in development environment only.
   * Safe to run multiple times (idempotent).
   */
  async onApplicationBootstrap(): Promise<void> {
    if (process.env['NODE_ENV'] !== 'development') return;

    try {
      await this.seed();
    } catch (err) {
      this.logger.error('Permission seeding failed', err);
    }
  }

  async seed(): Promise<void> {
    this.logger.log('Seeding permissions and roles...');

    // 1. Upsert all permissions
    for (const perm of ALL_PERMISSIONS) {
      await this.db.db
        .insert(permissions)
        .values({ key: perm.key, description: perm.description })
        .onConflictDoUpdate({
          target: permissions.key,
          set: { description: perm.description },
        });
    }
    this.logger.log(`Seeded ${ALL_PERMISSIONS.length} permissions`);

    // Build permission key → id map
    const allPerms = await this.db.db.select().from(permissions).execute();
    const permMap = new Map(allPerms.map((p) => [p.key, p.id]));

    // 2. Upsert org roles
    for (const roleDef of ROLE_DEFINITIONS) {
      const [role] = await this.db.db
        .insert(roles)
        .values({
          name: roleDef.name,
          organizationType: roleDef.orgType,
        })
        .onConflictDoNothing()
        .returning();

      const roleId = role?.id ?? (
        await this.db.db
          .select({ id: roles.id })
          .from(roles)
          .where(
            and(
              eq(roles.name, roleDef.name),
              eq(roles.organizationType, roleDef.orgType),
            ),
          )
          .limit(1)
          .execute()
      )[0]?.id;

      if (!roleId) continue;

      // Upsert role_permissions
      for (const permKey of roleDef.permissions) {
        const permId = permMap.get(permKey);
        if (!permId) continue;
        await this.db.db
          .insert(rolePermissions)
          .values({ roleId, permissionId: permId })
          .onConflictDoNothing();
      }
    }

    // 3. Upsert platform roles (organization_type IS NULL)
    for (const roleDef of PLATFORM_ROLE_DEFINITIONS) {
      const existing = await this.db.db
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.name, roleDef.name), isNull(roles.organizationType)))
        .limit(1)
        .execute();

      let roleId = existing[0]?.id;

      if (!roleId) {
        const [created] = await this.db.db
          .insert(roles)
          .values({ name: roleDef.name, organizationType: null })
          .returning();
        roleId = created?.id;
      }

      if (!roleId) continue;

      for (const permKey of roleDef.permissions) {
        const permId = permMap.get(permKey);
        if (!permId) continue;
        await this.db.db
          .insert(rolePermissions)
          .values({ roleId, permissionId: permId })
          .onConflictDoNothing();
      }
    }

    this.logger.log('Permission and role seeding complete');
  }
}
