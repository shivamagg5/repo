'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAnalytics } from '@platform/auth';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { EventCard } from '../../components/EventCard';
import { apiClient } from '../../lib/api';
import type { EventListItemDto, EventCategory, CursorPaginatedResponse } from '@platform/types';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { track } = useAnalytics(apiClient);

  const [qInput, setQInput] = useState(searchParams.get('q') ?? '');
  const [events, setEvents] = useState<EventListItemDto[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const qParam = searchParams.get('q') ?? '';
  const categoryParam = searchParams.get('category') ?? '';
  const cityParam = searchParams.get('city') ?? '';
  const datePresetParam = searchParams.get('datePreset') ?? '';
  const sortParam = searchParams.get('sort') ?? 'date';

  const executeSearch = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { limit: '24', sort: sortParam };
      if (qParam) params['q'] = qParam;
      if (categoryParam) params['category'] = categoryParam;
      if (cityParam) params['city'] = cityParam;
      if (datePresetParam) params['datePreset'] = datePresetParam;

      const res = await apiClient.getPublicEventsFeed<CursorPaginatedResponse<EventListItemDto>>(params);
      const items = res.items ?? [];
      setEvents(items);
      if (qParam || categoryParam || cityParam) {
        track('search_completed', { query: qParam, category: categoryParam, city: cityParam, resultCount: items.length });
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  }, [qParam, categoryParam, cityParam, datePresetParam, sortParam, track]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  useEffect(() => {
    apiClient.getPublicCategories<EventCategory[]>()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (qInput.trim()) current.set('q', qInput.trim());
    else current.delete('q');
    router.push(`/search?${current.toString()}`);
  };

  const updateParam = (key: string, value: string | null) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (value) current.set(key, value);
    else current.delete(key);
    router.push(`/search?${current.toString()}`);
  };

  return (
    <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Header & Search Bar */}
      <div className="max-w-3xl mx-auto mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-white mb-4">
          Search Events & Experience Catalog
        </h1>
        <form onSubmit={handleSearchSubmit} className="glass-surface p-2 rounded-2xl flex gap-2">
          <input
            type="text"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search by title, artist, category, venue, or city..."
            className="flex-1 bg-transparent text-white placeholder-[var(--color-text-muted)] text-sm px-4 py-3 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Filter Controls */}
      <div className="glass-surface p-4 rounded-2xl mb-8 flex flex-wrap items-center gap-3">
        <select
          value={categoryParam}
          onChange={(e) => updateParam('category', e.target.value || null)}
          className="bg-[var(--color-surface)] text-xs font-semibold text-white px-3.5 py-2 rounded-xl border border-[var(--color-border)] focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>

        <input
          type="text"
          value={cityParam}
          onChange={(e) => updateParam('city', e.target.value || null)}
          placeholder="City (e.g. Mumbai)"
          className="bg-[var(--color-surface)] text-xs text-white placeholder-[var(--color-text-muted)] px-3.5 py-2 rounded-xl border border-[var(--color-border)] focus:outline-none max-w-[160px]"
        />

        <div className="flex items-center gap-1.5">
          {['today', 'this_weekend', 'this_month'].map((p) => (
            <button
              key={p}
              onClick={() => updateParam('datePreset', datePresetParam === p ? null : p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                datePresetParam === p ? 'bg-purple-600 text-white font-bold' : 'bg-[var(--color-surface)] text-gray-300'
              }`}
            >
              {p.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Result Count Indicator */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          {qParam ? `Results for "${qParam}"` : 'Search Catalog'}
        </h2>
        <span className="text-xs text-[var(--color-text-muted)]">
          Found {events.length} event{events.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Results Feed */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-surface rounded-2xl h-72 animate-pulse bg-[var(--color-surface)]" />
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="glass-surface rounded-3xl p-16 text-center max-w-md mx-auto my-8">
          <span className="text-4xl mb-3 block">🔍</span>
          <h3 className="font-bold text-lg text-white mb-2">No Search Results Found</h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Try adjusting your query or resetting filter parameters.
          </p>
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <Navbar />
      <Suspense fallback={
        <div className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full animate-pulse text-center">
          <div className="h-10 w-64 bg-[var(--color-surface)] rounded-xl mx-auto mb-6" />
        </div>
      }>
        <SearchContent />
      </Suspense>
      <Footer />
    </div>
  );
}
