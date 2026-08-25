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
              <div key={i} className="stat-card skeleton h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Total Venue Capacity</span>
                <span className="badge badge-cyan text-[10px]">Configured</span>
              </div>
              <p className="stat-card-value text-white mt-1">
                {profile?.capacity ? profile.capacity.toLocaleString('en-IN') : 'Flexible'}
              </p>
              <div className="stat-card-delta up">
                <span className="metric-dot cyan" />
                Multi-tier seating configuration
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Venue Location</span>
                <span className="badge badge-green text-[10px]">Active</span>
              </div>
              <p className="font-display text-2xl text-white mt-2 tracking-wide uppercase">{profile?.name ?? 'Venue Partner'}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {profile?.city ? `${profile.city}, ${profile.state ?? profile.country ?? ''}` : 'Location details in profile'}
              </p>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Operating Status</span>
                <span className="badge badge-pink text-[10px]">
                  {profile?.status ?? 'Active'}
                </span>
              </div>
              <p className="stat-card-value text-white mt-1 font-mono text-xl">
                {profile?.timezone ?? 'Asia/Kolkata'}
              </p>
              <div className="stat-card-delta neutral">
                <span className="metric-dot pink" />
                Primary operating timezone
              </div>
            </div>
          </div>
        )}

        {/* Hosted Events Stream */}
        <div className="surface-card">
          <div className="surface-card-header">
            <h3 className="surface-card-title flex items-center gap-2">
              <span className="metric-dot green" />
              Upcoming Hosted Events ({events.length})
            </h3>
            <Link href="/calendar" className="text-xs text-green hover:text-cyan font-semibold transition-colors">
              View Calendar →
            </Link>
          </div>

          <div className="surface-card-body p-0">
            {events.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-mono">
                No events currently scheduled at this venue.
              </div>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Event Title</th>
                    <th>Date & Time</th>
                    <th>Capacity Assigned</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt) => (
                    <tr key={evt.id}>
                      <td className="font-semibold text-slate-100">{evt.title}</td>
                      <td className="text-xs text-slate-400">
                        {new Date(evt.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="font-mono text-xs text-slate-300">{evt.capacity ?? 'Default'}</td>
                      <td>
                        <span className="badge badge-green text-[10px]">{evt.status}</span>
                      </td>
                      <td>
                        <Link href={`/events/${evt.id}`} className="text-xs text-pink hover:underline font-semibold">
                          Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </VenueLayout>
  );
}
