// =============================================================================
// @platform/types — RBAC Domain Types
// Permissions, roles, and auth context used across backend and packages.
// =============================================================================

import type { UserStatus, OrganizationType } from './enums.js';

// ---------------------------------------------------------------------------
// Permission keys — canonical list, matches seeds in backend
// ---------------------------------------------------------------------------
export const PERMISSIONS = {
  // Profile
  PROFILE_VIEW: 'profile.view',
  PROFILE_EDIT: 'profile.edit',

  // Organization
  ORG_CREATE: 'organization.create',
  ORG_EDIT: 'organization.edit',
  ORG_DELETE: 'organization.delete',

  // Members
  MEMBER_INVITE: 'member.invite',
  MEMBER_REMOVE: 'member.remove',
  MEMBER_MANAGE: 'member.manage',

  // Events
  EVENT_CREATE: 'event.create',
  EVENT_EDIT: 'event.edit',
  EVENT_PUBLISH: 'event.publish',
  EVENT_CANCEL: 'event.cancel',
  EVENT_VIEW_ANALYTICS: 'event.view_analytics',
  EVENT_APPROVE: 'event.approve',
  EVENT_REJECT: 'event.reject',
  EVENT_SUSPEND: 'event.suspend',
  EVENT_FEATURE: 'event.feature',

  // Venues
  VENUE_CREATE: 'venue.create',
  VENUE_EDIT: 'venue.edit',
  VENUE_DELETE: 'venue.delete',
  VENUE_MANAGE_STAFF: 'venue.manage_staff',

  // Tickets
  TICKET_MANAGE: 'ticket.manage',
  TICKET_VIEW: 'ticket.view',
  TICKET_VOID: 'ticket.void',
  TICKET_REFUND: 'ticket.refund',
  TICKET_TRANSFER: 'ticket.transfer',

  // Orders
  ORDER_VIEW: 'order.view',
  ORDER_CANCEL: 'order.cancel',

  // Finance
  FINANCE_VIEW: 'finance.view',
  SETTLEMENT_VIEW: 'settlement.view',
  SETTLEMENT_APPROVE: 'settlement.approve',

  // Scanner
  SCANNER_USE: 'scanner.use',
  SCANNER_MANAGE_DEVICES: 'scanner.manage_devices',

  // Promoter
  PROMOTER_CREATE_CAMPAIGN: 'promoter.create_campaign',
  PROMOTER_VIEW_EARNINGS: 'promoter.view_earnings',

  // CMS
  CMS_MANAGE: 'cms.manage',

  // Support
  SUPPORT_VIEW: 'support.view',
  SUPPORT_RESPOND: 'support.respond',

  // Admin — platform-level only
  ADMIN_USERS_MANAGE: 'admin.users.manage',
  USER_SUSPEND: 'user.suspend',
  USER_RESTORE: 'user.restore',
  ADMIN_ROLES: 'admin.roles',
  ADMIN_AUDIT: 'admin.audit',
  ADMIN_MODERATION: 'admin.moderation',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ---------------------------------------------------------------------------
// Platform roles — organization_type IS NULL in the roles table
// These CANNOT be assigned via organization invite/role-change APIs
// ---------------------------------------------------------------------------
export const PLATFORM_ROLES = [
  'super_admin',
  'finance_admin',
  'operations_admin',
  'content_admin',
  'support_agent',
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

// ---------------------------------------------------------------------------
// Auth context — attached to req.user by auth middleware
// ---------------------------------------------------------------------------

/**
 * AuthContext is attached to req.user after JWT verification + DB lookup.
 *
 * SECURITY NOTES:
 * - userId is the application UUID (users.id) — stable across all FKs
 * - supabaseAuthId is auth.users.id — used only for identity bridge
 * - permissions[] is a FLATTENED convenience list for PLATFORM-level checks only
 * - For organization-scoped resource authorization, always use RbacService methods:
 *   checkOrgMembership(), checkPermissionInOrg(), validateRoleForOrg()
 *   The flattened permissions[] must NOT be used as the sole authorization gate
 *   for organization-scoped resources.
 */
export interface AuthContext {
  userId: string;         // Application users.id — use this for all DB operations
  supabaseAuthId: string; // Supabase auth.users.id — bridge identity only
  email: string | null;
  status: UserStatus;
  /** Flattened permission keys across ALL active org memberships.
   * Use for: platform-level checks (admin routes, global actions)
   * Do NOT use for: org-scoped resources — use checkPermissionInOrg() instead */
  permissions: PermissionKey[];
}

// ---------------------------------------------------------------------------
// Organization membership context
// ---------------------------------------------------------------------------
export interface OrgMembershipContext {
  membershipId: string;
  organizationId: string;
  organizationType: OrganizationType;
  roleId: string;
  roleName: string;
  permissions: PermissionKey[];
  status: string;
}

// ---------------------------------------------------------------------------
// Invitation status
// ---------------------------------------------------------------------------
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
