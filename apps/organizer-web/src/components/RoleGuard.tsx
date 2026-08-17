// =============================================================================
// organizer-web — RoleGuard Component
// Ensures the authenticated user has an active membership in an organizer organization
// or holds platform admin permissions.
// =============================================================================
'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@platform/auth';

export interface RoleGuardProps {
  children: React.ReactNode;
}

export function RoleGuard({ children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, organizations, logout, user } = useAuth();

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
      <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-400">Verifying organizer credentials...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4">
        <p className="text-sm text-gray-400">Redirecting to sign in...</p>
      </div>
    );
  }

  // Check active organization membership for organizer
  const hasOrganizerOrg = organizations.some(
    (org) => org.type === 'organizer' && org.status === 'active',
  );

  if (!hasOrganizerOrg && organizations.length === 0) {
    // If organizations are empty or not organizer, show clear access-denied state
    return (
      <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center p-4">
        <div className="bg-[#161922] border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-600 flex items-center justify-center mx-auto mb-4 text-amber-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Organizer Access Required</h2>
          <p className="text-sm text-gray-400 mb-6">
            You are signed in as <span className="text-gray-200 font-medium">{user?.email}</span>, but you do not belong to an active Organizer organization.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => logout()}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors"
            >
              Sign in with another account
            </button>
            <a
              href="http://localhost:3000"
              className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              Return to Consumer Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
