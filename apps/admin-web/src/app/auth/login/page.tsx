// =============================================================================
// admin-web — Administrator Sign In Page
// Supports Email + Password with Supabase MFA TOTP challenge verification.
// =============================================================================
'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@platform/auth';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const { login, supabaseClient, error: authError, clearError, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
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
      // Step 1: Initial password login
      const res = await login(email.trim(), password);
      if (res.success) {
        // Check if TOTP MFA is required by querying enrolled factors
        try {
          const { data: factors } = await supabaseClient.auth.mfa.listFactors();
          const totpFactor = factors?.totp?.find((f) => f.status === 'verified');
          if (totpFactor) {
            setMfaFactorId(totpFactor.id);
            setSubmitting(false);
            return;
          }
        } catch {
          // MFA not enrolled or not configured
        }
        router.push(redirectTo);
      } else if (res.error) {
        setLocalError(res.error);
      }
    } catch {
      setLocalError('An unexpected error occurred during administrative sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim() || !mfaFactorId) {
      setLocalError('Please enter the 6-digit authenticator code.');
      return;
    }

    setSubmitting(true);
    setLocalError(null);
    try {
      const { error: challengeError } = await supabaseClient.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode.trim(),
      });

      if (challengeError) {
        setLocalError(challengeError.message || 'Invalid MFA authentication code.');
      } else {
        router.push(redirectTo);
      }
    } catch {
      setLocalError('MFA verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[#0A0C10] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-700 flex items-center justify-center font-black text-white text-xl shadow-xl">
            A
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-white">
            Platform Admin HQ
          </span>
        </div>
        <h2 className="text-center text-xl font-bold tracking-tight text-white">
          {mfaFactorId ? 'Two-Factor Authentication' : 'Authorized Administrator Login'}
        </h2>
        <p className="mt-1 text-center text-xs text-red-400/80">
          Strict access controls and audit logging enabled.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#12151D] py-8 px-4 shadow-2xl border border-gray-800 sm:rounded-2xl sm:px-10">
          {displayError && (
            <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{displayError}</span>
            </div>
          )}

          {mfaFactorId ? (
            /* Step 2: MFA TOTP Code Entry */
            <form className="space-y-5" onSubmit={handleMfaSubmit}>
              <div>
                <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-300">
                  6-Digit Authenticator Code
                </label>
                <div className="mt-1">
                  <input
                    id="mfaCode"
                    name="mfaCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="123456"
                    className="block w-full text-center tracking-widest text-lg font-mono rounded-xl border border-gray-700 bg-gray-900/80 px-4 py-2.5 text-white placeholder-gray-600 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMfaFactorId(null)}
                  className="w-1/3 py-2.5 px-3 border border-gray-700 rounded-xl text-sm font-medium text-gray-400 hover:text-white"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
            </form>
          ) : (
            /* Step 1: Admin Password Login */
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Admin Email
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
                    placeholder="admin@platform.com"
                    className="block w-full appearance-none rounded-xl border border-gray-700 bg-gray-900/80 px-4 py-2.5 text-white placeholder-gray-500 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:text-sm"
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
                    className="block w-full appearance-none rounded-xl border border-gray-700 bg-gray-900/80 px-4 py-2.5 text-white placeholder-gray-500 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submitting || isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Authenticating Admin...' : 'Sign In to Admin HQ'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0C10] flex items-center justify-center text-gray-400">Loading...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
