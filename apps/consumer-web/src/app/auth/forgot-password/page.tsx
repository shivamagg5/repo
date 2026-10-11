// =============================================================================
// consumer-web — Forgot Password Flow
// Multi-step account recovery via verified Email or Mobile OTP
// =============================================================================
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api';

type Step = 'IDENTIFY' | 'VERIFY_OTP' | 'SET_PASSWORD' | 'SUCCESS';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('IDENTIFY');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Send Recovery OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) {
      setError('Please enter your registered email address or mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.requestForgotPasswordOtp(identifier.trim());
      setSuccessMsg(res.data.message || 'Recovery code dispatched.');
      setCooldown(60);
      setStep('VERIFY_OTP');
    } catch (err: any) {
      setError(err?.message || 'Unable to request recovery code. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Recovery OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.verifyForgotPasswordOtp(identifier.trim(), otp.trim());
      setResetToken(res.data.resetToken);
      setStep('SET_PASSWORD');
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.requestForgotPasswordOtp(identifier.trim());
      setSuccessMsg(res.data.message || 'New recovery code dispatched.');
      setCooldown(60);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.resetForgotPassword({
        identifier: identifier.trim(),
        resetToken,
        newPassword,
      });
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Reset token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090C15] text-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-['Inter']">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center gap-2 mb-8 text-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-pink-500 font-black text-2xl">✳</span>
            <span className="font-extrabold text-xl tracking-wider text-white font-['Outfit']">PULSR</span>
          </Link>
          <h1 className="font-extrabold text-2xl tracking-tight text-white font-['Outfit'] mt-2">
            Reset Password
          </h1>
          <p className="text-xs text-slate-400">
            Recover access using your verified mobile number or email
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0F1424]/90 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-3xl border border-slate-800 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && step === 'VERIFY_OTP' && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <span>✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Step 1: Identify Account */}
          {step === 'IDENTIFY' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Registered Email or Mobile Number
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@domain.com or +919876543210"
                  required
                  className="w-full px-4 py-3 bg-[#161B2E] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  We will send a 6-digit recovery code to your verified destination.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-pink-950/40 transition-all disabled:opacity-50"
              >
                {loading ? 'Sending Code…' : 'Send Recovery Code'}
              </button>

              <div className="text-center pt-2">
                <Link href="/auth/login" className="text-xs text-slate-400 hover:text-white transition-colors">
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === 'VERIFY_OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    6-Digit Recovery Code
                  </label>
                  <button
                    type="button"
                    onClick={() => { setStep('IDENTIFY'); setOtp(''); }}
                    className="text-[11px] text-pink-400 hover:underline"
                  >
                    Change Destination
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl px-4 py-3 bg-[#161B2E] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || loading}
                  className="text-pink-400 font-bold hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying…' : 'Verify Code'}
              </button>
            </form>
          )}

          {/* Step 3: Set New Password */}
          {step === 'SET_PASSWORD' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="w-full px-4 py-3 bg-[#161B2E] border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-xs text-slate-400 hover:text-white"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="w-full px-4 py-3 bg-[#161B2E] border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save New Password'}
              </button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === 'SUCCESS' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-2xl mx-auto">
                ✓
              </div>
              <h2 className="text-lg font-bold text-white">Password Updated!</h2>
              <p className="text-xs text-slate-400">
                Your new password has been set and verified. You can now sign in using your updated credentials on both web and mobile.
              </p>
              <button
                type="button"
                onClick={() => router.push('/auth/login')}
                className="w-full py-3.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm shadow-lg transition-all"
              >
                Continue to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
