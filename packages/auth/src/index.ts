// =============================================================================
// @platform/auth — Supabase Auth Utilities (CLIENT-SAFE ONLY)
// SECURITY: This package MUST only use the anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY).
// The service role key belongs ONLY in the backend.
// =============================================================================
import {
  createClient,
  type SupabaseClient,
  type User,
  type Session,
  type AuthChangeEvent,
} from '@supabase/supabase-js';

export type { User, Session, AuthChangeEvent };

export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: string | null;
}

/**
 * Create a Supabase client using the PUBLIC anon key.
 * Safe for browser and React Native use.
 * NEVER pass the service role key here.
 */
export function createSupabaseClient(config: AuthConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Email + Password Auth
// ---------------------------------------------------------------------------

export async function signInWithEmail(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<AuthResult> {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return {
    user: data.user ?? null,
    session: data.session ?? null,
    error: error?.message ?? null,
  };
}

export async function signUpWithEmail(
  client: SupabaseClient,
  email: string,
  password: string,
  options?: { name?: string },
): Promise<AuthResult> {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { name: options?.name },
    },
  });
  return {
    user: data.user ?? null,
    session: data.session ?? null,
    error: error?.message ?? null,
  };
}

// ---------------------------------------------------------------------------
// OAuth — Google + Apple
// ---------------------------------------------------------------------------

/**
 * Sign in with Google via OAuth redirect.
 * Redirects the browser to Google's auth page.
 */
export async function signInWithGoogle(
  client: SupabaseClient,
  redirectTo?: string,
): Promise<void> {
  await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo ?? `${window.location.origin}/auth/callback`,
    },
  });
}

/**
 * Sign in with Apple via OAuth redirect.
 * Supabase handles the Apple OAuth flow via its built-in provider.
 *
 * Requirements (configured at infrastructure level, not here):
 *   - Apple Developer account with Sign In with Apple enabled
 *   - Service ID configured in Supabase Dashboard → Auth → Providers → Apple
 *   - Private key uploaded to Supabase
 *
 * The abstraction is complete — calling this method initiates the Apple OAuth flow.
 */
export async function signInWithApple(
  client: SupabaseClient,
  redirectTo?: string,
): Promise<void> {
  await client.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: redirectTo ?? `${window.location.origin}/auth/callback`,
    },
  });
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export async function signOut(client: SupabaseClient): Promise<void> {
  await client.auth.signOut();
}

/**
 * Get the current session. Returns null if not authenticated.
 */
export async function getSession(client: SupabaseClient): Promise<Session | null> {
  const { data } = await client.auth.getSession();
  return data.session ?? null;
}

/**
 * Get the current authenticated user from the JWT.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(client: SupabaseClient): Promise<User | null> {
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}

/**
 * Get the authorization header for API calls.
 * Returns 'Bearer <token>' or null if not authenticated.
 */
export async function getAuthorizationHeader(
  client: SupabaseClient,
): Promise<string | null> {
  const session = await getSession(client);
  if (!session?.access_token) return null;
  return `Bearer ${session.access_token}`;
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function — call it on component unmount.
 */
export function onAuthStateChange(
  client: SupabaseClient,
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  const { data } = client.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

/**
 * Get the JWT from the current session.
 * Returns null if not authenticated.
 */
export async function getSessionToken(client: SupabaseClient): Promise<string | null> {
  const session = await getSession(client);
  return session?.access_token ?? null;
}

/**
 * Parse a Supabase JWT payload without verifying the signature.
 * IMPORTANT: For UI display purposes ONLY.
 * All authorization decisions must be made server-side.
 */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export { createClient };
