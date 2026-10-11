// =============================================================================
// consumer-web — Multi-Step Attendee Registration Flow
// Phase 3 compliant: Mobile OTP -> Customer Details -> Supabase Identity Creation -> Email Confirmation
// =============================================================================
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@platform/auth';
import { apiClient } from '../../../lib/api';

type SignupStep = 'PHONE_EMAIL' | 'MOBILE_OTP' | 'CUSTOMER_DETAILS' | 'EMAIL_CONFIRMATION';

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', label: 'India (+91)' },
  { code: '+1', country: 'US', label: 'USA / Canada (+1)' },
  { code: '+44', country: 'GB', label: 'UK (+44)' },
  { code: '+971', country: 'AE', label: 'UAE (+971)' },
  { code: '+65', country: 'SG', label: 'Singapore (+65)' },
  { code: '+61', country: 'AU', label: 'Australia (+61)' },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const { loginAsDemo, loginWithGoogle, loginWithApple } = useAuth();

  // Step tracking
  const [step, setStep] = useState<SignupStep>('PHONE_EMAIL');

  // Step 1: Phone + Email
  const [countryCode, setCountryCode] = useState('+91');
  const [rawPhone, setRawPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 2: Mobile OTP
  const [otp, setOtp] = useState('');
  const [phoneVerificationToken, setPhoneVerificationToken] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Step 3: Customer Details
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const fullPhone = `${countryCode}${rawPhone.trim().replace(/\D/g, '')}`;

  // Step 1 Submission: Initiate Mobile OTP
  const handleInitiateOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setInfoMessage(null);

    const cleanDigits = rawPhone.trim().replace(/\D/g, '');
    if (cleanDigits.length < 7 || cleanDigits.length > 14) {
      setLocalError('Please enter a valid mobile number.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.sendOtp(fullPhone, 'signup');
      setInfoMessage(`Verification code sent to ${fullPhone}`);
      setCooldown(res.data.cooldownSeconds || 60);
      setStep('MOBILE_OTP');
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to dispatch verification code. Please check your number.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2 Submission: Verify Mobile OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!otp.trim() || otp.trim().length !== 6) {
      setLocalError('Please enter the 6-digit code received on your mobile.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.verifyOtp(fullPhone, otp.trim(), 'signup');
      setPhoneVerificationToken(res.data.verificationToken);
      setStep('CUSTOMER_DETAILS');
    } catch (err: any) {
      setLocalError(err?.message || 'Invalid or expired verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || submitting) return;
    setLocalError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.sendOtp(fullPhone, 'signup');
      setInfoMessage(`New verification code sent to ${fullPhone}`);
      setCooldown(res.data.cooldownSeconds || 60);
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to resend verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3 Submission: Create Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!dob) {
      setLocalError('Please select your date of birth.');
      return;
    }

    // Minimum age check (18+)
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      setLocalError('You must be at least 18 years old to create an attendee account.');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please verify both fields.');
      return;
    }
    if (!termsAccepted) {
      setLocalError('You must agree to the Terms and Conditions and Privacy Policy.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.signup({
        phone: fullPhone,
        phoneVerificationToken,
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        dob,
        whatsappConsent,
        termsAccepted: true,
        termsVersion: '1.0',
      });

      setStep('EMAIL_CONFIRMATION');
    } catch (err: any) {
      setLocalError(err?.message || 'Account creation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090C15] text-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-['Inter']">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Branding Header */}
        <div className="flex flex-col items-center justify-center gap-2 mb-8 text-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-pink-500 font-black text-2xl">✳</span>
            <span className="font-extrabold text-xl tracking-wider text-white font-['Outfit']">PULSR</span>
          </Link>
          <h1 className="font-extrabold text-2xl tracking-tight text-white font-['Outfit'] mt-1">
            {step === 'PHONE_EMAIL' && 'Join the Live Community'}
            {step === 'MOBILE_OTP' && 'Verify Mobile Number'}
            {step === 'CUSTOMER_DETAILS' && 'Profile Details'}
            {step === 'EMAIL_CONFIRMATION' && 'Confirm Your Email'}
          </h1>
          <p className="text-xs text-slate-400">
            {step === 'PHONE_EMAIL' && 'One verified identity for mobile app and web access'}
            {step === 'MOBILE_OTP' && `Enter the 6-digit code dispatched to ${fullPhone}`}
            {step === 'CUSTOMER_DETAILS' && 'Complete your attendee credentials and preferences'}
            {step === 'EMAIL_CONFIRMATION' && `Check your inbox at ${email}`}
          </p>

          {/* Progress Indicator */}
          {step !== 'EMAIL_CONFIRMATION' && (
            <div className="flex items-center gap-2 mt-3">
              <div className={`h-1.5 w-12 rounded-full transition-colors ${step === 'PHONE_EMAIL' ? 'bg-pink-500' : 'bg-slate-700'}`} />
              <div className={`h-1.5 w-12 rounded-full transition-colors ${step === 'MOBILE_OTP' ? 'bg-pink-500' : 'bg-slate-700'}`} />
              <div className={`h-1.5 w-12 rounded-full transition-colors ${step === 'CUSTOMER_DETAILS' ? 'bg-pink-500' : 'bg-slate-700'}`} />
            </div>
          )}
        </div>

        {/* Synchronized Segmented Switcher [ Sign In | Sign Up ] */}
        {step === 'PHONE_EMAIL' && (
          <div className="flex bg-[#161B2E] p-1 rounded-2xl border border-slate-800 mb-6">
            <Link
              href={`/auth/login${redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
              className="flex-1 py-2.5 text-center text-xs font-bold rounded-xl text-slate-400 hover:text-white transition-all"
            >
              Sign In
            </Link>
            <div className="flex-1 py-2.5 text-center text-xs font-bold rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-900/40">
              Sign Up
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-[#0F1424]/90 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-3xl border border-slate-800 space-y-6">
          {localError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{localError}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-800 text-purple-300 text-xs flex items-center gap-2">
              <span>ℹ️</span>
              <span>{infoMessage}</span>
            </div>
          )}

          {/* STEP 1: Phone + Email */}
          {step === 'PHONE_EMAIL' && (
            <form onSubmit={handleInitiateOtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-[#161B2E] border border-slate-700/80 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-pink-500"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-[#0F1424]">
                        {c.code} ({c.country})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    value={rawPhone}
                    onChange={(e) => setRawPhone(e.target.value)}
                    placeholder="98765 43210"
                    className="flex-1 px-4 py-3 bg-[#161B2E] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-4 py-3 bg-[#161B2E] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-pink-950/40 transition-all disabled:opacity-50"
              >
                {submitting ? 'Sending OTP…' : 'Continue →'}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-mono">
                  Or Social Access
                </span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => loginWithGoogle()}
                  className="py-2.5 px-4 rounded-xl bg-[#161B2E] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center justify-center gap-2"
                >
                  <span>G</span> Google
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
                Already have an account?{' '}
                <Link href="/auth/login" className="text-pink-400 font-bold hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}

          {/* STEP 2: Mobile OTP */}
          {step === 'MOBILE_OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    6-Digit Mobile Code
                  </label>
                  <button
                    type="button"
                    onClick={() => { setStep('PHONE_EMAIL'); setOtp(''); }}
                    className="text-[11px] text-pink-400 hover:underline"
                  >
                    Edit Number
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
                  disabled={cooldown > 0 || submitting}
                  className="text-pink-400 font-bold hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg transition-all disabled:opacity-50"
              >
                {submitting ? 'Verifying…' : 'Verify Mobile OTP'}
              </button>
            </form>
          )}

          {/* STEP 3: Customer Details */}
          {step === 'CUSTOMER_DETAILS' && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav Patel"
                  className="w-full px-4 py-3 bg-[#161B2E] border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Date of Birth (18+ Required)
                </label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-3 bg-[#161B2E] border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
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
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-4 py-3 bg-[#161B2E] border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Optional WhatsApp Consent */}
              <label className="flex items-start gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={whatsappConsent}
                  onChange={(e) => setWhatsappConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded bg-[#161B2E] border-slate-700 text-pink-600 focus:ring-pink-500"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  Receive event updates, drop alerts, and exclusive offers on WhatsApp. (Optional)
                </span>
              </label>

              {/* Required Terms Acceptance */}
              <label className="flex items-start gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded bg-[#161B2E] border-slate-700 text-pink-600 focus:ring-pink-500"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" className="text-pink-400 underline hover:text-pink-300">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="text-pink-400 underline hover:text-pink-300">
                    Privacy Policy
                  </Link>
                  . (Required)
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-pink-950/40 transition-all disabled:opacity-50"
              >
                {submitting ? 'Creating Profile…' : 'Create Account'}
              </button>
            </form>
          )}

          {/* STEP 4: Email Confirmation */}
          {step === 'EMAIL_CONFIRMATION' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/40 flex items-center justify-center text-2xl mx-auto">
                ✉️
              </div>
              <h2 className="text-lg font-bold text-white">Confirmation Link Sent</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                We have created your canonical account and sent an ownership confirmation link to{' '}
                <span className="font-semibold text-white">{email}</span>.
              </p>
              <div className="p-3 rounded-xl bg-[#161B2E] border border-slate-800 text-left text-xs text-slate-400 space-y-1">
                <p>• Mobile verified: <span className="text-emerald-400 font-mono">✓ {fullPhone}</span></p>
                <p>• Email verification: <span className="text-amber-400">Pending confirmation link</span></p>
              </div>
              <p className="text-[11px] text-slate-500">
                You can now sign in with your credentials on both the website and mobile app.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => router.push('/auth/login')}
                  className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg transition-all"
                >
                  Continue to Sign In
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="w-full py-2.5 rounded-xl bg-[#161B2E] hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-all"
                >
                  Explore Events
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090C15]" />}>
      <RegisterForm />
    </Suspense>
  );
}
