'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { apiClient, ApiError } from '../../../lib/api';
import { useAuth, useAnalytics } from '@platform/auth';
import type { CreateEventInput } from '@platform/types';

export default function NewEventPage() {
  const router = useRouter();
  const { organizations } = useAuth();
  const activeOrg = organizations.find((o) => o.type === 'organizer' && o.status === 'active') ?? organizations[0];
  const { track } = useAnalytics(apiClient);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Partial creation recovery state
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [creationProgress, setCreationProgress] = useState<{
    eventCreated: boolean;
    ticketTypeCreated: boolean;
    lineupSet: boolean;
    mediaAdded: boolean;
  }>({
    eventCreated: false,
    ticketTypeCreated: false,
    lineupSet: false,
    mediaAdded: false,
  });

  // Form State
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    startsAt: '2026-09-01T19:00',
    endsAt: '2026-09-01T23:00',
    timezone: 'Asia/Kolkata',
    category: 'Music',
    ageRestriction: '18+',
    coverMediaUrl: '',
    lineupArtist: '',
    lineupRole: 'Headliner',
    ticketTierName: 'General Admission',
    ticketQuantity: 500,
    ticketPriceRupees: 1000,
    minPerOrder: 1,
    maxPerOrder: 10,
  });

  const steps = [
    '1. Basic Info',
    '2. Date & Time',
    '3. Venue & Category',
    '4. Media & Lineup',
    '5. Ticket Configuration',
    '6. Review & Submit',
  ];

  const handleSlugify = (title: string) => {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setForm((prev) => ({ ...prev, title, slug }));
  };

  const handleSubmit = async () => {
    if (!activeOrg?.id) {
      setError('Active organizer organization context is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    let eventId = createdEventId;

    try {
      // Step 1: Create Core Event (Draft) if not already created
      if (!eventId) {
        const createPayload: CreateEventInput = {
          title: form.title.trim(),
          slug: form.slug.trim(),
          description: form.description ? form.description.trim() : undefined,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          timezone: form.timezone,
          ageRestriction: form.ageRestriction || undefined,
        };

        const eventRes = await apiClient.createEvent<{ id: string }>(activeOrg.id, createPayload);
        eventId = eventRes.data.id;
        setCreatedEventId(eventId);
        setCreationProgress((prev) => ({ ...prev, eventCreated: true }));
        track('event_created', { category: form.category }, eventId);
      }

      // Step 2: Configure Initial Ticket Tier
      if (eventId && !creationProgress.ticketTypeCreated && form.ticketTierName) {
        try {
          await apiClient.createTicketType(eventId, {
            name: form.ticketTierName.trim(),
            priceMinor: Math.round(Number(form.ticketPriceRupees) * 100),
            currency: 'INR',
            quantity: Number(form.ticketQuantity),
            minPerOrder: Number(form.minPerOrder),
            maxPerOrder: Number(form.maxPerOrder),
            status: 'active',
          });
          setCreationProgress((prev) => ({ ...prev, ticketTypeCreated: true }));
          track(
            'ticket_type_created',
            {
              name: form.ticketTierName.trim(),
              quantity: Number(form.ticketQuantity),
              priceMinor: Math.round(Number(form.ticketPriceRupees) * 100),
            },
            eventId,
          );
        } catch (tierErr: any) {
          setError(`Event created, but ticket tier configuration failed: ${tierErr?.message ?? 'Unknown error'}. You can retry or configure tiers in Command Center.`);
          setSubmitting(false);
          return;
        }
      }

      // Step 3: Set Lineup if provided
      if (eventId && !creationProgress.lineupSet && form.lineupArtist.trim()) {
        try {
          await apiClient.setEventLineup(eventId, {
            lineup: [
              {
                name: form.lineupArtist.trim(),
                role: form.lineupRole || null,
                sortOrder: 0,
              },
            ],
          });
          setCreationProgress((prev) => ({ ...prev, lineupSet: true }));
        } catch (lineupErr: any) {
          setError(`Event created, but lineup update failed: ${lineupErr?.message ?? 'Unknown error'}.`);
          setSubmitting(false);
          return;
        }
      }

      // Step 4: Add Media if provided
      if (eventId && !creationProgress.mediaAdded && form.coverMediaUrl.trim()) {
        try {
          await apiClient.addEventMedia(eventId, {
            url: form.coverMediaUrl.trim(),
            type: 'image',
            sortOrder: 0,
          });
          setCreationProgress((prev) => ({ ...prev, mediaAdded: true }));
        } catch (mediaErr: any) {
          setError(`Event created, but media upload reference failed: ${mediaErr?.message ?? 'Unknown error'}.`);
          setSubmitting(false);
          return;
        }
      }

      // Success: Navigate directly to Event Command Center
      router.push(`/events/${eventId}`);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to create event. Please check inputs and try again.');
      } else {
        setError(err?.message || 'A network error occurred during event creation.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Create New Event" subtitle="Structured multi-step event publication workflow">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Step Progress Header */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex justify-between items-center overflow-x-auto gap-2">
          {steps.map((s, idx) => (
            <button
              key={s}
              type="button"
              onClick={() => !createdEventId && setStep(idx + 1)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                step === idx + 1
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : step > idx + 1
                  ? 'text-emerald-400 font-medium'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Partial Creation Recovery Banner */}
        {createdEventId && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-amber-300">⚠️ Event Draft Created (ID: {createdEventId})</p>
              <p className="text-[11px] text-amber-400/80 mt-0.5">
                Core event saved. Complete remaining setup steps below or proceed directly to Command Center.
              </p>
            </div>
            <Link
              href={`/events/${createdEventId}`}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
            >
              Open Command Center →
            </Link>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Step Form Body */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Step 1: Basic Information</h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => handleSlugify(e.target.value)}
                  placeholder="e.g. Neon Sunset Music Festival 2026"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">URL Slug *</label>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="e.g. neon-sunset-music-festival-2026"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your event experience, artist lineups, and attendee guidelines..."
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Step 2: Date & Timing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Timezone</label>
                <select
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC (+0:00)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Step 3: Category & Restrictions</h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Event Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="Music">Music & Concerts</option>
                  <option value="Nightlife">Nightlife & Clubs</option>
                  <option value="Conference">Tech & Business Conferences</option>
                  <option value="Comedy">Standup Comedy</option>
                  <option value="Workshop">Workshops & Masterclasses</option>
                  <option value="Festival">Cultural & Food Festivals</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Age Restriction</label>
                <input
                  type="text"
                  value={form.ageRestriction}
                  onChange={(e) => setForm({ ...form, ageRestriction: e.target.value })}
                  placeholder="e.g. 18+, 21+, All Ages"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Step 4: Media & Lineup</h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Cover Image URL</label>
                <input
                  type="url"
                  value={form.coverMediaUrl}
                  onChange={(e) => setForm({ ...form, coverMediaUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Lead Artist / Speaker</label>
                  <input
                    type="text"
                    value={form.lineupArtist}
                    onChange={(e) => setForm({ ...form, lineupArtist: e.target.value })}
                    placeholder="e.g. DJ Shadow"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Artist Role / Billing</label>
                  <input
                    type="text"
                    value={form.lineupRole}
                    onChange={(e) => setForm({ ...form, lineupRole: e.target.value })}
                    placeholder="e.g. Headliner, Opening Act"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Step 5: Initial Ticket Tier</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Tier Name *</label>
                  <input
                    type="text"
                    required
                    value={form.ticketTierName}
                    onChange={(e) => setForm({ ...form, ticketTierName: e.target.value })}
                    placeholder="e.g. General Admission"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Ticket Quantity (Capacity) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.ticketQuantity}
                    onChange={(e) => setForm({ ...form, ticketQuantity: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Price (₹ INR) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.ticketPriceRupees}
                    onChange={(e) => setForm({ ...form, ticketPriceRupees: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Min Per Order</label>
                  <input
                    type="number"
                    min={1}
                    value={form.minPerOrder}
                    onChange={(e) => setForm({ ...form, minPerOrder: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Max Per Order</label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxPerOrder}
                    onChange={(e) => setForm({ ...form, maxPerOrder: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Step 6: Review & Finalize Draft</h3>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Title:</span>
                  <span className="font-bold text-slate-200">{form.title || 'Untitled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Slug:</span>
                  <span className="font-mono text-purple-300">/events/{form.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timing:</span>
                  <span className="text-slate-200">
                    {new Date(form.startsAt).toLocaleString('en-IN')} → {new Date(form.endsAt).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Initial Tier:</span>
                  <span className="text-slate-200">
                    {form.ticketTierName} ({form.ticketQuantity} qty @ ₹{form.ticketPriceRupees})
                  </span>
                </div>
                {form.lineupArtist && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lineup:</span>
                    <span className="text-slate-200">{form.lineupArtist} ({form.lineupRole})</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Action Buttons */}
          <div className="flex justify-between pt-4 border-t border-slate-800/80">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
              >
                ← Back
              </button>
            ) : (
              <Link
                href="/events"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </Link>
            )}

            {step < 6 ? (
              <button
                type="button"
                disabled={step === 1 && !form.title.trim()}
                onClick={() => setStep(step + 1)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-xs font-bold shadow-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Authoritative Event...
                  </>
                ) : (
                  '🚀 Create Event Draft'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
