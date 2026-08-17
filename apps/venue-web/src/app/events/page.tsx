// =============================================================================
// venue-web — Hosted Events Directory
// Displays real hosted events and capacity occupancy from GET /venue/events.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { VenueLayout } from '../../components/VenueLayout';
import { apiClient, ApiError } from '../../lib/api';

export default function VenueEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, profileRes] = await Promise.allSettled([
        apiClient.getVenueEvents<any>(),
        apiClient.getVenueProfile<any>(),
      ]);

      const evtsData = eventsRes.status === 'fulfilled' ? eventsRes.value.data : [];
      const profData = profileRes.status === 'fulfilled' ? profileRes.value.data : null;

      setEvents(Array.isArray(evtsData) ? evtsData : (evtsData?.items ?? []));
      setProfile(profData);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load hosted events.');
      } else {
        setError(err?.message || 'Error occurred while loading events.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const venueCapacity = profile?.capacity ?? 0;

  return (
    <VenueLayout title="Hosted Events" subtitle="Events hosted at this venue and venue occupancy progress">
      <div className="space-y-4">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchEvents} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-200">Hosted Events List ({events.length})</h3>
            <button onClick={fetchEvents} title="Refresh Events" className="p-1 rounded bg-slate-800 text-slate-300 text-xs">🔄</button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading hosted events from server...</div>
          ) : events.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No events scheduled for hosting at this venue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Event Title</th>
                    <th className="py-2.5 px-3">Organizer</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Occupancy</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {events.map((evt) => {
                    const ticketsSold = evt.ticketsSold ?? 0;
                    const occupancyPercent = venueCapacity > 0 ? Math.min(100, Math.round((ticketsSold / venueCapacity) * 100)) : 0;

                    return (
                      <tr key={evt.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-200">{evt.title}</p>
                          <p className="text-[11px] text-slate-400 font-mono">/{evt.slug}</p>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{evt.organization?.name ?? 'Live Organizer'}</td>
                        <td className="py-3 px-3 text-slate-400 font-mono">
                          {evt.startsAt ? new Date(evt.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="py-3 px-3">
                          {venueCapacity > 0 ? (
                            <div className="space-y-1">
                              <span className="font-mono text-slate-300 text-[11px]">{ticketsSold} / {venueCapacity} ({occupancyPercent}%)</span>
                              <div className="w-28 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full"
                                  style={{ width: `${occupancyPercent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500">Unspecified</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                            {evt.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </VenueLayout>
  );
}
