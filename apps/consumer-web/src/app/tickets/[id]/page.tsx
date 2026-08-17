// =============================================================================
// consumer-web — Digital Ticket & QR Code Entry Pass
// High-contrast cryptographic QR Code rendering & Gate Verification
// =============================================================================
'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { useAuth, useAnalytics } from '@platform/auth';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';
import { TicketCard, Button, Card } from '@platform/ui';
import type { Ticket } from '@platform/types';

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;

  const router = useRouter();
  const { isAuthenticated, status, apiClient, user } = useAuth();
  const { track } = useAnalytics(apiClient);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getTicketById<Ticket>(ticketId);
      if (res.data) {
        setTicket(res.data);
        track('ticket_viewed', { isOffline: false }, res.data.eventId);

        // Generate high-contrast QR Code
        const payloadToEncode = res.data.qrToken || `TICKET:${res.data.ticketNumber}:${res.data.id}`;
        const dataUrl = await QRCode.toDataURL(payloadToEncode, {
          width: 260,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'M',
        });
        setQrDataUrl(dataUrl);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load ticket credential.');
    } finally {
      setLoading(false);
    }
  }, [apiClient, ticketId, track]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/auth/login?redirectTo=/tickets/${encodeURIComponent(ticketId)}`);
      return;
    }
    if (status === 'authenticated') {
      loadTicket();
    }
  }, [status, loadTicket, router, ticketId]);

  const handleDownloadIcs = () => {
    if (!ticket) return;
    const now = new Date();
    const eventDate = new Date(ticket.issuedAt);
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventPlatform//TicketPass//EN',
      'BEGIN:VEVENT',
      `UID:${ticket.id}@eventplatform.com`,
      `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:Event Admission (${ticket.ticketNumber})`,
      `DESCRIPTION:Verified Digital Ticket Admission. Ticket Number: ${ticket.ticketNumber}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Ticket_${ticket.ticketNumber}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMappedStatus = (): 'valid' | 'used' | 'refunded' | 'cancelled' => {
    if (ticket?.status === 'issued') return 'valid';
    if (ticket?.status === 'checked_in') return 'used';
    if (ticket?.status === 'refunded') return 'refunded';
    if (ticket?.status === 'cancelled' || ticket?.status === 'void') return 'cancelled';
    return 'valid';
  };

  return (
    <div className="min-h-screen bg-[#090C15] text-[#F8FAFC] flex flex-col justify-between">
      <Navbar />

      <main className="container mx-auto px-4 py-10 max-w-lg flex-1">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/tickets" className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 font-medium">
            ← Back to Wallet
          </Link>
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">Official Digital Pass</span>
        </div>

        {loading ? (
          <Card variant="default" padding="lg" className="text-center">
            <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-[var(--color-text-secondary)] font-['Inter']">Loading your cryptographic ticket pass...</p>
          </Card>
        ) : error || !ticket ? (
          <Card variant="bordered" padding="lg" className="text-center border-red-800/40">
            <h2 className="text-xl font-bold text-white mb-2 font-['Outfit']">Ticket Unavailable</h2>
            <p className="text-sm text-gray-400 mb-6 font-['Inter']">{error || 'Could not retrieve ticket credential.'}</p>
            <Link href="/tickets">
              <Button variant="primary" size="md">
                Return to Wallet
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            <TicketCard
              id={ticket.id}
              ticketNumber={ticket.ticketNumber}
              eventTitle="Standard Event Experience"
              tierName="General Admission"
              startsAt={ticket.issuedAt}
              venueName="Main Arena Gates"
              seatInfo="Gate A / General Floor"
              status={getMappedStatus()}
              showLiveClock={true}
              qrCodeElement={
                qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Pass for ${ticket.ticketNumber}`}
                    className="w-48 h-48 mx-auto block"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-200 animate-pulse flex items-center justify-center text-gray-500 text-xs">
                    Generating QR...
                  </div>
                )
              }
            />

            {/* Calendar & Receipt Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={handleDownloadIcs}
              >
                📅 Add to Calendar (.ics)
              </Button>

              <Link href="/orders" className="w-full">
                <Button variant="ghost" size="sm" fullWidth>
                  View Order Receipt
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
