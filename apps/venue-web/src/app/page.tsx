// =============================================================================
// venue-web — Venue Overview Dashboard
// Real operational summary wired to backend venue profile, events, and calendar APIs.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { VenueLayout } from '../components/VenueLayout';
import { apiClient, ApiError } from '../lib/api';

export default function VenueOverviewPage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVenueData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, eventsRes] = await Promise.allSettled([
        apiClient.getVenueProfile<any>(),
        apiClient.getVenueEvents<any>(),
      ]);

      const profData = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
      const evtsData = eventsRes.status === 'fulfilled' ? eventsRes.value.data : [];

      setProfile(profData);
      setEvents(Array.isArray(evtsData) ? evtsData : (evtsData?.items ?? []));
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to retrieve venue operational data.');
      } else {
        setError(err?.message || 'Error occurred while loading venue data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVenueData();
  }, [fetchVenueData]);

  return (
    <VenueLayout title="Venue Dashboard" subtitle="Operational profile summary, hosted events, and booking calendar">
      <div className="space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchVenueData} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* Venue Profile Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Total Venue Capacity</span>
              <p className="text-2xl font-bold text-slate-100 mt-1 font-mono">
                {profile?.capacity ? `${profile.capacity.toLocaleString('en-IN')} seats` : 'Not Configured'}
              </p>
              <p className="text-[11px] text-blue-400 mt-1">Multi-tier seating configuration</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Venue Location</span>
              <p className="text-lg font-bold text-slate-100 mt-1">{profile?.name ?? 'Venue Partner'}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {profile?.city ? `${profile.city}, ${profile.state ?? profile.country ?? ''}` : 'Location details in profile'}
              </p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Operating Status</span>
              <div className="mt-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                  {profile?.status ?? 'active'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-mono">Timezone: {profile?.timezone ?? 'Asia/Kolkata'}</p>
            </div>
          </div>
        )}

        {/* Hosted Events Stream */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-200">Upcoming Hosted Events ({events.length})</h3>
            <Link href="/calendar" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
              View Calendar →
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading hosted events...</div>
          ) : events.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No upcoming events scheduled at this venue.
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((evt) => (
                <div key={evt.id} className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">{evt.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Organizer: {evt.organization?.name ?? 'Live Organizer'} · {evt.startsAt ? new Date(evt.startsAt).toLocaleString('en-IN') : 'TBD'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                      {evt.status}
                    </span>
                    {evt.ticketsSold !== undefined && (
                      <p className="text-xs text-slate-300 mt-1 font-mono">{evt.ticketsSold} tickets sold</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </VenueLayout>
  );
}
