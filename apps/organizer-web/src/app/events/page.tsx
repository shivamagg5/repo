'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '../../components/DashboardLayout';
import { apiClient } from '../../lib/api';
import type { Event, EventStatus } from '@platform/types';

export default function EventsListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeTab, setTimeTab] = useState<'upcoming' | 'past'>('upcoming');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getOrganizerEvents<{ items: Event[]; nextCursor: string | null; hasMore: boolean }>();
      setEvents(res?.data?.items ?? []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load organizer events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter((evt) => {
    const eventDate = new Date(evt.startsAt);
    const now = new Date();
    if (timeTab === 'upcoming' && eventDate < now && evt.status !== 'live') return false;
    if (timeTab === 'past' && (eventDate >= now || evt.status === 'live')) return false;
    if (statusFilter !== 'all' && evt.status !== statusFilter) return false;
    if (searchQuery && !evt.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: EventStatus | string) => {
    switch (status) {
      case 'live':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse';
      case 'published':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'approved':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'under_review':
      case 'submitted':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const statusTabs = [
    { key: 'all', label: 'All' },
    { key: 'live', label: 'Live' },
    { key: 'published', label: 'Published' },
    { key: 'submitted', label: 'In Review' },
    { key: 'draft', label: 'Drafts' },
  ];

  return (
    <DashboardLayout
      title="Events Catalog"
      subtitle="Lifecycle management, ticketing tiers, and publishing pipeline"
      actions={
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={fetchEvents}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
          <Link
            href="/events/new"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-lg shadow-purple-900/30 hover:brightness-110 transition-all flex items-center gap-1.5"
          >
            + New Event
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button type="button" onClick={fetchEvents} className="font-bold underline ml-2">
              Retry
            </button>
          </div>
        )}

        {/* Header Action & Filter Bar */}
        <div className="flex flex-wrap justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800 gap-3">
          {/* Upcoming / Past toggle */}
          <div className="flex gap-1.5">
            {(['upcoming', 'past'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
                  timeTab === t
                    ? 'bg-purple-600/30 text-purple-300 border-purple-500/40'
                    : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === tab.key
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                    : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {tab.label} {tab.key !== 'all' && `(${events.filter((e) => e.status === tab.key).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        {loading && events.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-slate-400 text-xs">
            Loading events catalog...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8">
            <p className="text-base font-semibold text-slate-300 mb-1">No events found</p>
            <p className="text-xs text-slate-500 mb-6">
              {searchQuery ? `No matches for "${searchQuery}"` : 'Get started by creating your first event.'}
            </p>
            <Link
              href="/events/new"
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all inline-flex items-center gap-2"
            >
              Create First Event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="group relative bg-[#161922] border border-slate-800/80 hover:border-purple-500/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-950/20 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="h-36 bg-gradient-to-tr from-slate-900 via-purple-950/30 to-slate-900 border-b border-slate-800/80 relative p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getStatusBadge(
                          evt.status,
                        )}`}
                      >
                        {evt.status}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-mono text-purple-300 font-semibold block mb-0.5">
                        {evt.startsAt
                          ? new Date(evt.startsAt).toLocaleDateString('en-IN', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Date TBA'}
                      </span>
                      <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                        {evt.title}
                      </h3>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {evt.description || 'No description provided.'}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                      <span>Venue</span>
                      <span className="text-slate-200 font-medium">
                        {(evt as any).venueName ?? (evt as any).venue?.name ?? 'Main Arena'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 pt-0">
                  <Link
                    href={`/events/${evt.id}`}
                    className="w-full py-2.5 rounded-xl bg-slate-800/60 hover:bg-purple-600/20 text-slate-300 hover:text-purple-300 border border-slate-700/60 hover:border-purple-500/40 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <span>Manage Event</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
