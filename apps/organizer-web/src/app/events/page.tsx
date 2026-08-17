'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '../../components/DashboardLayout';
import { apiClient, ApiError } from '../../lib/api';
import type { Event, EventStatus } from '@platform/types';

export default function EventsListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getOrganizerEvents<{ items: Event[]; nextCursor: string | null; hasMore: boolean }>();
      setEvents(res.data.items ?? []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load organizer events');
      } else {
        setError(err?.message || 'Network error occurred while fetching events');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter((evt) => {
    if (statusFilter === 'all') return true;
    return evt.status === statusFilter;
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

  const statusTabs: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'All Events' },
    { key: 'published', label: 'Published' },
    { key: 'live', label: 'Live' },
    { key: 'draft', label: 'Drafts' },
    { key: 'submitted', label: 'In Review' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <DashboardLayout title="Events Management" subtitle="Create, edit, configure ticket tiers, and publish organizer events">
      <div className="space-y-4">
        {/* Header Action & Filter Bar */}
        <div className="flex flex-wrap justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800 gap-3">
          <div className="flex flex-wrap gap-1.5">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
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
          <Link
            href="/events/new"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-xs font-bold shadow-md hover:brightness-110 transition-all flex items-center gap-1.5"
          >
            <span>+</span> New Event Workflow
          </Link>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 bg-slate-900/50 rounded-xl border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          /* Error State with Retry */
          <div className="glass-panel p-8 rounded-2xl border border-red-900/40 text-center max-w-md mx-auto my-8">
            <p className="text-sm text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchEvents}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Retry Loading Events
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          /* Empty State */
          <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center max-w-lg mx-auto my-8">
            <div className="w-12 h-12 rounded-full bg-purple-950/60 border border-purple-800 flex items-center justify-center mx-auto mb-4 text-purple-400 text-xl">
              🎪
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {statusFilter === 'all' ? 'No Events Found' : `No ${statusFilter} Events`}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              {statusFilter === 'all'
                ? 'Your organization has not published any events yet. Start the publication workflow now.'
                : `There are currently no events matching the '${statusFilter}' filter.`}
            </p>
            <Link
              href="/events/new"
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-xs font-bold shadow-lg hover:brightness-110 transition-all inline-block"
            >
              + Create New Event
            </Link>
          </div>
        ) : (
          /* Events Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusBadge(evt.status)}`}>
                      {evt.status}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(evt.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-100 text-base mb-1 line-clamp-1">{evt.title}</h3>
                  <p className="text-xs text-slate-400 mb-4 font-mono truncate">ID: {evt.id}</p>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Capacity Config</span>
                      <span className="font-semibold">{evt.capacity ? `${evt.capacity} total seats` : 'Open capacity'}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Timezone</span>
                      <span className="font-mono text-slate-400">{evt.timezone}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Created {new Date(evt.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                  <Link
                    href={`/events/${evt.id}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  >
                    Command Center →
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
