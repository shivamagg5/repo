// =============================================================================
// @platform/auth — React Authentication Context & Provider
// CLIENT-SAFE ONLY.
// Handles Supabase auth state, backend user synchronization (POST /auth/sync),
// profile hydration (GET /auth/me), organization resolution, and local dev bypass.
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

export type DemoRole = 'admin' | 'organizer' | 'venue' | 'promoter' | 'consumer';

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
  loginAsDemo: (role: DemoRole) => Promise<{ success: boolean; error?: string }>;
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

const DEMO_PERSONAS: Record<DemoRole, { profile: UserProfile; orgs: OrganizationInfo[]; token: string; email: string; name: string }> = {
  admin: {
    email: 'admin@staging.eventplatform.com',
    name: 'Platform Superadmin',
    profile: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@staging.eventplatform.com',
      name: 'Platform Superadmin',
      phone: '+91 99999 00001',
      status: 'active',
    } as any,
    orgs: [
      {
        id: '01000000-0000-0000-0000-000000000001',
        name: 'HQ Platform Operations',
        slug: 'platform-hq',
        type: 'admin',
        status: 'active',
        role: 'owner',
      },
    ],
    token: 'dev-token-admin',
  },
  organizer: {
    email: 'organizer@staging.eventplatform.com',
    name: 'Apex Entertainment Group',
    profile: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'organizer@staging.eventplatform.com',
      name: 'Apex Entertainment Group',
      phone: '+91 99999 00002',
      status: 'active',
    } as any,
    orgs: [
      {
        id: '01000000-0000-0000-0000-000000000001',
        name: 'Apex Live Events',
        slug: 'apex-live-events',
        type: 'organizer',
        status: 'active',
        role: 'owner',
      },
    ],
    token: 'dev-token-organizer',
  },
  venue: {
    email: 'venue@staging.eventplatform.com',
    name: 'Grand Arena Manager',
    profile: {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'venue@staging.eventplatform.com',
      name: 'Grand Arena Manager',
      phone: '+91 99999 00003',
      status: 'active',
    } as any,
    orgs: [
      {
        id: '02000000-0000-0000-0000-000000000002',
        name: 'Grand Arena Bangalore',
        slug: 'grand-arena-bangalore',
        type: 'venue',
        status: 'active',
        role: 'owner',
      },
    ],
    token: 'dev-token-venue',
  },
  promoter: {
    email: 'promoter@staging.eventplatform.com',
    name: 'Lead Growth Promoter',
    profile: {
      id: '00000000-0000-0000-0000-000000000004',
      email: 'promoter@staging.eventplatform.com',
      name: 'Lead Growth Promoter',
      phone: '+91 99999 00004',
      status: 'active',
    } as any,
    orgs: [
      {
        id: '03000000-0000-0000-0000-000000000003',
        name: 'Growth Affiliate Studio',
        slug: 'growth-affiliate-studio',
        type: 'promoter',
        status: 'active',
        role: 'owner',
      },
    ],
    token: 'dev-token-promoter',
  },
  consumer: {
    email: 'consumer1@staging.eventplatform.com',
    name: 'Aarav Sharma',
    profile: {
      id: '00000000-0000-0000-0000-000000000005',
      email: 'consumer1@staging.eventplatform.com',
      name: 'Aarav Sharma',
      phone: '+91 98765 43210',
      status: 'active',
    } as any,
    orgs: [],
    token: 'dev-token-consumer',
  },
};

/**
 * Maps Supabase / backend error messages into user-friendly display messages.
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
  if (message.includes('NetworkError') || message.includes('Failed to fetch') || message.includes('placeholder')) {
    return 'Network connection issue. Please check your internet connection.';
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
  const isPlaceholderUrl = !supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseAnonKey || supabaseAnonKey.includes('placeholder');

  const [supabase] = useState<SupabaseClient>(() => {
    if (providedClient) return providedClient;
    return createSupabaseClient({
      supabaseUrl: supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey: supabaseAnonKey || 'placeholder-key',
    });
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
        if (session?.access_token) return session.access_token;
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('eventplatform_demo_role');
          if (stored && DEMO_PERSONAS[stored as DemoRole]) {
            return DEMO_PERSONAS[stored as DemoRole].token;
          }
        }
        return null;
      },
      onUnauthorized: () => {
        if (typeof window !== 'undefined' && localStorage.getItem('eventplatform_demo_role')) {
          return;
        }
        setStatus('unauthenticated');
        setProfile(null);
      },
    });
  }, [apiUrl, session?.access_token]);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Hydrates the authoritative user profile and organization list from backend API.
   */
  const hydrateProfile = useCallback(
    async (currentSession: Session) => {
      try {
        if (currentSession.access_token.startsWith('dev-token-')) {
          return;
        }

        const authName = currentSession.user.user_metadata?.['name'] as string | undefined;
        const avatarUrl = currentSession.user.user_metadata?.['avatar_url'] as string | undefined;

        try {
          await apiClient.syncUser({
            name: authName,
            avatarUrl,
          });
        } catch {
          // non-blocking
        }

        const meRes = await apiClient.getMe<UserProfile>();
        setProfile(meRes.data);

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
        setStatus('authenticated');
      }
    },
    [apiClient, activeOrg],
  );

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    await hydrateProfile(session);
  }, [session, hydrateProfile]);

  // Demo Login Helper
  const loginAsDemo = useCallback(
    async (role: DemoRole): Promise<{ success: boolean; error?: string }> => {
      setError(null);
      if (process.env.NODE_ENV === 'production') {
        setStatus('unauthenticated');
        return { success: false, error: 'Demo logins are disabled in production.' };
      }
      setStatus('loading');

      const persona = DEMO_PERSONAS[role];
      if (!persona) {
        setStatus('unauthenticated');
        return { success: false, error: 'Unknown demo persona' };
      }

      const mockSession: any = {
        access_token: persona.token,
        token_type: 'bearer',
        expires_in: 86400,
        refresh_token: 'mock-refresh-token',
        user: {
          id: persona.profile.id,
          email: persona.email,
          user_metadata: { name: persona.name },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
      };

      setSession(mockSession);
      setUser(mockSession.user);
      setProfile(persona.profile);
      setOrganizations(persona.orgs);
      setActiveOrg(persona.orgs[0] ?? null);
      setStatus('authenticated');

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('eventplatform_demo_role', role);
          document.cookie = `sb-access-token=${persona.token}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `eventplatform_demo_role=${role}; path=/; max-age=86400; SameSite=Lax`;
        } catch {
          // ignore
        }
      }

      return { success: true };
    },
    [],
  );

  // Restore stored session or listen to Supabase
  useEffect(() => {
    let mounted = true;

    // Check localStorage for demo session first
    if (typeof window !== 'undefined') {
      try {
        const storedRole = localStorage.getItem('eventplatform_demo_role') as DemoRole | null;
        if (storedRole && DEMO_PERSONAS[storedRole]) {
          document.cookie = `sb-access-token=${DEMO_PERSONAS[storedRole].token}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `eventplatform_demo_role=${storedRole}; path=/; max-age=86400; SameSite=Lax`;
          loginAsDemo(storedRole);
          return;
        }
      } catch {
        // ignore
      }
    }

    if (isPlaceholderUrl) {
      setStatus('unauthenticated');
      return;
    }

    // Get initial Supabase session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const initialSession = data.session;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession) {
        if (typeof window !== 'undefined') {
          document.cookie = `sb-access-token=${initialSession.access_token}; path=/; max-age=86400; SameSite=Lax`;
        }
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
          if (typeof window !== 'undefined') {
            document.cookie = `sb-access-token=${newSession.access_token}; path=/; max-age=86400; SameSite=Lax`;
          }
          await hydrateProfile(newSession);
        }
      } else if (event === 'SIGNED_OUT') {
        if (typeof window !== 'undefined') {
          document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax';
          document.cookie = 'eventplatform_demo_role=; path=/; max-age=0; SameSite=Lax';
        }
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
  }, [supabase, isPlaceholderUrl, hydrateProfile, loginAsDemo]);

  // Operations
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setError(null);
      setStatus('loading');

      // Check if credentials match any pre-seeded persona or placeholder mode
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail.includes('admin')) {
        return loginAsDemo('admin');
      }
      if (trimmedEmail.includes('organizer')) {
        return loginAsDemo('organizer');
      }
      if (trimmedEmail.includes('venue')) {
        return loginAsDemo('venue');
      }
      if (trimmedEmail.includes('promoter')) {
        return loginAsDemo('promoter');
      }
      if (trimmedEmail.includes('consumer') || isPlaceholderUrl) {
        return loginAsDemo('consumer');
      }

      const result = await signInWithEmail(supabase, email, password);
      if (result.error) {
        // In local development, fall back gracefully to a consumer demo session if Supabase is offline
        if (isPlaceholderUrl) {
          return loginAsDemo('consumer');
        }
        const userMsg = mapAuthError(result.error);
        setError(userMsg);
        setStatus('unauthenticated');
        return { success: false, error: userMsg };
      }
      if (result.session) {
        if (typeof window !== 'undefined') {
          document.cookie = `sb-access-token=${result.session.access_token}; path=/; max-age=86400; SameSite=Lax`;
        }
        setSession(result.session);
        setUser(result.session.user);
        await hydrateProfile(result.session);
        return { success: true };
      }
      setStatus('unauthenticated');
      return { success: false, error: 'Login failed. Please try again.' };
    },
    [supabase, isPlaceholderUrl, loginAsDemo, hydrateProfile],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      name?: string,
    ): Promise<{ success: boolean; error?: string }> => {
      setError(null);
      setStatus('loading');

      if (isPlaceholderUrl) {
        // Seamlessly create consumer session in dev mode
        return loginAsDemo('consumer');
      }

      const result = await signUpWithEmail(supabase, email, password, { name });
      if (result.error) {
        const userMsg = mapAuthError(result.error);
        setError(userMsg);
        setStatus('unauthenticated');
        return { success: false, error: userMsg };
      }
      if (result.session) {
        if (typeof window !== 'undefined') {
          document.cookie = `sb-access-token=${result.session.access_token}; path=/; max-age=86400; SameSite=Lax`;
        }
        setSession(result.session);
        setUser(result.session.user);
        await hydrateProfile(result.session);
        return { success: true };
      }
      setStatus('unauthenticated');
      return { success: true };
    },
    [supabase, isPlaceholderUrl, loginAsDemo, hydrateProfile],
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eventplatform_demo_role');
        document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'eventplatform_demo_role=; path=/; max-age=0; SameSite=Lax';
      }
      if (session?.access_token && !session.access_token.startsWith('dev-token-')) {
        try {
          await apiClient.logoutUser();
        } catch {
          // ignore
        }
      }
      await supabaseSignOut(supabase);
    } catch {
      // ignore
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setOrganizations([]);
      setActiveOrg(null);
      setStatus('unauthenticated');
      setError(null);
    }
  }, [supabase, session, apiClient]);

  const reauthenticate = useCallback(
    async (password: string): Promise<{ success: boolean; error?: string }> => {
      if (!user?.email) {
        return { success: false, error: 'No active authenticated session.' };
      }
      if (session?.access_token.startsWith('dev-token-')) {
        return { success: true };
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
    [supabase, user?.email, session?.access_token],
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
      loginAsDemo,
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
      loginAsDemo,
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
