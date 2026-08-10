import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';
import type { EventDetailPublicDto } from '@platform/types';

async function fetchEventDetail(slug: string): Promise<EventDetailPublicDto | null> {
  try {
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
    const res = await fetch(`${baseUrl}/public/events/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data ?? body;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchEventDetail(slug);
  if (!event) {
    return { title: 'Event Not Found' };
  }

  const title = `${event.title} | EventPlatform`;
  const description = event.description?.substring(0, 160) ?? `Join ${event.title} live at ${event.venue?.name ?? 'Venue TBD'}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: event.media?.[0]?.url ? [{ url: event.media[0].url }] : [],
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await fetchEventDetail(slug);

  if (!event) {
    notFound();
  }

  const coverImage = event.media?.find((m) => m.type === 'image')?.url ?? event.media?.[0]?.url;

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  // Structured JSON-LD Metadata for Google Event Search indexing
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue?.name ?? 'Venue TBD',
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.venue?.address ?? '',
        addressLocality: event.venue?.city ?? '',
        addressCountry: event.venue?.country ?? 'IN',
      },
    },
    image: coverImage ? [coverImage] : [],
    description: event.description,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* Inject JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      {/* --- HERO / COVER IMAGE BANNER --- */}
      <div className="relative h-[320px] sm:h-[420px] w-full bg-[var(--color-surface-elevated)] overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={event.title}
            className="w-full h-full object-cover filter brightness-[0.7]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/60 via-indigo-900/40 to-black flex items-center justify-center">
            <span className="text-purple-300/40 font-black text-4xl uppercase tracking-widest">
              {event.category?.name ?? 'Live Event'}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-background)] via-[var(--color-background)]/40 to-transparent" />
      </div>

      {/* --- CONTENT CONTAINER --- */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 space-y-10 w-full mb-16">

        {/* Event Header Card */}
        <div className="glass-surface rounded-3xl p-6 sm:p-8 shadow-[var(--shadow-lg)]">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {event.category && (
              <span className="bg-purple-600/90 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                {event.category.name}
              </span>
            )}
            {event.ageRestriction && (
              <span className="bg-[var(--color-surface-elevated)] text-gray-300 text-xs font-medium px-3 py-1 rounded-full border border-[var(--color-border)]">
                🔞 {event.ageRestriction}
              </span>
            )}
            <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/20">
              ✓ Verified Event
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            {event.title}
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]">
            <div className="flex items-start gap-3">
              <span className="text-xl">📅</span>
              <div>
                <strong className="block text-white font-semibold">Date & Time</strong>
                <time>{formatDate(event.startsAt)}</time>
                <span className="block text-xs text-[var(--color-text-muted)] mt-0.5">Timezone: {event.timezone}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-xl">📍</span>
              <div>
                <strong className="block text-white font-semibold">Location & Venue</strong>
                {event.venue ? (
                  <Link href={`/venues/${event.venue.slug}`} className="text-purple-400 hover:underline font-medium">
                    {event.venue.name} ({event.venue.city})
                  </Link>
                ) : (
                  <span>Venue TBD</span>
                )}
                {event.venue?.address && (
                  <span className="block text-xs text-[var(--color-text-muted)] mt-0.5">{event.venue.address}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Details vs Ticket Placeholder Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column (2/3): Description & Lineup */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Event */}
            <section className="glass-surface rounded-3xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-white mb-4">About This Event</h2>
              <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
                {event.description ?? 'No detailed description provided.'}
              </div>
            </section>

            {/* Lineup Performers */}
            {event.lineup && event.lineup.length > 0 && (
              <section className="glass-surface rounded-3xl p-6 sm:p-8">
                <h2 className="text-xl font-bold text-white mb-4">Artist & Performer Lineup</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.lineup.map((item) => (
                    <div key={item.id} className="bg-[var(--color-surface)] p-3.5 rounded-xl border border-[var(--color-border)] flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{item.name}</span>
                      {item.role && (
                        <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md font-medium">
                          {item.role}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column (1/3): Tickets Placeholder CTA */}
          <div>
            <div className="glass-surface rounded-3xl p-6 sticky top-24 border border-purple-500/30 shadow-[var(--shadow-brand)]">
              <div className="text-center mb-6">
                <span className="inline-block bg-purple-500/10 text-purple-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2">
                  Ticketing Update
                </span>
                <h3 className="text-lg font-bold text-white">Tickets Available Soon</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Ticket sales and reservations for this event will launch shortly.
                </p>
              </div>

              <button
                disabled
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm py-3.5 rounded-xl opacity-80 cursor-not-allowed text-center shadow-md"
              >
                🎟️ Ticket Sales Opening Soon
              </button>

              <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] text-center space-y-1">
                <p>✓ Authorized Event Discovery Listing</p>
                <p>🔒 Verified Venue Partnership</p>
              </div>
            </div>
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
