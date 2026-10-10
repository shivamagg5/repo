'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { apiClient } from '../../lib/api';
import type { EventListItemDto, CursorPaginatedResponse } from '@platform/types';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  description: string;
  gradient: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'cat_music',
    name: 'Music & Concerts',
    slug: 'music',
    emoji: '🎵',
    description: 'Arena tours, stadium live acts, indie gigs, and acoustic showcases.',
    gradient: 'from-purple-900/40 via-violet-950/20 to-black',
  },
  {
    id: 'cat_festivals',
    name: 'Festivals & Raves',
    slug: 'festivals',
    emoji: '🎪',
    description: 'Multi-stage weekenders, underground techno vaults, and neon carnivals.',
    gradient: 'from-pink-900/40 via-rose-950/20 to-black',
  },
  {
    id: 'cat_comedy',
    name: 'Standup Comedy',
    slug: 'comedy',
    emoji: '🎭',
    description: 'Headline stand-up specials, improv open-mics, and roast battles.',
    gradient: 'from-amber-900/40 via-orange-950/20 to-black',
  },
  {
    id: 'cat_nightlife',
    name: 'Nightlife & Clubs',
    slug: 'nightlife',
    emoji: '🍸',
    description: 'Rooftop cocktail lounges, warehouse raves, and VIP table bookings.',
    gradient: 'from-blue-900/40 via-indigo-950/20 to-black',
  },
  {
    id: 'cat_sports',
    name: 'Sports & Fitness',
    slug: 'sports',
    emoji: '⚽',
    description: 'Derby matchdays, marathon circuits, MMA fight nights, and crossfit jams.',
    gradient: 'from-emerald-900/40 via-teal-950/20 to-black',
  },
  {
    id: 'cat_food',
    name: 'Food & Drinks',
    slug: 'food',
    emoji: '🍕',
    description: 'Craft beer fests, chef pop-up tastings, wine trails, and street eat trails.',
    gradient: 'from-orange-900/40 via-red-950/20 to-black',
  },
  {
    id: 'cat_arts',
    name: 'Arts & Culture',
    slug: 'arts',
    emoji: '🎨',
    description: 'Contemporary gallery showcases, heritage theatre, and pottery workshops.',
    gradient: 'from-fuchsia-900/40 via-purple-950/20 to-black',
  },
  {
    id: 'cat_wellness',
    name: 'Wellness & Mindfulness',
    slug: 'wellness',
    emoji: '🧘',
    description: 'Sound healing journeys, sunrise yoga, and wellness retreats.',
    gradient: 'from-teal-900/40 via-cyan-950/20 to-black',
  },
];

export default function CategoriesDirectoryPage() {
  const [events, setEvents] = useState<EventListItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      try {
        setLoading(true);
        const res = await apiClient.getPublicEventsFeed<CursorPaginatedResponse<EventListItemDto>>({ limit: '50' });
        setEvents(res?.items ?? []);
      } catch (err) {
        console.error('Failed to load events for categories', err);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Header */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/10 text-[var(--color-primary)] border border-pink-500/20 mb-3 tracking-wider uppercase">
            Curated Experiences
          </span>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">
            Explore Events by Category
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Discover upcoming stadium concerts, late-night raves, comedy specials, and weekend festivals tailored to your vibe.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {CATEGORIES.map((cat) => {
            const count = events.filter((e) =>
              (e.categorySlug && e.categorySlug.toLowerCase().includes(cat.slug)) ||
              (e.categoryName && e.categoryName.toLowerCase().includes(cat.slug)) ||
              e.title.toLowerCase().includes(cat.slug)
            ).length;

            return (
              <Link
                key={cat.id}
                href={`/events?category=${cat.slug}`}
                className={`group relative overflow-hidden rounded-2xl p-6 border border-white/10 bg-gradient-to-b ${cat.gradient} hover:border-[var(--color-primary)] transition-all duration-300 hover:-translate-y-1 block`}
              >
                <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                  {cat.emoji}
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mb-4 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-[var(--color-text-muted)]">
                  <span>{loading ? '...' : `${count > 0 ? count : 'Multiple'} Live Events`}</span>
                  <span className="text-[var(--color-primary)] font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center">
                    Browse →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Featured Teaser Banner */}
        <div className="rounded-3xl p-8 sm:p-10 border border-white/10 bg-gradient-to-r from-violet-950/40 via-purple-900/20 to-black text-center relative overflow-hidden">
          <div className="relative z-10 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2">Can't decide what you're looking for?</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mb-6">
              Browse the complete live calendar with city filters, date range selectors, and ticket price ranges.
            </p>
            <Link
              href="/events"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold tracking-wide hover:opacity-90 transition-opacity"
            >
              View All Live Events
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
