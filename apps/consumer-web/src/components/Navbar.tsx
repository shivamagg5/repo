// =============================================================================
// consumer-web — Navigation Header
// Displays search, navigation links, and reactive authentication status.
// =============================================================================
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@platform/auth';

export function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { status, profile, user, logout } = useAuth();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/events');
    }
  };

  const displayName = profile?.name || user?.user_metadata?.['name'] || user?.email?.split('@')[0] || 'User';

  return (
    <header className="glass-surface sticky top-0 z-50 border-b border-[var(--color-border,#262A36)] bg-[#0F1117]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-black text-white text-lg shadow-lg group-hover:scale-105 transition-transform">
            E
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">
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
              className="w-full bg-[#161922] text-white placeholder-gray-400 text-sm rounded-full px-4 py-2 pl-10 border border-gray-700 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            />
            <svg
              className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        {/* Navigation Links & Auth Actions */}
        <div className="flex items-center gap-4">
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
            <Link href="/events" className="text-gray-300 hover:text-white transition-colors">
              Events
            </Link>
            <Link href="/venues" className="text-gray-300 hover:text-white transition-colors">
              Venues
            </Link>
          </nav>

          {status === 'loading' ? (
            <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse" />
          ) : status === 'authenticated' ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-gray-800 transition-colors text-sm font-medium text-white focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-md">
                  {displayName.charAt(0)}
                </div>
                <span className="hidden md:inline max-w-[120px] truncate">{displayName}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-[#161922] border border-gray-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-gray-800">
                    <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <Link
                    href="/tickets"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800/80 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    My Tickets
                  </Link>
                  <Link
                    href="/orders"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800/80 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Order History
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800/80 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Account Settings
                  </Link>
                  <div className="border-t border-gray-800 my-1" />
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors text-left"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-1.5"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-4 py-2 rounded-xl shadow-md transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
