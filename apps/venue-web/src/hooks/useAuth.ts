'use client';

import { useAuthContext } from '../components/providers/SupabaseProvider';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple } from '@platform/auth';
import { getSupabaseClient } from '../lib/supabase';
import { useCallback } from 'react';

/**
 * useAuth — primary auth hook for consumer-web components.
 */
export function useAuth() {
  const { user, session, loading, isAuthenticated, signOut, getAuthHeader } =
    useAuthContext();
  const client = getSupabaseClient();

  const login = useCallback(
    (email: string, password: string) => signInWithEmail(client, email, password),
    [client],
  );

  const register = useCallback(
    (email: string, password: string, name?: string) =>
      signUpWithEmail(client, email, password, { name }),
    [client],
  );

  const loginWithGoogle = useCallback(
    () => signInWithGoogle(client),
    [client],
  );

  const loginWithApple = useCallback(
    () => signInWithApple(client),
    [client],
  );

  return {
    user,
    session,
    loading,
    isAuthenticated,
    login,
    register,
    loginWithGoogle,
    loginWithApple,
    signOut,
    getAuthHeader,
  };
}
