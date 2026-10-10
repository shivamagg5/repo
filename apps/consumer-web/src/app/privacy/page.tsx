import React from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

export const metadata = {
  title: 'Privacy Policy | PULSR Event Platform',
  description: 'How PULSR collects, secures, and handles user information under data protection laws.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 w-full">
        <div className="mb-10">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/10 text-[var(--color-primary)] border border-pink-500/20 mb-3 tracking-wider uppercase">
            Data Governance
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            Privacy Policy
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Effective Date: October 7, 2026 • Compliant with Digital Personal Data Protection (DPDP) Act & GDPR
          </p>
        </div>

        <div className="space-y-8 text-xs text-[var(--color-text-secondary)] leading-relaxed glass-surface p-8 sm:p-10 rounded-3xl border border-white/10">
          <section>
            <h2 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">1. Information We Collect</h2>
            <p>
              When you create an account, purchase tickets, or bookmark events on PULSR, we collect your name, email address, phone number (for SMS/WhatsApp pass delivery), transaction records, and device tokens for in-app entry updates. We never store raw credit card numbers or banking passwords.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">2. How Your Information is Utilized</h2>
            <p>
              Your data is strictly utilized to: (a) issue cryptographically authenticated digital event passes, (b) transmit gate operational notices and weather alerts, (c) reconcile payment orders and refunds, and (d) prevent ticket scalping bots.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">3. Data Sharing With Organizers</h2>
            <p>
              When you purchase a ticket for a specific event, attendee name and pass tier are securely shared with the accredited host organizer and gate security staff solely for admission validation and venue crowd safety. We do not sell user data to third-party ad brokers.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">4. Security & Cryptographic Storage</h2>
            <p>
              All customer telemetry, tickets, and user credentials are encrypted in transit via TLS 1.3 and at rest with AES-256 encryption within isolated database clusters protected by strict Row-Level Security (RLS) policies.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">5. Your Data Rights</h2>
            <p>
              You have the right to request a complete copy of your personal data or request deletion of your profile and past tickets by contacting <span className="text-[var(--color-primary)] font-mono">privacy@pulsr.in</span>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
