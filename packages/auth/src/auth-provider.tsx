// =============================================================================
// @platform/auth — React Authentication Context & Provider
// CLIENT-SAFE ONLY.
// Handles Supabase auth state, backend user synchronization (POST /auth/sync),
// profile hydration (GET /auth/me), organization resolution, and token injection.
// =============================================================================
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { ApiClient, createApiClient } from '@platform/api-client';
import type { UserProfile } from '@platform/types';
import {
  createSupabaseClient,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithApple,
  signOut as supabaseSignOut,
  type AuthConfig,
} from './index.js';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  role?: string;
}

export interface AuthContextValue {
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  organizations: OrganizationInfo[];
  activeOrg: OrganizationInfo | null;
  setActiveOrg: (org: OrganizationInfo | null) => void;
  error: string | null;
  clearError: () => void;
  apiClient: ApiClient;
  supabaseClient: SupabaseClient;
  
  // Auth Operations
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (redirectTo?: string) => Promise<void>;
  loginWithApple: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  reauthenticate: (password: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiUrl?: string;
  client?: SupabaseClient;
}

/**
 * Maps Supabase / backend error messages into user-friendly display messages.
 * Never leaks raw internal stack traces or database errors to the user.
 */
export function mapAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const message = typeof error === 'string' ? error : (error as { message?: string }).message ?? '';
  
  if (message.includes('Invalid login credentials') || message.includes('invalid_grant')) {
    return 'Invalid email or password. Please check your credentials.';
  }
  if (message.includes('User already registered') || message.includes('already exists')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (message.includes('Password should be at least') || message.includes('weak_password')) {
    return 'Password must be at least 8 characters long.';
  }
  if (message.includes('rate limit') || message.includes('too many requests') || message.includes('over_request_rate_limit')) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }
  if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
    return 'Network connection issue. Please check your internet connection.';
  }
  if (
    message.includes('postgres') ||
    message.includes('database') ||
    message.includes('internal') ||
    message.includes('500') ||
    message.includes('timeout')
  ) {
    return 'An unexpected error occurred during authentication.';
  }
  return message || 'Authentication failed. Please try again.';
}

export function AuthProvider({
  children,
  supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
  supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
  apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1',
  client: providedClient,
}: AuthProviderProps) {
  const [supabase] = useState<SupabaseClient>(() => {
    if (providedClient) return providedClient;
    if (!supabaseUrl || !supabaseAnonKey) {
      // Fallback dummy client for build-time static rendering
      return createSupabaseClient({
        supabaseUrl: supabaseUrl || 'https://placeholder.supabase.co',
        supabaseAnonKey: supabaseAnonKey || 'placeholder-key',
      });
    }
    return createSupabaseClient({ supabaseUrl, supabaseAnonKey });
  });

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationInfo[]>([]);
  const [activeOrg, setActiveOrg] = useState<OrganizationInfo | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  // Single shared ApiClient instance with token provider
  const apiClient = useMemo(() => {
    return createApiClient({
      baseUrl: apiUrl,
      getAuthToken: () => {
        // Authoritative current token from Supabase session
        return session?.access_token ?? null;
      },
      onUnauthorized: () => {
        // Session expired on backend
        setStatus('unauthenticated');
        setProfile(null);
      },
    });
  }, [apiUrl, session?.access_token]);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Hydrates the authoritative user profile and organization list from backend API.
   * Runs POST /auth/sync (idempotent) followed by GET /auth/me and GET /organizations.
   */
  const hydrateProfile = useCallback(
    async (currentSession: Session) => {
      try {
        const token = currentSession.access_token;
        const authName = currentSession.user.user_metadata?.['name'] as string | undefined;
        const avatarUrl = currentSession.user.user_metadata?.['avatar_url'] as string | undefined;

        // Step 1: Sync application user record (idempotent upsert by supabase_auth_id)
        try {
          await apiClient.syncUser({
            name: authName,
            avatarUrl,
          });
        } catch (syncErr) {
          // Non-blocking if already synced
          console.warn('[Auth] Sync warning:', syncErr);
        }

        // Step 2: Fetch authoritative profile
        const meRes = await apiClient.getMe<UserProfile>();
        const userProfile = meRes.data;
        setProfile(userProfile);

        // Step 3: Fetch organizations the user belongs to
        try {
          const orgsRes = await apiClient.get<OrganizationInfo[]>('/organizations');
          const orgsList = orgsRes.data ?? [];
          setOrganizations(orgsList);
          if (orgsList.length > 0 && !activeOrg) {
            setActiveOrg(orgsList[0] ?? null);
          }
        } catch {
          setOrganizations([]);
        }

        setStatus('authenticated');
      } catch (err) {
        console.error('[Auth] Profile hydration error:', err);
        // User is authenticated in Supabase but sync failed — keep basic session
        setStatus('authenticated');
      }
    },
    [apiClient, activeOrg],
  );

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    await hydrateProfile(session);
  }, [session, hydrateProfile]);

  // Listen to Supabase auth state changes
  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const initialSession = data.session;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession) {
        hydrateProfile(initialSession).finally(() => {
          if (mounted) setStatus('authenticated');
        });
      } else {
        setStatus('unauthenticated');
      }
    }).catch(() => {
      if (mounted) setStatus('unauthenticated');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, newSession: Session | null) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession) {
          await hydrateProfile(newSession);
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setOrganizations([]);
        setActiveOrg(null);
        setStatus('unauthenticated');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, hydrateProfile]);

  // Operations
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setError(null);
      setStatus('loading');
      const result = await signInWithEmail(supabase, email, password);
      if (result.error) {
        const userMsg = mapAuthError(result.error);
        setError(userMsg);
        setStatus('unauthenticated');
        return { success: false, error: userMsg };
      }
      if (result.session) {
        setSession(result.session);
        setUser(result.session.user);
        await hydrateProfile(result.session);
        return { success: true };
      }
      setStatus('unauthenticated');
      return { success: false, error: 'Login failed. Please try again.' };
    },
    [supabase, hydrateProfile],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      name?: string,
    ): Promise<{ success: boolean; error?: string }> => {
      setError(null);
      setStatus('loading');
      const result = await signUpWithEmail(supabase, email, password, { name });
      if (result.error) {
        const userMsg = mapAuthError(result.error);
        setError(userMsg);
        setStatus('unauthenticated');
        return { success: false, error: userMsg };
      }
      if (result.session) {
        setSession(result.session);
        setUser(result.session.user);
        await hydrateProfile(result.session);
        return { success: true };
      }
      // If email confirmation is required
      setStatus('unauthenticated');
      return { success: true };
    },
    [supabase, hydrateProfile],
  );

  const loginWithGoogle = useCallback(
    async (redirectTo?: string): Promise<void> => {
      setError(null);
      await signInWithGoogle(supabase, redirectTo);
    },
    [supabase],
  );

  const loginWithApple = useCallback(
    async (redirectTo?: string): Promise<void> => {
      setError(null);
      await signInWithApple(supabase, redirectTo);
    },
    [supabase],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      if (session?.access_token) {
        // Notify backend audit trail (non-blocking)
        try {
          await apiClient.logoutUser();
        } catch {
          // Ignore audit failure on logout
        }
      }
      await supabaseSignOut(supabase);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setOrganizations([]);
      setActiveOrg(null);
      setStatus('unauthenticated');
      setError(null);
    }
  }, [supabase, session?.access_token, apiClient]);

  const reauthenticate = useCallback(
    async (password: string): Promise<{ success: boolean; error?: string }> => {
      if (!user?.email) {
        return { success: false, error: 'No active authenticated session.' };
      }
      const result = await signInWithEmail(supabase, user.email, password);
      if (result.error) {
        return { success: false, error: mapAuthError(result.error) };
      }
      if (result.session) {
        setSession(result.session);
        return { success: true };
      }
      return { success: false, error: 'Re-authentication failed.' };
    },
    [supabase, user?.email],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated' && !!session,
      user,
      profile,
      session,
      organizations,
      activeOrg,
      setActiveOrg,
      error,
      clearError,
      apiClient,
      supabaseClient: supabase,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      logout,
      reauthenticate,
      refreshProfile,
    }),
    [
      status,
      user,
      profile,
      session,
      organizations,
      activeOrg,
      error,
      clearError,
      apiClient,
      supabase,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      logout,
      reauthenticate,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
