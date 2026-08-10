'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import { onAuthStateChange, signOut, getAuthorizationHeader } from '@platform/auth';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  getAuthHeader: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const client = getSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial session
    void client.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange(client, (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return unsubscribe;
  }, [client]);

  const handleSignOut = useCallback(async () => {
    await signOut(client);
  }, [client]);

  const getAuthHeader = useCallback(async () => {
    return getAuthorizationHeader(client);
  }, [client]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: !!user,
        signOut: handleSignOut,
        getAuthHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within <SupabaseProvider>');
  }
  return ctx;
}
