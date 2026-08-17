// =============================================================================
// consumer-web — Sign In Page
// Supports Email + Password, Google OAuth, and Apple OAuth.
// Pure client-safe Supabase auth flow.
// =============================================================================
'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@platform/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const { login, loginWithGoogle, loginWithApple, error: authError, clearError, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        router.push(redirectTo);
      } else if (res.error) {
        setLocalError(res.error);
      }
    } catch {
      setLocalError('An unexpected error occurred during sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLocalError(null);
    clearError();
    try {
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithApple();
      }
    } catch {
      setLocalError(`Failed to initialize ${provider} sign in.`);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary,#0F1117)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand */}
        <Link href="/" className="flex items-center justify-center gap-2 group mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-black text-white text-xl shadow-lg">
            E
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-white">
            EventPlatform
          </span>
        </Link>
        <h2 className="text-center text-2xl font-bold tracking-tight text-white">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Don&apos;t have an account?{' '}
          <Link
            href={`/auth/register${redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
            className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
          >
            Sign up for free
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--color-bg-secondary,#161922)] py-8 px-4 shadow-2xl border border-gray-800 sm:rounded-2xl sm:px-10">
          {displayError && (
            <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{displayError}</span>
            </div>
          )}

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-700 rounded-xl shadow-sm text-sm font-medium text-gray-200 bg-gray-900/60 hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('apple')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-700 rounded-xl shadow-sm text-sm font-medium text-gray-200 bg-gray-900/60 hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.6.69-1.12 1.83-.98 2.92 1.07.08 2.13-.52 2.79-1.32z"/>
              </svg>
              Apple
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--color-bg-secondary,#161922)] px-2 text-gray-400">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="block w-full appearance-none rounded-xl border border-gray-700 bg-gray-900/80 px-4 py-2.5 text-white placeholder-gray-500 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full appearance-none rounded-xl border border-gray-700 bg-gray-900/80 px-4 py-2.5 text-white placeholder-gray-500 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F1117] flex items-center justify-center text-gray-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
