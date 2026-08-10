'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/events');
    }
  };

  return (
    <header className="glass-surface sticky top-0 z-50 border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-black text-white text-lg shadow-[var(--shadow-brand)] group-hover:scale-105 transition-transform">
            E
          </div>
          <span className="font-extrabold text-xl tracking-tight text-gradient">
            EventPlatform
          </span>
        </Link>

        {/* Global Search Input */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concerts, comedies, festivals, venues..."
              className="w-full bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-sm rounded-full px-4 py-2 pl-10 border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-colors"
            />
            <svg
              className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-text-muted)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        {/* Navigation Links */}
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/events" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            Events
          </Link>
          <Link href="/venues" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            Venues
          </Link>
          <Link href="/search" className="md:hidden text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            Search
          </Link>
        </nav>
      </div>
    </header>
  );
}
