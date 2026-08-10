import type { UserStatus } from './enums.js';

export interface User {
  id: string;              // Application UUID (users.id) — used in all FK relations
  supabaseAuthId: string;  // Supabase auth.users.id — bridge identity only
  email: string | null;
  phone: string | null;
  name: string;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: string;
}

export interface UserPublic {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface CreateUserInput {
  supabaseAuthId: string; // Required: Supabase Auth UUID
  email?: string;
  phone?: string;
  name: string;
  avatarUrl?: string;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  // BLOCKED: supabaseAuthId, email, status, role, permissions, organizationId
}
