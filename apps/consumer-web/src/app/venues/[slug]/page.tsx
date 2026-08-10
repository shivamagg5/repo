import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';
import { EventCard } from '../../../components/EventCard';
import type { VenuePublic, EventListItemDto, CursorPaginatedResponse } from '@platform/types';

async function fetchVenueDetail(slug: string): Promise<VenuePublic | null> {
  try {
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
    const res = await fetch(`${baseUrl}/public/venues/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data ?? body;
  } catch {
    return null;
  }
}

async function fetchUpcomingVenueEvents(venueId: string): Promise<EventListItemDto[]> {
  try {
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
    const res = await fetch(`${baseUrl}/public/events?venueId=${encodeURIComponent(venueId)}&limit=8`, {
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
  const venue = await fetchVenueDetail(slug);
  if (!venue) return { title: 'Venue Not Found' };

  return {
    title: `${venue.name} (${venue.city ?? 'Venue'}) | EventPlatform`,
    description: venue.description ?? `Explore live events hosted at ${venue.name}.`,
  };
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venue = await fetchVenueDetail(slug);
  if (!venue) notFound();

  const upcomingEvents = await fetchUpcomingVenueEvents(venue.id);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-12">
        {/* Venue Header Card */}
        <div className="glass-surface rounded-3xl p-8 border border-[var(--color-border)]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              📍 {venue.city ? `${venue.city}, ${venue.country ?? 'IN'}` : 'Venue Space'}
            </span>
            {venue.capacity && (
              <span className="text-xs font-semibold text-gray-300 bg-[var(--color-surface-elevated)] px-3 py-1 rounded-full border border-[var(--color-border)]">
                Capacity: {venue.capacity.toLocaleString()} Seats
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-3">
            {venue.name}
          </h1>

          {venue.address && (
            <p className="text-sm font-medium text-gray-300 mb-4">
              🏢 {venue.address}
            </p>
          )}

          {venue.description && (
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-3xl">
              {venue.description}
            </p>
          )}
        </div>

        {/* Upcoming Events at this Venue */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">
            Upcoming Events at {venue.name}
          </h2>

          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="glass-surface rounded-2xl p-12 text-center max-w-md mx-auto">
              <span className="text-3xl mb-2 block">📅</span>
              <h3 className="font-bold text-base text-white mb-1">No Scheduled Events</h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                There are currently no upcoming public events published for this venue.
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
