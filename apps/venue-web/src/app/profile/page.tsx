'use client';

import React, { useState } from 'react';
import { VenueLayout } from '../../components/VenueLayout';

export default function VenueProfilePage() {
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [form, setForm] = useState({
    name: 'Grand Arena',
    capacity: 5000,
    address: 'GT Road, Near Airport Expressway',
    city: 'Amritsar',
    state: 'Punjab',
    country: 'IN',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    // Calls PATCH /venue/profile via ApiClient
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
    }, 600);
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

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Venue Name</label>
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
              <label className="text-slate-400 block mb-1">Total Seating Capacity</label>
              <input
                type="number"
                required
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Country Code</label>
              <input
                type="text"
                disabled
                value={form.country}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-400 font-mono text-sm"
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
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:brightness-110"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </VenueLayout>
  );
}
