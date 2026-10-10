// =============================================================================
// consumer-web — Consumer Profile & Account Settings
// Real user profile, dynamic tier, edit profile (name & phone), and security settings.
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
  const { user, profile, status, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setNameInput(profile.name || user?.user_metadata?.['name'] || '');
      setPhoneInput(profile.phone || '');
    } else if (user) {
      setNameInput(user.user_metadata?.['name'] || user.email?.split('@')[0] || '');
    }
  }, [profile, user]);

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

  const displayName = nameInput || profile?.name || user?.user_metadata?.['name'] || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const accountTier = profile?.role
    ? `${profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} Passholder`
    : user?.user_metadata?.['role']
    ? `${user.user_metadata['role']} Account`
    : 'Verified Consumer Attendee';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await apiClient.updateUserProfile({
        name: nameInput.trim() || undefined,
        phone: phoneInput.trim() || undefined,
      });
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to update profile details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-100 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-6">
        {/* Profile Header */}
        <div className="glass-surface p-6 sm:p-8 rounded-3xl border border-gray-800 flex flex-wrap items-center justify-between gap-6 bg-[#12151D]/80">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-xl shadow-purple-950/50">
              {initial}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-white">{displayName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                  {profile?.status ?? 'active'}
                </span>
              </div>
              <p className="text-sm text-gray-400 font-mono mt-0.5">{user?.email}</p>
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

        {/* Success Alert */}
        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <span>✅</span> Profile updated successfully!
          </div>
        )}

        {/* Edit Form Modal/Card */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="glass-surface p-6 sm:p-8 rounded-3xl border border-purple-500/40 space-y-4 bg-[#12151D]/90 animate-fadeIn"
          >
            <h2 className="text-base font-bold text-white">Edit Your Details</h2>
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
                <label className="text-xs text-gray-400 block mb-1">Mobile Phone (with country code)</label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+91 98765 43210"
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
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/tickets"
            className="glass-surface p-5 rounded-2xl border border-gray-800 hover:border-purple-500/50 transition-all bg-[#12151D]/60 group"
          >
            <span className="text-2xl">🎟️</span>
            <h3 className="font-bold text-white text-base mt-2 group-hover:text-purple-400 transition-colors">My Tickets</h3>
            <p className="text-xs text-gray-400 mt-1">View active wallet QR tickets and offline passes.</p>
          </Link>

          <Link
            href="/orders"
            className="glass-surface p-5 rounded-2xl border border-gray-800 hover:border-indigo-500/50 transition-all bg-[#12151D]/60 group"
          >
            <span className="text-2xl">📦</span>
            <h3 className="font-bold text-white text-base mt-2 group-hover:text-indigo-400 transition-colors">Order History</h3>
            <p className="text-xs text-gray-400 mt-1">Inspect payment receipts and past ticket purchases.</p>
          </Link>

          <Link
            href="/notifications"
            className="glass-surface p-5 rounded-2xl border border-gray-800 hover:border-violet-500/50 transition-all bg-[#12151D]/60 group"
          >
            <span className="text-2xl">🔔</span>
            <h3 className="font-bold text-white text-base mt-2 group-hover:text-violet-400 transition-colors">Notifications</h3>
            <p className="text-xs text-gray-400 mt-1">Manage delivery preferences and operational alerts.</p>
          </Link>
        </div>

        {/* Account Details */}
        <div className="glass-surface p-6 sm:p-8 rounded-3xl border border-gray-800 space-y-6 bg-[#12151D]/60">
          <h2 className="text-lg font-bold text-white">Account Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-gray-400 block mb-1">User Account ID</span>
              <p className="font-mono text-purple-300 font-bold">{user?.id ?? profile?.id ?? '—'}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-gray-400 block mb-1">Registered Email</span>
              <p className="font-mono text-gray-200">{user?.email ?? '—'}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-gray-400 block mb-1">Mobile Phone</span>
              <p className="font-mono text-gray-200">{phoneInput || profile?.phone || 'Not registered'}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-gray-400 block mb-1">Account Tier</span>
              <p className="font-semibold text-emerald-400">{accountTier}</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
