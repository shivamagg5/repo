'use client';

import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: 'general', message: '' });
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 w-full">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/10 text-[var(--color-primary)] border border-pink-500/20 mb-3 tracking-wider uppercase">
            Get in Touch
          </span>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">
            Contact Support & Partnerships
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Have questions regarding ticket bookings, organizer onboarding, or venue partnerships? Our operations team is here to assist 24/7.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Contact Details & Channels */}
          <div className="space-y-6">
            <div className="glass-surface p-6 rounded-2xl border border-white/10">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <span>🎫</span> Attendee & Ticket Helpdesk
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] mb-3">
                For order status, QR pass regeneration, or event timing queries.
              </p>
              <a
                href="mailto:support@pulsr.in"
                className="text-xs font-mono text-[var(--color-primary)] hover:underline block font-semibold"
              >
                support@pulsr.in
              </a>
            </div>

            <div className="glass-surface p-6 rounded-2xl border border-white/10">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <span>🎪</span> Organizer & Festival Box Office
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] mb-3">
                Direct onboarding, custom ticketing agreements, and gate scanner hardware provisioning.
              </p>
              <a
                href="mailto:partnerships@pulsr.in"
                className="text-xs font-mono text-purple-400 hover:underline block font-semibold"
              >
                partnerships@pulsr.in
              </a>
            </div>

            <div className="glass-surface p-6 rounded-2xl border border-white/10">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <span>🏢</span> Headquarters
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                PULSR Live Technologies Private Limited<br />
                Indiranagar, 100ft Road, Bengaluru, Karnataka 560038<br />
                Bandra Kurla Complex (BKC), Mumbai, Maharashtra 400051
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="glass-surface p-8 rounded-2xl border border-white/10">
            {submitted ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="text-lg font-bold text-white mb-2">Message Received</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mb-6">
                  Thank you for reaching out. An operations specialist will reply to your registered email within 2-4 hours.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-white/10 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-white/10 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Inquiry Category
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-white/10 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="general">General Question</option>
                    <option value="ticket">Ticket Booking & Pass Help</option>
                    <option value="organizer">Event Organizer Hosting</option>
                    <option value="press">Media & Press</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe your inquiry with relevant order ID or event details..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-white/10 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Transmitting Message...' : 'Submit Inquiry'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
