'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { EventCard } from '../components/EventCard';
import { VenueCard } from '../components/VenueCard';
import { apiClient } from '../lib/api';
import type { EventListItemDto, VenuePublic, EventCategory } from '@platform/types';

export default function HomePage() {
  const [events, setEvents] = useState<EventListItemDto[]>([]);
  const [venues, setVenues] = useState<VenuePublic[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [heroSearch, setHeroSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [eventsRes, venuesRes, categoriesRes] = await Promise.allSettled([
          apiClient.getPublicEventsFeed<{ items: EventListItemDto[] }>({ limit: '8' }),
          apiClient.getPublicVenues<VenuePublic[]>({ limit: '4' }),
          apiClient.getPublicCategories<EventCategory[]>(),
        ]);

        if (eventsRes.status === 'fulfilled') {
          setEvents(eventsRes.value.items ?? []);
        }
        if (venuesRes.status === 'fulfilled') {
          setVenues(venuesRes.value ?? []);
        }
        if (categoriesRes.status === 'fulfilled') {
          setCategories(categoriesRes.value ?? []);
        }
      } catch (err) {
        console.error('Failed to load homepage discovery data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      router.push(`/search?q=${encodeURIComponent(heroSearch.trim())}`);
    } else {
      router.push('/events');
    }
  };

  const popularCities = ['Mumbai', 'Delhi', 'Bengaluru', 'Goa', 'Amritsar'];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <Navbar />

      {/* --- HERO SECTION --- */}
      <section className="relative hero-gradient py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--color-border)] overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <span className="inline-block bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-4">
            Live Events & Experiences
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Discover Unforgettable <br className="hidden sm:inline" />
            <span className="text-gradient">Live Events Near You</span>
          </h1>
          <p className="text-base sm:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-8 leading-relaxed">
            Concerts, standup comedy, cultural festivals, and sports match nights. Find your next experience.
          </p>

          {/* Hero Search Box */}
          <form onSubmit={handleHeroSearchSubmit} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-2 glass-surface p-2 rounded-2xl shadow-[var(--shadow-lg)]">
            <div className="relative flex-1">
              <input
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder="Search artists, shows, comedy, festivals..."
                className="w-full bg-transparent text-white placeholder-[var(--color-text-muted)] text-sm px-4 py-3 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm px-8 py-3 rounded-xl transition-all shadow-[var(--shadow-brand)] hover:scale-[1.02]"
            >
              Search Events
            </button>
          </form>
        </div>
      </section>

      {/* --- MAIN CONTENT CONTAINER --- */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 w-full">

        {/* --- CATEGORIES SECTION --- */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
              Browse Categories
            </h2>
            <Link href="/events" className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
              View All →
            </Link>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {categories.length > 0 ? (
              categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/events?category=${cat.slug}`}
                  className="glass-surface glass-surface-hover px-5 py-2.5 rounded-full text-xs font-bold text-[var(--color-text-primary)] whitespace-nowrap transition-all"
                >
                  🎭 {cat.name}
                </Link>
              ))
            ) : (
              ['Music & Concerts', 'Standup Comedy', 'Festivals & Fairs', 'Sports & Fitness', 'Arts & Theatre'].map((catName, idx) => (
                <Link
                  key={idx}
                  href={`/events?category=${catName.toLowerCase().split(' ')[0]}`}
                  className="glass-surface glass-surface-hover px-5 py-2.5 rounded-full text-xs font-bold text-[var(--color-text-primary)] whitespace-nowrap transition-all"
                >
                  ✨ {catName}
                </Link>
              ))
            )}
          </div>
        </section>

        {/* --- UPCOMING EVENTS SECTION --- */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                Upcoming Events
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Live published events ready for discovery
              </p>
            </div>
            <Link href="/events" className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
              Explore All Events →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
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
            <div className="glass-surface rounded-2xl p-12 text-center max-w-lg mx-auto">
              <span className="text-3xl mb-3 block">🎪</span>
              <h3 className="font-bold text-lg text-white mb-1">No Upcoming Events Found</h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Be the first to publish an event or check back soon for live listings!
              </p>
            </div>
          )}
        </section>

        {/* --- CITY DISCOVERY SECTION --- */}
        <section className="glass-surface rounded-3xl p-8 sm:p-10 border border-[var(--color-border)]">
          <div className="max-w-2xl mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Explore Events by City
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Find live shows, concerts, and cultural gatherings happening in top cities across the country.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {popularCities.map((city) => (
              <Link
                key={city}
                href={`/events?city=${encodeURIComponent(city)}`}
                className="glass-surface glass-surface-hover px-5 py-3 rounded-2xl text-sm font-semibold text-white flex items-center gap-2 group"
              >
                <span>📍 {city}</span>
                <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform text-xs">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* --- VENUES SECTION --- */}
        {venues.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                  Explore Active Venues
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Popular stadiums, auditoriums, and performance arenas
                </p>
              </div>
              <Link href="/venues" className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                View All Venues →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {venues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          </section>
        )}

      </main>

      <Footer />
    </div>
  );
}
