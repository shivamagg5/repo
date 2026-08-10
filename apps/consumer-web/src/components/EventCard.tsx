import React from 'react';
import Link from 'next/link';
import type { EventListItemDto } from '@platform/types';

export function EventCard({ event }: { event: EventListItemDto }) {
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Link href={`/events/${event.slug}`} className="group block">
      <div className="glass-surface glass-surface-hover rounded-2xl overflow-hidden flex flex-col h-full transition-all">
        {/* Cover Image Container */}
        <div className="relative aspect-[16/9] w-full bg-[var(--color-surface-elevated)] overflow-hidden">
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-indigo-900/40 flex items-center justify-center p-4 text-center">
              <span className="text-purple-300/60 font-bold text-lg tracking-wider uppercase">
                {event.categoryName ?? 'Live Event'}
              </span>
            </div>
          )}

          {/* Category Pill Badge */}
          {event.categoryName && (
            <span className="absolute top-3 left-3 bg-purple-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
              {event.categoryName}
            </span>
          )}

          {/* City Badge */}
          {event.city && (
            <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-gray-200 text-xs px-2 py-0.5 rounded-md font-medium">
              📍 {event.city}
            </span>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 flex flex-col flex-1 justify-between">
          <div>
            <p className="text-xs font-semibold text-purple-400 mb-1">
              📅 {formatDate(event.startsAt)}
            </p>
            <h3 className="font-bold text-base text-[var(--color-text-primary)] group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
              {event.title}
            </h3>
          </div>

          <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <span className="truncate max-w-[180px]">
              {event.venueName ? `🏟️ ${event.venueName}` : 'Online / TBA'}
            </span>
            <span className="text-purple-400 font-semibold group-hover:translate-x-0.5 transition-transform">
              View Details →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
