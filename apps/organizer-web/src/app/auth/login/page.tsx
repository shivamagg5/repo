// =============================================================================
// organizer-web — Organizer Login Page
// Supports Email + Password and Google OAuth.
// =============================================================================
'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@platform/auth';

function OrganizerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const { login, loginWithGoogle, error: authError, clearError, isLoading } = useAuth();

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
      setLocalError('An unexpected error occurred during sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-black text-white text-xl shadow-lg">
            O
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-white">
            Organizer Portal
          </span>
        </div>
        <h2 className="text-center text-xl font-bold tracking-tight text-white">
          Sign in to manage your events
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#161922] py-8 px-4 shadow-2xl border border-gray-800 sm:rounded-2xl sm:px-10">
          {displayError && (
            <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{displayError}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Work Email
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
                  placeholder="organizer@example.com"
                  className="block w-full appearance-none rounded-xl border border-gray-700 bg-gray-900/80 px-4 py-2.5 text-white placeholder-gray-500 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 sm:text-sm"
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
                  className="block w-full appearance-none rounded-xl border border-gray-700 bg-gray-900/80 px-4 py-2.5 text-white placeholder-gray-500 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all disabled:opacity-50"
              >
                {submitting ? 'Authenticating...' : 'Sign In to Dashboard'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OrganizerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F1117] flex items-center justify-center text-gray-400">Loading...</div>}>
      <OrganizerLoginForm />
    </Suspense>
  );
}
