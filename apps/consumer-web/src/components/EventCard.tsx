import React from 'react';
import Link from 'next/link';
import type { EventListItemDto } from '@platform/types';
import { EventCard as SharedEventCard } from '@platform/ui';

export function EventCard({ event }: { event: EventListItemDto }) {
  return (
    <Link href={`/events/${event.slug}`} className="block h-full">
      <SharedEventCard
        id={event.id}
        title={event.title}
        slug={event.slug}
        startsAt={event.startsAt}
        coverImage={event.coverImage}
        venueName={event.venueName}
        city={event.city}
        categoryName={event.categoryName}
        currency="INR"
      />
    </Link>
  );
}
