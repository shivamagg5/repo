'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { EventCard } from '../../components/EventCard';
import { apiClient } from '../../lib/api';
import type { EventListItemDto, EventCategory, CursorPaginatedResponse } from '@platform/types';

function EventsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [events, setEvents] = useState<EventListItemDto[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Active filter state derived from URL search params
  const categoryParam = searchParams.get('category') ?? '';
  const cityParam = searchParams.get('city') ?? '';
  const datePresetParam = searchParams.get('datePreset') ?? '';
  const sortParam = searchParams.get('sort') ?? 'date';
  const qParam = searchParams.get('q') ?? '';

  const updateFilters = (updates: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(updates).forEach(([key, val]) => {
      if (val) current.set(key, val);
      else current.delete(key);
    });
    router.push(`/events?${current.toString()}`);
  };

  const fetchEvents = useCallback(async (isLoadMore = false, cursorToken?: string) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const params: Record<string, string> = {
        limit: '16',
        sort: sortParam,
      };
      if (qParam) params['q'] = qParam;
      if (categoryParam) params['category'] = categoryParam;
      if (cityParam) params['city'] = cityParam;
      if (datePresetParam) params['datePreset'] = datePresetParam;
      if (cursorToken) params['cursor'] = cursorToken;

      const res = await apiClient.getPublicEventsFeed<CursorPaginatedResponse<EventListItemDto>>(params);

      if (isLoadMore) {
        setEvents((prev) => [...prev, ...(res.items ?? [])]);
      } else {
        setEvents(res.items ?? []);
      }
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error('Failed to fetch events feed', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [categoryParam, cityParam, datePresetParam, sortParam, qParam]);

  useEffect(() => {
    fetchEvents(false);
  }, [fetchEvents]);

  useEffect(() => {
    apiClient.getPublicCategories<EventCategory[]>()
      .then(setCategories)
      .catch(() => {});
  }, []);

  return (
    <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
          Explore Events
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Discover live concerts, standup shows, and festivals near you.
        </p>
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-surface p-4 rounded-2xl mb-8 flex flex-wrap items-center gap-3">
        {/* Category Filter */}
        <select
          value={categoryParam}
          onChange={(e) => updateFilters({ category: e.target.value || null })}
          className="bg-[var(--color-surface)] text-xs font-semibold text-white px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-purple-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>

        {/* City Filter */}
        <input
          type="text"
          value={cityParam}
          onChange={(e) => updateFilters({ city: e.target.value || null })}
          placeholder="Filter by city (e.g. Mumbai)"
          className="bg-[var(--color-surface)] text-xs text-white placeholder-[var(--color-text-muted)] px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-purple-500 max-w-[200px]"
        />

        {/* Date Preset Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {[
            { id: 'today', label: 'Today' },
            { id: 'tomorrow', label: 'Tomorrow' },
            { id: 'this_weekend', label: 'This Weekend' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => updateFilters({ datePreset: datePresetParam === p.id ? null : p.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                datePresetParam === p.id
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Sort Order */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline">Sort:</span>
          <select
            value={sortParam}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="bg-[var(--color-surface)] text-xs font-semibold text-white px-3 py-2 rounded-xl border border-[var(--color-border)] focus:outline-none"
          >
            <option value="date">Date (Upcoming)</option>
            <option value="newest">Newly Published</option>
          </select>
        </div>
      </div>

      {/* Events Grid Feed */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-surface rounded-2xl h-72 animate-pulse bg-[var(--color-surface)]" />
          ))}
        </div>
      ) : events.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Cursor Pagination "Load More" */}
          {hasMore && (
            <div className="mt-12 text-center">
              <button
                onClick={() => nextCursor && fetchEvents(true, nextCursor)}
                disabled={loadingMore}
                className="bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-white font-bold text-sm px-8 py-3 rounded-xl border border-[var(--color-border-strong)] transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {loadingMore ? 'Loading More Events...' : 'Load More Events →'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="glass-surface rounded-3xl p-16 text-center max-w-md mx-auto my-12">
          <span className="text-4xl mb-4 block">🔍</span>
          <h3 className="font-bold text-lg text-white mb-2">No Matching Events</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-6 leading-relaxed">
            We couldn’t find any events matching your selected filters. Try resetting date or category filters.
          </p>
          <button
            onClick={() => router.push('/events')}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </main>
  );
}

export default function EventsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <Navbar />
      <Suspense fallback={
        <div className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full animate-pulse">
          <div className="h-10 w-48 bg-[var(--color-surface)] rounded-xl mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-surface rounded-2xl h-64" />
            ))}
          </div>
        </div>
      }>
        <EventsContent />
      </Suspense>
      <Footer />
    </div>
  );
}
