import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';
import { TicketSelector } from '../../../components/tickets/TicketSelector';
import { Badge } from '@platform/ui';
import type { EventDetailPublicDto, TicketType } from '@platform/types';

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

async function fetchTicketTypes(eventId: string): Promise<TicketType[]> {
  try {
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
    const res = await fetch(`${baseUrl}/events/${encodeURIComponent(eventId)}/ticket-types`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const body = await res.json();
    return body.data ?? body ?? [];
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

  const ticketTypes = await fetchTicketTypes(event.id);
  const coverImage = event.media?.find((m) => m.type === 'image')?.url ?? event.media?.[0]?.url;

  const minPriceMinor = ticketTypes.length > 0
    ? Math.min(...ticketTypes.map((t) => t.priceMinor))
    : null;

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
    <div className="min-h-screen flex flex-col bg-[#090C15] text-[#F8FAFC]">
      {/* Inject JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      {/* --- HERO / COVER IMAGE BANNER --- */}
      <div className="relative h-[320px] sm:h-[440px] w-full bg-[var(--color-bg-surface-elevated)] overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={event.title}
            className="w-full h-full object-cover filter brightness-[0.7]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/60 via-indigo-900/40 to-black flex items-center justify-center">
            <span className="text-purple-300/40 font-black text-4xl uppercase tracking-widest font-['Outfit']">
              {event.category?.name ?? 'Live Experience'}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090C15] via-[#090C15]/50 to-transparent" />
      </div>

      {/* --- CONTENT CONTAINER --- */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-28 relative z-10 space-y-10 w-full mb-24">

        {/* Event Header Card */}
        <div className="glass-surface rounded-3xl p-6 sm:p-8 shadow-[var(--shadow-lg)] border border-[var(--color-border)]">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {event.category && (
              <Badge variant="brand" size="md">
                {event.category.name}
              </Badge>
            )}
            {event.ageRestriction && (
              <span className="bg-[var(--color-bg-surface-elevated)] text-gray-300 text-xs font-medium px-3 py-1 rounded-full border border-[var(--color-border)]">
                🔞 {event.ageRestriction}
              </span>
            )}
            <Badge variant="success" size="md" dot>
              Verified Experience
            </Badge>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight font-['Outfit']">
            {event.title}
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <strong className="block text-white font-semibold">Date & Time</strong>
                <time>{formatDate(event.startsAt)}</time>
                <span className="block text-xs text-[var(--color-text-muted)] mt-0.5 font-mono">TZ: {event.timezone}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">📍</span>
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

        {/* Two-Column Grid: Details vs Ticket Selector Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column (2/3): Description & Lineup */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Event */}
            <section className="glass-surface rounded-3xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-white mb-4 font-['Outfit']">About This Event</h2>
              <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line font-['Inter']">
                {event.description ?? 'No detailed description provided.'}
              </div>
            </section>

            {/* Lineup Performers */}
            {event.lineup && event.lineup.length > 0 && (
              <section className="glass-surface rounded-3xl p-6 sm:p-8">
                <h2 className="text-xl font-bold text-white mb-4 font-['Outfit']">Artist & Performer Lineup</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.lineup.map((item) => (
                    <div key={item.id} className="bg-[var(--color-bg-surface-elevated)] p-3.5 rounded-xl border border-[var(--color-border)] flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{item.name}</span>
                      {item.role && (
                        <span className="text-xs text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-md font-medium border border-purple-500/25">
                          {item.role}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column (1/3): Interactive Ticket Selector */}
          <div id="tickets-section">
            <TicketSelector eventId={event.id} ticketTypes={ticketTypes} />
          </div>

        </div>

      </main>

      {/* --- MOBILE STICKY BOOKING BAR (< 1024px) --- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-4 glass-surface border-t border-[var(--color-border-strong)] bg-[#090C15]/95 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider block">
              Price
            </span>
            <span className="text-base font-bold text-white font-['Outfit']">
              {minPriceMinor !== null ? `From ₹${(minPriceMinor / 100).toLocaleString()}` : 'Available'}
            </span>
          </div>

          <a
            href="#tickets-section"
            className="flex-1 max-w-[200px] text-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm py-3 px-6 rounded-xl shadow-[var(--shadow-brand)] active:scale-95 transition-all"
          >
            Select Tickets →
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
