// =============================================================================
// PULSR Consumer Web — Sign In Page
// Unified design system: Identical container, ambient glow, typography, and
// card framing as /auth/register and /auth/forgot-password.
// =============================================================================
'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@platform/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirectTo') || '/';
  const redirectTo = rawRedirect.startsWith('/auth') ? '/' : rawRedirect;

  const { login, loginAsDemo, loginWithGoogle, loginWithApple, error: authError, clearError } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const cleanId = identifier.trim();
    if (!cleanId) {
      setLocalError('Please enter your email address or mobile number.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your account password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(cleanId, password);
      if (res.success) {
        window.location.href = redirectTo;
      } else if (res.error) {
        setLocalError(res.error);
      }
    } catch {
      setLocalError('Unexpected error during sign in. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setSubmitting(true);
    setLocalError(null);
    try {
      const res = await loginAsDemo('consumer');
      if (res.success) {
        window.location.href = redirectTo;
      }
    } catch {
      setLocalError('Demo attendee sign in failed. Please try with credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[#090C15] text-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-['Inter']">
      {/* Ambient background glows matching /auth/register */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Branding Header */}
        <div className="flex flex-col items-center justify-center gap-2 mb-6 text-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-pink-500 font-black text-2xl">✳</span>
            <span className="font-extrabold text-xl tracking-wider text-white font-['Outfit']">PULSR</span>
          </Link>
          <h1 className="font-extrabold text-2xl tracking-tight text-white font-['Outfit'] mt-1">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to access your tickets, passes and radar
          </p>
        </div>

        {/* Synchronized Segmented Switcher [ Sign In | Sign Up ] */}
        <div className="flex bg-[#161B2E] p-1 rounded-2xl border border-slate-800 mb-6">
          <div className="flex-1 py-2.5 text-center text-xs font-bold rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-900/40">
            Sign In
          </div>
          <Link
            href={`/auth/register${redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
            className="flex-1 py-2.5 text-center text-xs font-bold rounded-xl text-slate-400 hover:text-white transition-all"
          >
            Sign Up
          </Link>
        </div>

        {/* Glass Card */}
        <div className="bg-[#0F1424]/90 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-3xl border border-slate-800 space-y-6">
          {displayError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                Email or Mobile Number
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="name@domain.com or +919876543210"
                className="w-full px-4 py-3 bg-[#161B2E] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-[11px] text-pink-400 font-semibold hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 bg-[#161B2E] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1 py-0.5"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-pink-950/40 transition-all disabled:opacity-50"
            >
              {submitting ? 'Signing in…' : 'Sign In →'}
            </button>

            {/* Quick Demo Option */}
            <button
              type="button"
              onClick={handleDemo}
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#161B2E]/70 hover:bg-[#161B2E] border border-slate-700/60 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <span>⚡</span> Try Demo Attendee (1-Click)
            </button>

            {/* Social Divider */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800" />
              <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-mono">
                Or Social Access
              </span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            {/* Social Auth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => loginWithGoogle()}
                className="py-2.5 px-4 rounded-xl bg-[#161B2E] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                <span className="font-bold text-pink-400">G</span> Google
              </button>
              <button
                type="button"
                onClick={() => loginWithApple()}
                className="py-2.5 px-4 rounded-xl bg-[#161B2E] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                <span>🍎</span> Apple
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 pt-2">
              Don't have an account yet?{' '}
              <Link
                href={`/auth/register${redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
                className="text-pink-400 font-bold hover:underline"
              >
                Sign up free →
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ConsumerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090C15] text-[#F8FAFC] flex items-center justify-center">
          <div className="animate-pulse text-sm text-slate-400">Loading sign in…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
