// =============================================================================
// consumer-web — Consumer Profile & Account Settings
// Phase 4 & 7 compliant: Email verification status & resend, mobile verification,
// DOB editing, WhatsApp consent management, Change Password, and Change Phone.
// =============================================================================
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@platform/auth';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { apiClient } from '../../lib/api';

export default function ConsumerProfilePage() {
  const router = useRouter();
  const { user, profile, status, logout, refreshProfile } = useAuth();

  // Profile fields state
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(false);

  // Status feedback
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Email verification resend state
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailResendSuccess, setEmailResendSuccess] = useState<string | null>(null);
  const [emailResendError, setEmailResendError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Change Password Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Change Mobile Number Modal state
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpStep, setPhoneOtpStep] = useState<'ENTER_PHONE' | 'VERIFY_OTP'>('ENTER_PHONE');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSuccess, setPhoneSuccess] = useState<string | null>(null);
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  // Hydrate local state when profile is loaded
  useEffect(() => {
    if (profile) {
      setNameInput(profile.name || user?.user_metadata?.['name'] || '');
      setDobInput(profile.dob || '');
      setWhatsappConsent(Boolean(profile.whatsappConsent));
    } else if (user) {
      setNameInput(user.user_metadata?.['name'] || user.email?.split('@')[0] || '');
      setDobInput(user.user_metadata?.['dob'] || '');
      setWhatsappConsent(Boolean(user.user_metadata?.['whatsapp_consent']));
    }
  }, [profile, user]);

  // Email resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Phone OTP cooldown timer
  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const t = setInterval(() => setPhoneCooldown((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [phoneCooldown]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0C10] text-slate-100 flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.replace('/auth/login?redirectTo=/profile');
    return null;
  }

  const isEmailVerified = Boolean(profile?.emailVerified || user?.email_confirmed_at);
  const isPhoneVerified = Boolean(profile?.phoneVerified);
  const displayName = nameInput || profile?.name || user?.user_metadata?.['name'] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  // Save Name & DOB
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await apiClient.updateUserProfile({
        name: nameInput.trim() || undefined,
        dob: dobInput || undefined,
        whatsappConsent,
      });
      await refreshProfile();
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to update profile details.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle WhatsApp Consent with direct persistence
  const handleToggleWhatsapp = async (checked: boolean) => {
    setWhatsappConsent(checked);
    try {
      await apiClient.updateUserProfile({ whatsappConsent: checked });
      await refreshProfile();
    } catch {
      // ignore non-critical
    }
  };

  // Resend Email Confirmation Link
  const handleResendEmail = async () => {
    if (resendCooldown > 0 || resendingEmail) return;
    setResendingEmail(true);
    setEmailResendError(null);
    setEmailResendSuccess(null);

    try {
      const res = await apiClient.resendConfirmationEmail(user?.email || profile?.email || undefined);
      setEmailResendSuccess(res.data.message || 'Verification link sent to your email.');
      setResendCooldown(60);
    } catch (err: any) {
      setEmailResendError(err?.message || 'Failed to send confirmation email. Please try again.');
    } finally {
      setResendingEmail(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Request Phone Change OTP
  const handleRequestPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setPhoneSuccess(null);

    const clean = newPhone.trim();
    if (!clean.startsWith('+') || clean.length < 8) {
      setPhoneError('Please include country code in E.164 format (e.g. +919876543210).');
      return;
    }

    setSavingPhone(true);
    try {
      const res = await apiClient.changePhoneRequest(clean);
      setPhoneSuccess(res.data.message || 'Verification code sent to your new mobile number.');
      setPhoneCooldown((res.data as any).cooldownSeconds || 60);
      setPhoneOtpStep('VERIFY_OTP');
    } catch (err: any) {
      setPhoneError(err?.message || 'Failed to send verification code to new number.');
    } finally {
      setSavingPhone(false);
    }
  };

  // Verify Phone Change OTP
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setPhoneSuccess(null);

    if (phoneOtp.trim().length !== 6) {
      setPhoneError('Please enter the 6-digit verification code.');
      return;
    }

    setSavingPhone(true);
    try {
      await apiClient.changePhoneVerify(newPhone.trim(), phoneOtp.trim());
      await refreshProfile();
      setPhoneSuccess('Mobile number updated and verified successfully!');
      setTimeout(() => {
        setShowPhoneModal(false);
        setPhoneSuccess(null);
        setPhoneOtpStep('ENTER_PHONE');
        setNewPhone('');
        setPhoneOtp('');
      }, 2000);
    } catch (err: any) {
      setPhoneError(err?.message || 'Invalid verification code.');
    } finally {
      setSavingPhone(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-100 flex flex-col justify-between font-['Inter']">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-6">
        {/* Profile Header */}
        <div className="glass-surface p-6 sm:p-8 rounded-3xl border border-gray-800 flex flex-wrap items-center justify-between gap-6 bg-[#12151D]/80">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-xl shadow-pink-950/40">
              {initial}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">{displayName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30 uppercase">
                  {profile?.status ?? 'active'}
                </span>
              </div>
              <p className="text-sm text-gray-400 font-mono mt-0.5">{profile?.email || user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="px-5 py-2.5 rounded-xl bg-red-950/40 text-red-400 border border-red-800/60 hover:bg-red-900/50 text-xs font-bold transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Phase 4: Email Verification Status Banner */}
        <div className={`p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
          isEmailVerified
            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
            : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{isEmailVerified ? '✅' : '⚠️'}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">
                  {isEmailVerified ? 'Email verified' : 'Email not verified'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                  isEmailVerified ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {isEmailVerified ? 'Confirmed' : 'Action Required'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isEmailVerified
                  ? 'Your email address is verified for ticket deliveries and account notifications.'
                  : 'Please verify your email using the confirmation link we sent you to secure your account.'}
              </p>
            </div>
          </div>

          {!isEmailVerified && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={resendingEmail || resendCooldown > 0}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50"
              >
                {resendingEmail
                  ? 'Sending Link…'
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend verification email'}
              </button>
            </div>
          )}
        </div>

        {emailResendSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
            ✓ {emailResendSuccess}
          </div>
        )}
        {emailResendError && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
            ⚠️ {emailResendError}
          </div>
        )}

        {/* Success Alert */}
        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <span>✅</span> Profile updated successfully!
          </div>
        )}

        {/* Edit Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="glass-surface p-6 sm:p-8 rounded-3xl border border-purple-500/40 space-y-4 bg-[#12151D]/90 animate-fadeIn"
          >
            <h2 className="text-base font-bold text-white font-['Outfit']">Edit Profile Details</h2>
            {saveError && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 p-2.5 rounded-xl">
                {saveError}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dobInput}
                  onChange={(e) => setDobInput(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-gray-700 text-gray-300 text-xs font-semibold hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Phase 7: Account Credentials & Security Section */}
        <div className="glass-surface p-6 sm:p-8 rounded-3xl border border-gray-800 space-y-6 bg-[#12151D]/60">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white font-['Outfit']">Identity & Security</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPhoneModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#161B2E] border border-slate-700 hover:border-pink-500 text-xs font-semibold text-slate-200 transition-colors"
              >
                Change Mobile
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#161B2E] border border-slate-700 hover:border-pink-500 text-xs font-semibold text-slate-200 transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Mobile Number Card */}
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex justify-between items-center">
              <div>
                <span className="text-gray-400 block mb-1">Mobile Number</span>
                <p className="font-mono text-gray-200 text-sm font-semibold">{profile?.phone || 'Not registered'}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                isPhoneVerified
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {isPhoneVerified ? '✓ Verified' : 'Unverified'}
              </span>
            </div>

            {/* Email Card */}
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex justify-between items-center">
              <div>
                <span className="text-gray-400 block mb-1">Primary Email</span>
                <p className="font-mono text-gray-200 text-sm font-semibold">{profile?.email || user?.email || '—'}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                isEmailVerified
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {isEmailVerified ? '✓ Verified' : 'Unconfirmed'}
              </span>
            </div>

            {/* Date of Birth Card */}
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-gray-400 block mb-1">Date of Birth</span>
              <p className="font-mono text-gray-200 text-sm font-semibold">{profile?.dob || 'Not provided'}</p>
            </div>

            {/* Account Status Card */}
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-gray-400 block mb-1">Account Status</span>
              <p className="font-semibold text-emerald-400 uppercase tracking-wider">{profile?.status ?? 'active'}</p>
            </div>
          </div>

          {/* Phase 7: WhatsApp Consent Management */}
          <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-800 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-white">Receive Updates and Offers on WhatsApp</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                We'll notify you on WhatsApp about exclusive ticket drops, venue radar alerts, and booking receipts.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={whatsappConsent}
                onChange={(e) => handleToggleWhatsapp(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/tickets"
            className="glass-surface p-5 rounded-2xl border border-gray-800 hover:border-pink-500/50 transition-all bg-[#12151D]/60 group"
          >
            <span className="text-2xl">🎟️</span>
            <h3 className="font-bold text-white text-base mt-2 group-hover:text-pink-400 transition-colors font-['Outfit']">My Tickets</h3>
            <p className="text-xs text-gray-400 mt-1">View active wallet QR tickets and offline passes.</p>
          </Link>

          <Link
            href="/orders"
            className="glass-surface p-5 rounded-2xl border border-gray-800 hover:border-purple-500/50 transition-all bg-[#12151D]/60 group"
          >
            <span className="text-2xl">📦</span>
            <h3 className="font-bold text-white text-base mt-2 group-hover:text-purple-400 transition-colors font-['Outfit']">Order History</h3>
            <p className="text-xs text-gray-400 mt-1">Inspect payment receipts and past ticket purchases.</p>
          </Link>

          <Link
            href="/notifications"
            className="glass-surface p-5 rounded-2xl border border-gray-800 hover:border-violet-500/50 transition-all bg-[#12151D]/60 group"
          >
            <span className="text-2xl">🔔</span>
            <h3 className="font-bold text-white text-base mt-2 group-hover:text-violet-400 transition-colors font-['Outfit']">Notifications</h3>
            <p className="text-xs text-gray-400 mt-1">Manage delivery preferences and operational alerts.</p>
          </Link>
        </div>
      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1424] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white font-['Outfit']">Change Account Password</h3>
            <p className="text-xs text-slate-400">
              Verify your current password to set a new password. The new password will apply across web and mobile.
            </p>

            {passwordError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
                ⚠️ {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                ✓ {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-[#161B2E] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">New Password (8+ chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#161B2E] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-[#161B2E] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {savingPassword ? 'Updating…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Mobile Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1424] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white font-['Outfit']">Update Mobile Number</h3>
            <p className="text-xs text-slate-400">
              Enter your new mobile number. A 6-digit verification code will be sent to confirm ownership.
            </p>

            {phoneError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
                ⚠️ {phoneError}
              </div>
            )}
            {phoneSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                ✓ {phoneSuccess}
              </div>
            )}

            {phoneOtpStep === 'ENTER_PHONE' ? (
              <form onSubmit={handleRequestPhoneOtp} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">New Mobile Number (with country code)</label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full bg-[#161B2E] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowPhoneModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPhone}
                    className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {savingPhone ? 'Sending…' : 'Send Verification Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-slate-300">6-Digit Code for {newPhone}</label>
                    <button
                      type="button"
                      onClick={() => setPhoneOtpStep('ENTER_PHONE')}
                      className="text-[11px] text-pink-400 hover:underline"
                    >
                      Change Number
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.5em] font-mono text-xl bg-[#161B2E] border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Didn't receive code?</span>
                  <button
                    type="button"
                    onClick={handleRequestPhoneOtp}
                    disabled={phoneCooldown > 0 || savingPhone}
                    className="text-pink-400 font-bold hover:underline disabled:opacity-50"
                  >
                    {phoneCooldown > 0 ? `Resend in ${phoneCooldown}s` : 'Resend Code'}
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowPhoneModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPhone || phoneOtp.length !== 6}
                    className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {savingPhone ? 'Verifying…' : 'Confirm New Number'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
