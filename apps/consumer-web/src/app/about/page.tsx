import React from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

export const metadata = {
  title: 'About Us | PULSR Event Platform',
  description: 'The next-generation live events, festival ticketing, and nightlife ecosystem.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 w-full">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/10 text-[var(--color-primary)] border border-pink-500/20 mb-3 tracking-wider uppercase">
            Our Mission
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Reinventing How India Experiences Live Culture
          </h1>
          <p className="text-base text-[var(--color-text-secondary)] leading-relaxed">
            PULSR was built to eliminate counterfeit passes, unfair ticket scalping bots, and fragmented event operations. We connect attendees, organizers, artists, and venues through real-time cryptographic ticketing.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="glass-surface p-8 rounded-2xl border border-white/10">
            <div className="text-3xl mb-3">🛡️</div>
            <h3 className="text-lg font-bold text-white mb-2">Zero-Fraud Dynamic QRs</h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Every digital pass is cryptographically signed and changes dynamically offline. Screenshots and duplicated PDFs are instantly rejected at venue gates.
            </p>
          </div>

          <div className="glass-surface p-8 rounded-2xl border border-white/10">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-bold text-white mb-2">High-Concurrency Holds</h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Distributed Redis locking and guaranteed 10-minute cart holds ensure that when stadium tours drop, true fans get their tickets without mid-checkout drops.
            </p>
          </div>

          <div className="glass-surface p-8 rounded-2xl border border-white/10">
            <div className="text-3xl mb-3">🤝</div>
            <h3 className="text-lg font-bold text-white mb-2">Ecosystem Transparency</h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Automated T+1 settlements, promoter commission ledgers, and direct gate telemetry provide organizers with verifiable financial trust.
            </p>
          </div>
        </div>

        {/* Metrics Section */}
        <div className="rounded-3xl p-10 border border-white/10 bg-gradient-to-r from-purple-950/30 via-slate-900 to-black mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl font-extrabold text-white mb-1">50,000+</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Tickets Issued</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white mb-1">&lt; 0.3s</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Gate Scan Speed</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white mb-1">100%</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Offline Scan Uptime</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white mb-1">₹0</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Counterfeit Losses</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Are you an event creator or venue?</h2>
          <p className="text-xs text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
            Partner with us to launch your next concert, festival, or club night with end-to-end box office control.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/events"
              className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Explore Live Gigs
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3 rounded-xl border border-white/20 text-white text-xs font-bold hover:bg-white/5 transition-colors"
            >
              Contact Team
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
