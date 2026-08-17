// =============================================================================
// venue-web — Venue Booking Calendar
// Displays real hosted event date availability and occupied schedule from backend.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { VenueLayout } from '../../components/VenueLayout';
import { apiClient, ApiError } from '../../lib/api';

export default function VenueCalendarPage() {
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [calRes, profRes] = await Promise.allSettled([
        apiClient.getVenueCalendar<any>(),
        apiClient.getVenueProfile<any>(),
      ]);

      const calData = calRes.status === 'fulfilled' ? calRes.value.data : [];
      const profData = profRes.status === 'fulfilled' ? profRes.value.data : null;

      setCalendarEvents(Array.isArray(calData) ? calData : (calData?.items ?? []));
      setProfile(profData);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load venue calendar.');
      } else {
        setError(err?.message || 'Error occurred while loading calendar.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  return (
    <VenueLayout title="Booking Calendar" subtitle="Hosted event date availability and occupied schedule in canonical timezone">
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-slate-100">{profile?.name ?? 'Venue'} Calendar</h3>
            <p className="text-xs text-slate-400">Canonical Timezone: <span className="font-mono text-blue-300">{profile?.timezone ?? 'Asia/Kolkata'}</span></p>
          </div>
          <span className="text-xs px-3 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-full font-semibold">
            {calendarEvents.length} Scheduled Events
          </span>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchCalendar} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* Calendar Bookings Table */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-slate-200">Occupied Event Date Ranges ({calendarEvents.length})</h4>
            <button onClick={fetchCalendar} title="Refresh Calendar" className="p-1 rounded bg-slate-800 text-slate-300 text-xs">🔄</button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading venue calendar bookings...</div>
          ) : calendarEvents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No occupied booking dates recorded on venue calendar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Event Title</th>
                    <th className="py-2.5 px-3">Organizer</th>
                    <th className="py-2.5 px-3">Start Date</th>
                    <th className="py-2.5 px-3">End Date</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {calendarEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-semibold text-slate-200">{evt.title}</td>
                      <td className="py-3 px-3 text-slate-400">{evt.organization?.name ?? evt.organizerName ?? 'Live Organizer'}</td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {evt.startsAt ? new Date(evt.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {evt.endsAt ? new Date(evt.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                          {evt.status ?? 'confirmed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </VenueLayout>
  );
}
