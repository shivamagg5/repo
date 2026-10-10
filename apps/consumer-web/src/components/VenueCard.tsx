'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { VenuePublic } from '@platform/types';
import { soundFX } from '../lib/soundEffects';

export function VenueCard({ venue }: { venue: VenuePublic }) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group block h-full"
      onMouseEnter={() => soundFX.playHover()}
      onClick={() => soundFX.playSelect()}
    >
      <motion.div
        whileHover={{ y: -5 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="glass-surface glass-surface-hover rounded-2xl p-5 flex flex-col justify-between h-full transition-all border border-white/5 group-hover:border-purple-500/40 group-hover:shadow-[0_10px_30px_rgba(124,58,237,0.2)]"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              {venue.city ? `📍 ${venue.city}, ${venue.country ?? 'IN'}` : 'Venue'}
            </span>
            {venue.capacity && (
              <span className="text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] px-2 py-0.5 rounded-full border border-white/5">
                Cap: {venue.capacity.toLocaleString()}
              </span>
            )}
          </div>
          <h3 className="font-bold text-lg text-[var(--color-text-primary)] group-hover:text-purple-300 transition-colors mb-1 font-['Outfit']">
            {venue.name}
          </h3>
          {venue.address && (
            <p className="text-xs text-[var(--color-text-muted)] line-clamp-1 mb-2 font-['Inter']">
              {venue.address}
            </p>
          )}
          {venue.description && (
            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed font-['Inter']">
              {venue.description}
            </p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-purple-400 font-medium">
          <span>Explore Venue</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </motion.div>
    </Link>
  );
}
