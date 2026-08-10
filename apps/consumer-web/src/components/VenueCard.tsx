import React from 'react';
import Link from 'next/link';
import type { VenuePublic } from '@platform/types';

export function VenueCard({ venue }: { venue: VenuePublic }) {
  return (
    <Link href={`/venues/${venue.slug}`} className="group block">
      <div className="glass-surface glass-surface-hover rounded-2xl p-5 flex flex-col justify-between h-full transition-all">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              {venue.city ? `📍 ${venue.city}, ${venue.country ?? 'IN'}` : 'Venue'}
            </span>
            {venue.capacity && (
              <span className="text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] px-2 py-0.5 rounded-full">
                Cap: {venue.capacity.toLocaleString()}
              </span>
            )}
          </div>
          <h3 className="font-bold text-lg text-[var(--color-text-primary)] group-hover:text-purple-300 transition-colors mb-1">
            {venue.name}
          </h3>
          {venue.address && (
            <p className="text-xs text-[var(--color-text-muted)] line-clamp-1 mb-2">
              {venue.address}
            </p>
          )}
          {venue.description && (
            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
              {venue.description}
            </p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-purple-400 font-medium">
          <span>Explore Venue</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </Link>
  );
}
