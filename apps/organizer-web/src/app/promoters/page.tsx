'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '../../components/DashboardLayout';
import { apiClient, ApiError } from '../../lib/api';
import type { Event } from '@platform/types';

export default function PromotersPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setError(null);
    try {
      const res = await apiClient.getOrganizerEvents<{ items: Event[]; nextCursor: string | null; hasMore: boolean }>();
      const list = res.data.items ?? [];
      setEvents(list);
      if (list.length > 0 && !selectedEventId) {
        setSelectedEventId(list[0]!.id);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load organizer events.');
      } else {
        setError(err?.message || 'Error occurred while loading events.');
      }
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const fetchCampaignsForEvent = useCallback(async (eventId: string) => {
    if (!eventId) return;
    setLoadingCampaigns(true);
    setError(null);
    try {
      const res = await apiClient.getOrganizerEventPromoters<any[]>(eventId);
      setCampaigns(res.data ?? []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load promoter campaigns.');
      } else {
        setError(err?.message || 'Network error while fetching promoter campaigns.');
      }
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchCampaignsForEvent(selectedEventId);
    }
  }, [selectedEventId, fetchCampaignsForEvent]);

  return (
    <DashboardLayout title="Promoters & Affiliate Campaigns" subtitle="Event promoter referral performance and campaign tracking">
      <div className="space-y-4">
        {/* Selector Header */}
        <div className="flex flex-wrap justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Event:</span>
            {loadingEvents ? (
              <div className="w-48 h-8 bg-slate-800 rounded-lg animate-pulse" />
            ) : events.length === 0 ? (
              <span className="text-xs text-slate-500 font-italic">No events available</span>
            ) : (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500 max-w-xs font-semibold"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Active Campaigns: <strong className="text-slate-200">{campaigns.length}</strong>
            </span>
            <button
              onClick={() => selectedEventId && fetchCampaignsForEvent(selectedEventId)}
              title="Refresh Campaigns"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => selectedEventId && fetchCampaignsForEvent(selectedEventId)} className="font-bold underline ml-2">
              Retry
            </button>
          </div>
        )}

        {/* Campaigns Table */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <h3 className="text-base font-bold text-slate-200 mb-4">Event Referral Campaigns</h3>

          {loadingCampaigns ? (
            <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
              Loading promoter affiliate records...
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-slate-300">No Events Configured</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Create an event to start configuring promoter campaigns.</p>
              <Link href="/events/new" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold">
                + Create Event
              </Link>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No promoter referral campaigns active for this event yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Referral Code</th>
                    <th className="py-2.5 px-3">Commission Type</th>
                    <th className="py-2.5 px-3">Rate / Value</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {campaigns.map((c) => (
                    <tr key={c.campaignId ?? c.code} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-mono font-bold text-purple-300">{c.code}</td>
                      <td className="py-3 px-3 text-slate-300 uppercase text-[11px]">{c.commissionType}</td>
                      <td className="py-3 px-3 text-slate-200 font-semibold font-mono">
                        {c.commissionType === 'percentage' ? `${c.commissionValue}%` : `₹${c.commissionValue}`}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                          {c.status}
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
    </DashboardLayout>
  );
}
