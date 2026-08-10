import type { OrganizationType, OrganizationStatus } from './enums.js';

export interface Organization {
  id: string;
  type: OrganizationType;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  status: string;
  createdAt: string;
}

export interface Role {
  id: string;
  organizationType: OrganizationType | null;
  name: string;
}

export interface Permission {
  id: string;
  key: string;
  description: string | null;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
}

export interface CreateOrganizationInput {
  type: OrganizationType;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}
