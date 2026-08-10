import React from 'react';
import type { Metadata } from 'next';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';
import { EventCard } from '../../../components/EventCard';
import type { EventListItemDto, CursorPaginatedResponse } from '@platform/types';

async function fetchCategoryEvents(slug: string): Promise<EventListItemDto[]> {
  try {
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
    const res = await fetch(`${baseUrl}/public/events?category=${encodeURIComponent(slug)}&limit=24`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const body: CursorPaginatedResponse<EventListItemDto> = await res.json();
    return body.items ?? [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.charAt(0).toUpperCase() + slug.slice(1);
  return {
    title: `${name} Events & Shows | EventPlatform`,
    description: `Discover top ${name} events, concerts, and live shows near you.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const events = await fetchCategoryEvents(slug);
  const categoryName = slug.charAt(0).toUpperCase() + slug.slice(1);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-10">
        <div className="glass-surface rounded-3xl p-8 border border-[var(--color-border)]">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            Category Discovery
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mt-3 mb-2">
            {categoryName} Events
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Explore live {categoryName.toLowerCase()} experiences published on EventPlatform.
          </p>
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="glass-surface rounded-3xl p-16 text-center max-w-md mx-auto">
            <span className="text-4xl mb-3 block">🎭</span>
            <h3 className="font-bold text-lg text-white mb-1">No {categoryName} Events Yet</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Check back soon as new events are submitted and published.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
