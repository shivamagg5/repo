import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] mt-20 py-12 text-sm text-[var(--color-text-secondary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-white text-sm">
              E
            </div>
            <span className="font-bold text-lg text-[var(--color-text-primary)]">EventPlatform</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            The next-generation live events ecosystem. Discover concerts, festivals, comedy, and sports near you.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">Explore</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/events" className="hover:text-[var(--color-text-primary)]">All Events</Link></li>
            <li><Link href="/venues" className="hover:text-[var(--color-text-primary)]">Venues</Link></li>
            <li><Link href="/search" className="hover:text-[var(--color-text-primary)]">Search & Filters</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">Categories</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/events?category=music" className="hover:text-[var(--color-text-primary)]">Music & Concerts</Link></li>
            <li><Link href="/events?category=comedy" className="hover:text-[var(--color-text-primary)]">Standup Comedy</Link></li>
            <li><Link href="/events?category=sports" className="hover:text-[var(--color-text-primary)]">Sports & Fitness</Link></li>
            <li><Link href="/events?category=festival" className="hover:text-[var(--color-text-primary)]">Festivals & Fairs</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">Platform</h4>
          <ul className="space-y-2 text-xs">
            <li className="text-[var(--color-text-muted)]">Organizers & Venues</li>
            <li className="text-[var(--color-text-muted)]">API & Developers</li>
            <li className="text-[var(--color-text-muted)]">Security & Trust</li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex flex-col sm:flex-row justify-between items-center gap-4">
        <p>© {new Date().getFullYear()} EventPlatform Inc. All rights reserved.</p>
        <p className="text-right">Powered by Event Ecosystem Foundation</p>
      </div>
    </footer>
  );
}
