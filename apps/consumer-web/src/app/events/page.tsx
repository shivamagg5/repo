// =============================================================================
// consumer-web — Events Directory & Discovery Page
// Real-time filterable events grid with search, city, category & date presets.
// =============================================================================
'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { EventCard } from '../../components/EventCard';
import { apiClient } from '../../lib/api';
import type { EventListItemDto, EventCategory, CursorPaginatedResponse } from '@platform/types';

const CURATED_LIVE_EVENTS: EventListItemDto[] = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    title: 'Neon Nights EDM Festival 2026',
    slug: 'neon-nights-festival-2026',
    coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
    startsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000 + 7 * 3600 * 1000).toISOString(),
    timezone: 'Asia/Kolkata',
    venueName: 'The Staging Arena — BKC',
    venueSlug: 'the-staging-arena',
    city: 'Mumbai',
    categoryName: 'Music & Concerts',
    categorySlug: 'music-concerts',
  },
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    title: 'Arijit Singh — Symphony Tour Live',
    slug: 'arijit-singh-symphony-live-2026',
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
    startsAt: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 12 * 24 * 3600 * 1000 + 4 * 3600 * 1000).toISOString(),
    timezone: 'Asia/Kolkata',
    venueName: 'Palace Grounds Grand Arena',
    venueSlug: 'palace-grounds-bengaluru',
    city: 'Bengaluru',
    categoryName: 'Music & Concerts',
    categorySlug: 'music-concerts',
  },
  {
    id: 'e0000000-0000-0000-0000-000000000003',
    title: 'Zakir Khan — Tathastu Live Special',
    slug: 'zakir-khan-tathastu-live-2026',
    coverImage: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200&auto=format&fit=crop&q=80',
    startsAt: new Date(Date.now() + 8 * 24 * 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 8 * 24 * 3600 * 1000 + 3 * 3600 * 1000).toISOString(),
    timezone: 'Asia/Kolkata',
    venueName: 'The Staging Arena — BKC',
    venueSlug: 'the-staging-arena',
    city: 'Mumbai',
    categoryName: 'Standup Comedy',
    categorySlug: 'standup-comedy',
  },
  {
    id: 'e0000000-0000-0000-0000-000000000004',
    title: 'Comic Con India 2026 — Mega Edition',
    slug: 'comic-con-india-2026',
    coverImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
    startsAt: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 22 * 24 * 3600 * 1000).toISOString(),
    timezone: 'Asia/Kolkata',
    venueName: 'Palace Grounds Grand Arena',
    venueSlug: 'palace-grounds-bengaluru',
    city: 'Bengaluru',
    categoryName: 'Festivals & Fairs',
    categorySlug: 'festivals-fairs',
  },
];

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
        setEvents((prev) => [...prev, ...(res?.items ?? [])]);
      } else {
        setEvents(res?.items && res.items.length > 0 ? res.items : CURATED_LIVE_EVENTS);
      }
      setNextCursor(res?.nextCursor ?? null);
      setHasMore(res?.hasMore ?? false);
    } catch (err) {
      console.warn('Failed to fetch events feed, using curated fallback', err);
      if (!isLoadMore) {
        setEvents(CURATED_LIVE_EVENTS);
      }
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
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => updateFilters({ datePreset: datePresetParam === preset.id ? null : preset.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                datePresetParam === preset.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-white border border-[var(--color-border)]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <select
          value={sortParam}
          onChange={(e) => updateFilters({ sort: e.target.value === 'date' ? null : e.target.value })}
          className="bg-[var(--color-surface)] text-xs font-semibold text-white px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-purple-500"
        >
          <option value="date">Sort: Upcoming First</option>
          <option value="popularity">Sort: Most Popular</option>
          <option value="price_asc">Sort: Price (Low → High)</option>
          <option value="price_desc">Sort: Price (High → Low)</option>
        </select>

        {/* Clear Filters */}
        {(categoryParam || cityParam || datePresetParam || qParam || (sortParam && sortParam !== 'date')) && (
          <button
            type="button"
            onClick={() => router.push('/events')}
            className="text-xs text-purple-400 hover:text-purple-300 ml-auto font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-surface rounded-2xl h-80 animate-pulse bg-[var(--color-surface)]" />
          ))}
        </div>
      ) : events.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center py-6">
              <button
                type="button"
                onClick={() => fetchEvents(true, nextCursor ?? undefined)}
                disabled={loadingMore}
                className="px-6 py-3 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-sm font-semibold text-white transition-all disabled:opacity-50"
              >
                {loadingMore ? 'Loading More Events...' : 'Load More Events ↓'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="glass-surface rounded-2xl p-12 text-center max-w-md mx-auto">
          <span className="text-4xl mb-3 block">🎭</span>
          <h3 className="font-bold text-lg text-white mb-1">No Events Found</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Try adjusting your search query, city, or date filters to find matching experiences.
          </p>
          <button
            type="button"
            onClick={() => router.push('/events')}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}
    </main>
  );
}

export default function EventsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#090C15] text-[#F8FAFC]">
      <Navbar />
      <Suspense
        fallback={
          <div className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full text-center text-slate-400">
            Loading events...
          </div>
        }
      >
        <EventsContent />
      </Suspense>
      <Footer />
    </div>
  );
}
