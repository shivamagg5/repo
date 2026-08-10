'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { VenueCard } from '../../components/VenueCard';
import { apiClient } from '../../lib/api';
import type { VenuePublic } from '@platform/types';

export default function VenuesDirectoryPage() {
  const [venues, setVenues] = useState<VenuePublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVenues() {
      try {
        setLoading(true);
        const data = await apiClient.getPublicVenues<VenuePublic[]>({ limit: '24' });
        setVenues(data ?? []);
      } catch (err) {
        console.error('Failed to load venues', err);
      } finally {
        setLoading(false);
      }
    }
    loadVenues();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Active Event Venues & Arenas
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Explore stadiums, auditoriums, and performance spaces hosting live experiences.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass-surface rounded-2xl h-48 animate-pulse bg-[var(--color-surface)]" />
            ))}
          </div>
        ) : venues.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {venues.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        ) : (
          <div className="glass-surface rounded-3xl p-16 text-center max-w-md mx-auto my-12">
            <span className="text-4xl mb-3 block">🏟️</span>
            <h3 className="font-bold text-lg text-white mb-1">No Active Venues Found</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Venue listings will appear as organizers partner with performance spaces.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
