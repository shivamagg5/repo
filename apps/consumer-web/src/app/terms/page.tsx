import React from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

export const metadata = {
  title: 'Terms of Service | PULSR Event Platform',
  description: 'Terms and conditions governing event ticket purchases, reservations, and gate entry.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 w-full">
        <div className="mb-10">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/10 text-[var(--color-primary)] border border-pink-500/20 mb-3 tracking-wider uppercase">
            Legal & Compliance
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            Terms of Service
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Effective Date: October 7, 2026 • Version 2.4
          </p>
        </div>

        <div className="space-y-8 text-xs text-[var(--color-text-secondary)] leading-relaxed glass-surface p-8 sm:p-10 rounded-3xl border border-white/10">
          <section>
            <h2 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">1. Platform Nature & Agreement</h2>
            <p>
              PULSR operates as an authorized primary ticketing technology provider and discovery marketplace connecting event attendees ("Buyers") with verified event producers and venues ("Organizers"). By completing a transaction, reserving passes, or downloading digital tickets on PULSR, you explicitly consent to these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">2. Ticket Holds & Reservation Window</h2>
            <p>
              Upon selecting tickets and initiating checkout, passes are placed under an exclusive 10-minute inventory reservation hold backed by distributed database locks. Failure to complete authorized payment within this window automatically releases the reserved inventory back to the public pool.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">3. Admission, Dynamic QR Passes & Anti-Fraud</h2>
            <p>
              Admission passes issued by PULSR utilize dynamic cryptographic refresh algorithms. Re-selling, duplicating, scalping above face value, or utilizing unauthorized secondary bot services is strictly prohibited and results in immediate ticket revocation without refund.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">4. Cancellations, Postponements & Refunds</h2>
            <p>
              In the event of an event cancellation by the Organizer, full face-value ticket refunds are automatically triggered back to the original payment source within 5-7 business days via our payment gateway settlement ledger. Event rescheduling policies are determined by the host organizer.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">5. Gate Conduct & Age Restrictions</h2>
            <p>
              Attendees must present a valid government-issued photo ID (Aadhaar, Passport, or Driver’s License) matching the ticket registration for age-restricted events (e.g., 18+ or 21+ venues). Organizers and venue security maintain full right of admission.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
