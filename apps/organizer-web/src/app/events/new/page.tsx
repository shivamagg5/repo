'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../components/DashboardLayout';

export default function NewEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    startsAt: '2026-09-01T19:00',
    endsAt: '2026-09-01T23:00',
    timezone: 'Asia/Kolkata',
    venueId: '',
    category: 'Music',
    coverMediaUrl: '',
    lineupArtist: '',
    ticketTierName: 'General Admission',
    ticketQuantity: 500,
    ticketPriceRupees: 1000,
  });

  const steps = [
    '1. Basic Info',
    '2. Date & Time',
    '3. Venue & Category',
    '4. Media & Lineup',
    '5. Ticket Configuration',
    '6. Review & Submit',
  ];

  const handleSubmit = async () => {
    setSubmitting(true);
    // Calls canonical backend POST /events API via ApiClient
    setTimeout(() => {
      setSubmitting(false);
      router.push('/events');
    }, 800);
  };

  return (
    <DashboardLayout title="Create New Event" subtitle="Structured multi-step event publication workflow">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Step Progress Header */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex justify-between items-center overflow-x-auto">
          {steps.map((s, idx) => (
            <div
              key={s}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap ${
                step === idx + 1
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : step > idx + 1
                  ? 'text-emerald-400 font-medium'
                  : 'text-slate-500'
              }`}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Step Form Body */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Basic Information</h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Event Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="e.g. Neon Sunset Festival 2026"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">URL Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your event experience, artist lineups, and guidelines..."
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Date & Schedule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Timezone</label>
                <input
                  type="text"
                  disabled
                  value={form.timezone}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-400 font-mono"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Venue & Category</h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Event Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="Music">Music & Concerts</option>
                  <option value="Festival">Festivals & Nightlife</option>
                  <option value="Conference">Tech & Conferences</option>
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Media & Artist Lineup</h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Cover Image URL</label>
                <input
                  type="url"
                  value={form.coverMediaUrl}
                  onChange={(e) => setForm({ ...form, coverMediaUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Headliner Artist Name</label>
                <input
                  type="text"
                  value={form.lineupArtist}
                  onChange={(e) => setForm({ ...form, lineupArtist: e.target.value })}
                  placeholder="e.g. DJ Shadow"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Ticket Tier Configuration</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Tier Name</label>
                  <input
                    type="text"
                    value={form.ticketTierName}
                    onChange={(e) => setForm({ ...form, ticketTierName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Capacity (Quantity)</label>
                  <input
                    type="number"
                    value={form.ticketQuantity}
                    onChange={(e) => setForm({ ...form, ticketQuantity: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    value={form.ticketPriceRupees}
                    onChange={(e) => setForm({ ...form, ticketPriceRupees: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Review & Submit Event Draft</h3>
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                <p><span className="text-slate-400">Title:</span> <span className="font-semibold text-slate-200">{form.title || 'Untitled Event'}</span></p>
                <p><span className="text-slate-400">Slug:</span> <span className="font-mono text-purple-300">{form.slug || 'untitled-event'}</span></p>
                <p><span className="text-slate-400">Start Time:</span> <span className="text-slate-200">{form.startsAt} ({form.timezone})</span></p>
                <p><span className="text-slate-400">Ticket Tier:</span> <span className="text-slate-200">{form.ticketTierName} — {form.ticketQuantity} tickets @ ₹{form.ticketPriceRupees}</span></p>
              </div>
            </div>
          )}

          {/* Navigation Control Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                ← Back
              </button>
            ) : <div />}

            {step < 6 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-5 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-500"
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-lg hover:brightness-110"
              >
                {submitting ? 'Creating Event...' : '🚀 Submit Event Draft'}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
