// =============================================================================
// consumer-web — OAuth Callback Handler
// Supabase OAuth redirects to this page with code / hash fragments.
// Exchanges session, hydrates application profile, and redirects to intended route.
// =============================================================================
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@platform/auth';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, isAuthenticated } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    const errorDescription = searchParams.get('error_description') || searchParams.get('error');
    if (errorDescription) {
      setErrorMsg(errorDescription);
    } else if (status === 'authenticated' && isAuthenticated) {
      const redirectTo = searchParams.get('redirectTo') || '/';
      router.replace(redirectTo);
    } else if (status === 'unauthenticated') {
      timer = setTimeout(() => {
        router.replace('/auth/login');
      }, 2000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [status, isAuthenticated, router, searchParams]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center p-4">
        <div className="bg-[#161922] border border-red-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-700 flex items-center justify-center mx-auto mb-4 text-red-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Authentication Failed</h2>
          <p className="text-sm text-gray-400 mb-6">{errorMsg}</p>
          <a
            href="/auth/login"
            className="inline-flex justify-center py-2.5 px-5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors"
          >
            Back to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-300">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F1117] flex items-center justify-center text-gray-400">
          Loading...
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
