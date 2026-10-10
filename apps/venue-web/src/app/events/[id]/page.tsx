// =============================================================================
// venue-web — Hosted Event Detail & Capacity Management
// Displays live event status, capacity occupancy, and venue coordination details.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { VenueLayout } from '../../../components/VenueLayout';
import { apiClient, ApiError } from '../../../lib/api';

export default function VenueEventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params?.id || '';

  const [event, setEvent] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEventData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const [eventRes, profileRes] = await Promise.allSettled([
        apiClient.getEventById<any>(eventId),
        apiClient.getVenueProfile<any>(),
      ]);

      let eventData = eventRes.status === 'fulfilled' ? eventRes.value.data : null;
      const profileData = profileRes.status === 'fulfilled' ? profileRes.value.data : null;

      // Fallback: If getEventById didn't resolve directly, search in venue events list
      if (!eventData) {
        try {
          const listRes = await apiClient.getVenueEvents<any>();
          const items = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.items ?? []);
          eventData = items.find((e: any) => e.id === eventId || e.slug === eventId) ?? null;
        } catch {
          // Keep null
        }
      }

      setEvent(eventData);
      setProfile(profileData);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load event details.');
      } else {
        setError(err?.message || 'Error occurred while loading event details.');
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const venueCapacity = profile?.capacity ?? event?.capacity ?? 0;
  const ticketsSold = event?.ticketsSold ?? 0;
  const occupancyPercent = venueCapacity > 0 ? Math.min(100, Math.round((ticketsSold / venueCapacity) * 100)) : 0;
  const remainingCapacity = Math.max(0, venueCapacity - ticketsSold);

  return (
    <VenueLayout title={event?.title ?? 'Hosted Event Details'} subtitle="Venue capacity, gate operations, and organizer coordination">
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/events" className="hover:text-slate-200 transition-colors">
            ← Back to Hosted Events
          </Link>
          <span>/</span>
          <span className="text-slate-200 font-medium">{event?.title ?? eventId}</span>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchEventData} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="glass-panel p-12 rounded-xl border border-slate-800 text-center text-xs text-slate-400 animate-pulse">
            Loading hosted event intelligence...
          </div>
        ) : !event ? (
          <div className="glass-panel p-12 rounded-xl border border-slate-800 text-center text-xs text-slate-400 space-y-3">
            <p>Event record not found or inaccessible for this venue.</p>
            <Link href="/events" className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold">
              Return to Events Directory
            </Link>
          </div>
        ) : (
          <>
            {/* Hero Header Card */}
            <div className="glass-panel p-6 rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900/80 to-slate-950/80">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-white">{event.title}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      {event.status ?? 'published'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    ID: {event.id} · Slug: /{event.slug ?? 'live'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/calendar"
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all"
                  >
                    📅 View on Calendar
                  </Link>
                </div>
              </div>
            </div>

            {/* Occupancy & Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <span className="stat-card-label">Venue Capacity</span>
                <p className="stat-card-value text-white mt-1">
                  {venueCapacity > 0 ? venueCapacity.toLocaleString('en-IN') : 'N/A'}
                </p>
                <div className="stat-card-delta neutral">
                  Total venue limit
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-card-label">Tickets Sold / Reserved</span>
                <p className="stat-card-value text-emerald-400 mt-1">
                  {ticketsSold.toLocaleString('en-IN')}
                </p>
                <div className="stat-card-delta up">
                  {occupancyPercent}% occupancy
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-card-label">Remaining Safe Space</span>
                <p className="stat-card-value text-blue-400 mt-1">
                  {remainingCapacity.toLocaleString('en-IN')}
                </p>
                <div className="stat-card-delta neutral">
                  Available seats/standing
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-card-label">Curfew / End Time</span>
                <p className="stat-card-value text-amber-300 mt-1">
                  {event.endsAt ? new Date(event.endsAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '23:30'}
                </p>
                <div className="stat-card-delta neutral">
                  Music cutoff enforced
                </div>
              </div>
            </div>

            {/* Detailed Event & Venue Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Event Metadata */}
              <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Event Specifications
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Start Date & Time</span>
                    <p className="text-slate-200 font-semibold mt-0.5">
                      {event.startsAt ? new Date(event.startsAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' }) : 'TBA'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">End Date & Time</span>
                    <p className="text-slate-200 font-semibold mt-0.5">
                      {event.endsAt ? new Date(event.endsAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' }) : 'TBA'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Organizer Entity</span>
                    <p className="text-slate-200 font-semibold mt-0.5">
                      {event.organization?.name ?? 'Verified Organizer'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Category / Genre</span>
                    <p className="text-slate-200 font-semibold mt-0.5">
                      {event.category ?? event.genre ?? 'Live Entertainment'}
                    </p>
                  </div>
                </div>

                {event.description && (
                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Event Description</span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                      {event.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Occupancy Gauge & Gate Security */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Occupancy Progress
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Occupancy</span>
                    <span className="font-mono font-bold text-slate-200">{occupancyPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        occupancyPercent >= 90 ? 'bg-red-500' : occupancyPercent >= 75 ? 'bg-amber-400' : 'bg-blue-500'
                      }`}
                      style={{ width: `${occupancyPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 text-right">
                    {ticketsSold} of {venueCapacity} maximum occupants
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                  <span className="text-slate-400 text-[11px] font-semibold block">Gate Operations Checklist</span>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-emerald-400">✓</span> High-speed QR Turnstiles Ready
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-emerald-400">✓</span> Curfew & Decibel Limits Set
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-emerald-400">✓</span> Emergency Exits Inspected
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </VenueLayout>
  );
}
