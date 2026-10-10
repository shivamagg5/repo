import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';
import { TicketSelector } from '../../../components/tickets/TicketSelector';
import { ShareEventButton } from '../../../components/ShareEventButton';
import { Badge } from '@platform/ui';
import type { EventDetailPublicDto, TicketType } from '@platform/types';

const CURATED_EVENT_DETAILS: Record<string, { event: EventDetailPublicDto; ticketTypes: TicketType[] }> = {
  'neon-nights-festival-2026': {
    event: {
      id: 'e0000000-0000-0000-0000-000000000001',
      title: 'Neon Nights EDM Festival 2026',
      slug: 'neon-nights-festival-2026',
      description: 'The premier electronic music festival with immersive lasers, dual stages, international headliners, and high-energy EDM sets live in Mumbai BKC.',
      startsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000 + 7 * 3600 * 1000).toISOString(),
      timezone: 'Asia/Kolkata',
      ageRestriction: '18+',
      status: 'published',
      venue: {
        id: 'v0000000-0000-0000-0000-000000000001',
        name: 'The Staging Arena — BKC',
        slug: 'the-staging-arena',
        address: 'Plot 42, G Block, Bandra Kurla Complex',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postalCode: '400051',
        capacity: 12000,
      },
      organizer: {
        id: 'o0000000-0000-0000-0000-000000000001',
        name: 'Apex Live Entertainment Group',
        slug: 'apex-live-events',
      },
      category: {
        id: 'c0000000-0000-0000-0000-000000000001',
        name: 'Music & Concerts',
        slug: 'music-concerts',
      },
      media: [
        {
          id: 'm1',
          url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
          type: 'image',
          sortOrder: 0,
        },
      ],
    } as any,
    ticketTypes: [
      {
        id: 'tt000000-0000-0000-0000-000000000001',
        eventId: 'e0000000-0000-0000-0000-000000000001',
        name: 'General Admission Phase 1',
        description: 'Standard festival arena access and food court access.',
        priceMinor: 149900,
        currency: 'INR',
        quantity: 2500,
        soldQuantity: 120,
        reservedQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 6,
        status: 'active',
      } as any,
      {
        id: 'tt000000-0000-0000-0000-000000000002',
        eventId: 'e0000000-0000-0000-0000-000000000001',
        name: 'VIP Fan Pit Pass',
        description: 'Front-row stage pit with dedicated express bar and fast-track gate.',
        priceMinor: 399900,
        currency: 'INR',
        quantity: 800,
        soldQuantity: 45,
        reservedQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 4,
        status: 'active',
      } as any,
      {
        id: 'tt000000-0000-0000-0000-000000000003',
        eventId: 'e0000000-0000-0000-0000-000000000001',
        name: 'Backstage Lounge Experience',
        description: 'Artist lounge viewing, complimentary catering, and official event laminate.',
        priceMinor: 899900,
        currency: 'INR',
        quantity: 50,
        soldQuantity: 10,
        reservedQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 2,
        status: 'active',
      } as any,
    ],
  },
  'arijit-singh-symphony-live-2026': {
    event: {
      id: 'e0000000-0000-0000-0000-000000000002',
      title: 'Arijit Singh — Symphony Tour Live',
      slug: 'arijit-singh-symphony-live-2026',
      description: 'A 50-piece international grand orchestra accompanies India’s most soulful voice for a magical 3-hour stadium concert in Bengaluru.',
      startsAt: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 12 * 24 * 3600 * 1000 + 4 * 3600 * 1000).toISOString(),
      timezone: 'Asia/Kolkata',
      ageRestriction: 'All Ages',
      status: 'published',
      venue: {
        id: 'v0000000-0000-0000-0000-000000000002',
        name: 'Palace Grounds Grand Arena',
        slug: 'palace-grounds-bengaluru',
        address: 'Jayamahal Main Road, Armane Nagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        postalCode: '560006',
        capacity: 25000,
      },
      organizer: {
        id: 'o0000000-0000-0000-0000-000000000001',
        name: 'Apex Live Entertainment Group',
        slug: 'apex-live-events',
      },
      category: {
        id: 'c0000000-0000-0000-0000-000000000001',
        name: 'Music & Concerts',
        slug: 'music-concerts',
      },
      media: [
        {
          id: 'm2',
          url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
          type: 'image',
          sortOrder: 0,
        },
      ],
    } as any,
    ticketTypes: [
      {
        id: 'tt000000-0000-0000-0000-000000000004',
        eventId: 'e0000000-0000-0000-0000-000000000002',
        name: 'Silver Grandstand',
        description: 'Reserved stadium seating with panoramic stage view.',
        priceMinor: 199900,
        currency: 'INR',
        quantity: 5000,
        soldQuantity: 800,
        reservedQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 8,
        status: 'active',
      } as any,
      {
        id: 'tt000000-0000-0000-0000-000000000005',
        eventId: 'e0000000-0000-0000-0000-000000000002',
        name: 'Gold Arena Center',
        description: 'Prime central elevated floor seating with crystal clear audio.',
        priceMinor: 499900,
        currency: 'INR',
        quantity: 3000,
        soldQuantity: 420,
        reservedQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 6,
        status: 'active',
      } as any,
      {
        id: 'tt000000-0000-0000-0000-000000000006',
        eventId: 'e0000000-0000-0000-0000-000000000002',
        name: 'Platinum Symphony Lounge',
        description: 'Orchestra pit perimeter seats + VIP hospitality lounge.',
        priceMinor: 999900,
        currency: 'INR',
        quantity: 500,
        soldQuantity: 110,
        reservedQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 4,
        status: 'active',
      } as any,
    ],
  },
};

async function fetchEventDetail(slug: string): Promise<EventDetailPublicDto | null> {
  try {
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1';
    const res = await fetch(`${baseUrl}/public/events/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const body = await res.json();
      if (body.data ?? body) return body.data ?? body;
    }
  } catch {
    // fallback below
  }
  return CURATED_EVENT_DETAILS[slug]?.event ?? null;
}

async function fetchTicketTypes(eventId: string, slug?: string): Promise<TicketType[]> {
  try {
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1';
    const res = await fetch(`${baseUrl}/events/${encodeURIComponent(eventId)}/ticket-types`, {
      next: { revalidate: 30 },
    });
    if (res.ok) {
      const body = await res.json();
      const list = body.data ?? body;
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {
    // fallback below
  }
  if (slug && CURATED_EVENT_DETAILS[slug]) {
    return CURATED_EVENT_DETAILS[slug].ticketTypes;
  }
  return [];
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

  const ticketTypes = await fetchTicketTypes(event.id, slug);
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
            <div className="ml-auto">
              <ShareEventButton title={event.title} />
            </div>
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
                  <div className="space-y-1">
                    <Link href={`/venues/${event.venue.slug}`} className="text-purple-400 hover:underline font-medium block">
                      {event.venue.name} ({event.venue.city})
                    </Link>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue.name} ${event.venue.address || ''} ${event.venue.city || ''}`.trim())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                    >
                      🗺️ Open in Google Maps ↗
                    </a>
                  </div>
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
            <TicketSelector
              eventId={event.id}
              eventName={event.title}
              ticketTypes={ticketTypes}
              venueName={event.venue?.name}
              isHighDemand={Boolean(event.slug?.includes('neon') || (event.venue?.capacity && event.venue.capacity >= 10000))}
            />
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
