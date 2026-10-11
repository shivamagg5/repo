import type { UserStatus } from './enums.js';

export interface User {
  id: string;              // Application UUID (users.id) — used in all FK relations
  supabaseAuthId: string;  // Supabase auth.users.id — bridge identity only
  email: string | null;
  phone: string | null;
  name: string;
  avatarUrl: string | null;
  status: UserStatus;
  phoneVerified: boolean;
  emailVerified: boolean;
  dob: string | null;
  whatsappConsent: boolean;
  whatsappConsentUpdatedAt: string | null;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
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
  role?: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  dob: string | null;
  whatsappConsent: boolean;
  termsAcceptedAt: string | null;
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
  dob?: string;
  whatsappConsent?: boolean;
  termsAccepted?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  dob?: string;
  whatsappConsent?: boolean;
  // BLOCKED: supabaseAuthId, email, status, role, permissions, organizationId
}
