'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { EventListItemDto } from '@platform/types';
import { EventCard as SharedEventCard } from '@platform/ui';
import { soundFX } from '../lib/soundEffects';

export function EventCard({ event }: { event: EventListItemDto }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="block h-full group"
      onMouseEnter={() => soundFX.playHover()}
      onClick={() => soundFX.playSelect()}
    >
      <motion.div
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="h-full rounded-2xl transition-shadow duration-300 group-hover:shadow-[0_12px_32px_rgba(124,58,237,0.25)]"
      >
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
          className="transition-colors duration-300 border border-white/5 group-hover:border-purple-500/50"
        />
      </motion.div>
    </Link>
  );
}
