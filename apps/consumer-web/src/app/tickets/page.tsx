// =============================================================================
// consumer-web — Ticket Wallet Page
// Displays all issued and past digital tickets with standardized Tabs & Pass Cards
// =============================================================================
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@platform/auth';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { Tabs, Card, Badge, Button, EmptyState } from '@platform/ui';
import type { Ticket } from '@platform/types';

export default function TicketWalletPage() {
  const router = useRouter();
  const { isAuthenticated, status, apiClient } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>('upcoming');

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getUserTickets<Ticket[]>();
      if (res.data) {
        setTickets(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load ticket wallet.');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login?redirectTo=/tickets');
      return;
    }
    if (status === 'authenticated') {
      loadTickets();
    }
  }, [status, loadTickets, router]);

  const activeTickets = tickets.filter((t) => t.status === 'issued');
  const pastTickets = tickets.filter((t) => t.status === 'checked_in' || t.status === 'void' || t.status === 'refunded' || t.status === 'cancelled');

  const displayedTickets = tab === 'upcoming' ? activeTickets : pastTickets;

  return (
    <div className="min-h-screen bg-[#090C15] text-[#F8FAFC] flex flex-col justify-between">
      <Navbar />

      <main className="container mx-auto px-4 py-10 max-w-4xl flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--color-border)] gap-4 mb-8">
          <div>
            <span className="text-xs uppercase font-bold text-purple-400 tracking-wider">Digital Passes</span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-0.5 font-['Outfit']">My Ticket Wallet</h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-['Inter']">
              Access your verified event tickets, QR gate entry codes, and digital passes
            </p>
          </div>

          {/* Tab Selector using @platform/ui Tabs */}
          <Tabs
            tabs={[
              { id: 'upcoming', label: 'Upcoming', count: activeTickets.length },
              { id: 'past', label: 'Past & Used', count: pastTickets.length },
            ]}
            activeId={tab}
            onChange={(id) => setTab(id)}
            variant="pills"
          />
        </div>

        {loading ? (
          <Card variant="default" padding="lg" className="text-center">
            <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-[var(--color-text-secondary)] font-['Inter']">Loading your digital wallet passes...</p>
          </Card>
        ) : error ? (
          <Card variant="bordered" padding="lg" className="text-center border-red-800/40">
            <p className="text-sm text-red-400 mb-4">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => loadTickets()}>
              Retry
            </Button>
          </Card>
        ) : displayedTickets.length === 0 ? (
          <EmptyState
            icon={<span>🎟️</span>}
            title={tab === 'upcoming' ? 'No Upcoming Tickets' : 'No Past Tickets'}
            description={
              tab === 'upcoming'
                ? 'You do not have any active tickets in your wallet. Ready for your next experience?'
                : 'Tickets from completed events and check-ins will appear here for your records.'
            }
            action={
              tab === 'upcoming' ? (
                <Link href="/events">
                  <Button variant="brand-glow" size="md">
                    Explore Live Events →
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedTickets.map((tkt) => (
              <Card
                key={tkt.id}
                variant="elevated"
                padding="md"
                interactive
                className="relative overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950/40 border border-purple-800/60 px-2.5 py-1 rounded-md">
                      #{tkt.ticketNumber}
                    </span>
                    {tkt.status === 'issued' ? (
                      <Badge variant="success" size="sm" dot pulse>
                        Valid Pass
                      </Badge>
                    ) : tkt.status === 'checked_in' ? (
                      <Badge variant="neutral" size="sm">
                        Checked In
                      </Badge>
                    ) : (
                      <Badge variant="danger" size="sm">
                        {tkt.status}
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors font-['Outfit']">
                    Standard Admission Pass
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mb-6 font-['Inter']">
                    Issued on {new Date(tkt.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)] font-['Inter']">Scan at Entry Gate</span>
                  <Link href={`/tickets/${encodeURIComponent(tkt.id)}`}>
                    <Button variant="primary" size="sm">
                      View QR Pass →
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
