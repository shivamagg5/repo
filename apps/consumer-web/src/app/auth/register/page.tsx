// =============================================================================
// consumer-web — Attendee Sign Up Page
// Live discovery registration with 1-click attendee demo access and OAuth support.
// =============================================================================
'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@platform/auth';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const { register, loginAsDemo, loginWithGoogle, loginWithApple, error: authError, clearError, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!name.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !password) {
      setLocalError('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await register(email.trim(), password, name.trim());
      if (res.success) {
        router.push(redirectTo);
      } else if (res.error) {
        setLocalError(res.error);
      }
    } catch {
      setLocalError('An unexpected error occurred during registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstantDemo = async () => {
    setSubmitting(true);
    setLocalError(null);
    try {
      const res = await loginAsDemo('consumer');
      if (res.success) {
        router.push(redirectTo);
      }
    } catch {
      setLocalError('Failed to sign in as demo consumer.');
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
      setLocalError(`Failed to initialize ${provider} registration.`);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[#090C15] text-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-['Inter']">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex flex-col items-center justify-center gap-3 mb-8 text-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-purple-950/50 group-hover:scale-105 transition-transform">
              ⚡
            </div>
          </Link>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight text-white font-['Outfit']">
              Join the Live Community
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Create an account for 10-minute hold guarantees and instant ticket access
            </p>
          </div>
        </div>

        <div className="bg-[#0F1424]/90 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-3xl border border-slate-800 space-y-6">
          {/* Quick Instant Demo Login Button */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 font-mono">
                ⚡ Skip Sign Up
              </span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold border border-purple-500/30">
                Aarav Sharma
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Explore the entire consumer ticket booking flow instantly with a pre-configured attendee account.
            </p>
            <button
              type="button"
              onClick={handleInstantDemo}
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? 'Authenticating...' : '🚀 Enter as Attendee (1-Click)'}
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="flex-shrink mx-4 text-slate-500 text-[11px] uppercase font-mono">
              Or Register New Account
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {displayError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars"
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-colors"
            >
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('apple')}
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-colors"
            >
              <span>Apple</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-purple-400 hover:text-purple-300 font-bold">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConsumerRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090C15] flex items-center justify-center text-xs text-slate-400">
          Loading Event Discovery...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
