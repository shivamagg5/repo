// =============================================================================
// admin-web — AdminGuard Component
// Authoritative check for platform admin privileges.
// Enforces server-authoritative profile verification and provides re-authentication dialog.
// =============================================================================
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@platform/auth';

export interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, profile, user, logout } = useAuth();
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [reauthenticating, setReauthenticating] = useState(false);
  const { reauthenticate } = useAuth();

  const isAuthRoute = pathname.startsWith('/auth/');

  useEffect(() => {
    if (status === 'unauthenticated' && !isAuthRoute) {
      router.replace(`/auth/login?redirectTo=${encodeURIComponent(pathname)}`);
    }
  }, [status, isAuthRoute, router, pathname]);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-400">Verifying platform administrator authorization...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center p-4">
        <p className="text-sm text-gray-400">Redirecting to admin sign in...</p>
      </div>
    );
  }

  // Authoritative check: User must be active
  if (!profile || profile.status !== 'active') {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex flex-col items-center justify-center p-4">
        <div className="bg-[#12151D] border border-red-900/50 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-600 flex items-center justify-center mx-auto mb-4 text-red-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Platform Admin Access Denied</h2>
          <p className="text-sm text-gray-400 mb-6">
            Account <span className="text-gray-200 font-medium">{user?.email}</span> does not have platform-level administrative privileges.
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors"
          >
            Sign in with authorized administrator account
          </button>
        </div>
      </div>
    );
  }

  const handleReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reauthPassword) return;
    setReauthenticating(true);
    setReauthError(null);
    try {
      const res = await reauthenticate(reauthPassword);
      if (res.success) {
        setShowReauthModal(false);
        setReauthPassword('');
      } else {
        setReauthError(res.error || 'Re-authentication failed');
      }
    } finally {
      setReauthenticating(false);
    }
  };

  return (
    <>
      {children}

      {/* Privileged Re-authentication Modal */}
      {showReauthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#161922] border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Confirm Administrator Password</h3>
            <p className="text-sm text-gray-400 mb-4">
              This privileged operation requires recent authentication. Please re-enter your administrator password to proceed.
            </p>
            {reauthError && (
              <div className="mb-4 bg-red-950/50 border border-red-800 text-red-300 px-3 py-2 rounded-xl text-xs">
                {reauthError}
              </div>
            )}
            <form onSubmit={handleReauthSubmit} className="space-y-4">
              <input
                type="password"
                required
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                placeholder="Admin Password"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReauthModal(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reauthenticating}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl disabled:opacity-50"
                >
                  {reauthenticating ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
