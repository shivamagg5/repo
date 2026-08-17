// =============================================================================
// venue-web — Venue Profile Configuration
// Authoritative venue details management wired to GET/PATCH /venue/profile.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { VenueLayout } from '../../components/VenueLayout';
import { apiClient, ApiError } from '../../lib/api';

export default function VenueProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    capacity: 0,
    address: '',
    city: '',
    state: '',
    country: 'IN',
    timezone: 'Asia/Kolkata',
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getVenueProfile<any>();
      if (res.data) {
        setForm({
          name: res.data.name ?? '',
          capacity: res.data.capacity ?? 0,
          address: res.data.address ?? '',
          city: res.data.city ?? '',
          state: res.data.state ?? '',
          country: res.data.country ?? 'IN',
          timezone: res.data.timezone ?? 'Asia/Kolkata',
        });
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load venue profile.');
      } else {
        setError(err?.message || 'Error occurred while loading profile.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);
    try {
      await apiClient.updateVenueProfile({
        name: form.name.trim(),
        capacity: Number(form.capacity),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        timezone: form.timezone.trim() || undefined,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to update venue profile.');
      } else {
        setError(err?.message || 'Error occurred while saving changes.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <VenueLayout title="Venue Profile" subtitle="Manage capacity, location details, and venue operating configuration">
      <div className="max-w-2xl mx-auto glass-panel p-6 rounded-xl border border-slate-800 space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-slate-100">Profile Configuration</h3>
          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              ✓ Profile saved successfully
            </span>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading venue profile...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Venue Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">Total Seating Capacity *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Operating Timezone</label>
                <input
                  type="text"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Street Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50"
              >
                {saving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </VenueLayout>
  );
}
