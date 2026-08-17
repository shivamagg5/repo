'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from './Badge.js';
import { Card } from './Card.js';

export interface TicketCardProps {
  id: string;
  ticketNumber: string;
  eventTitle: string;
  tierName: string;
  startsAt: string;
  venueName?: string;
  seatInfo?: string;
  status: 'valid' | 'used' | 'refunded' | 'cancelled';
  qrCodeElement?: React.ReactNode;
  showLiveClock?: boolean;
  className?: string;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  id,
  ticketNumber,
  eventTitle,
  tierName,
  startsAt,
  venueName = 'Venue TBD',
  seatInfo = 'General Admission',
  status,
  qrCodeElement,
  showLiveClock = true,
  className,
}) => {
  const [clock, setClock] = useState<string>('');

  useEffect(() => {
    if (!showLiveClock) return;
    const update = () => {
      const now = new Date();
      setClock(now.toTimeString().split(' ')[0] ?? '');
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [showLiveClock]);

  const getBadge = () => {
    switch (status) {
      case 'valid':
        return <Badge variant="success" size="sm" dot pulse>Valid Pass</Badge>;
      case 'used':
        return <Badge variant="neutral" size="sm">Checked In</Badge>;
      case 'refunded':
        return <Badge variant="warning" size="sm">Refunded</Badge>;
      case 'cancelled':
        return <Badge variant="danger" size="sm">Cancelled</Badge>;
    }
  };

  const formattedDate = () => {
    try {
      return new Date(startsAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return startsAt;
    }
  };

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '360px',
        margin: '0 auto',
        borderRadius: 'var(--radius-xl, 24px)',
        backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
        border: '1px solid var(--color-border-strong, rgba(255, 255, 255, 0.16))',
        boxShadow: 'var(--shadow-lg, 0 12px 36px rgba(0, 0, 0, 0.65))',
        overflow: 'hidden',
        color: '#FFFFFF',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          padding: '20px 24px 16px 24px',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.4) 0%, rgba(236, 72, 153, 0.2) 100%)',
          borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C4B5FD' }}>
            {tierName}
          </span>
          {getBadge()}
        </div>

        <h3 style={{ margin: 0, fontSize: 'var(--text-h3, 18px)', fontWeight: '800', fontFamily: 'var(--font-display, Outfit, sans-serif)', color: '#FFFFFF', lineHeight: 1.2 }}>
          {eventTitle}
        </h3>
      </div>

      {/* QR Code Container with High-Contrast White Presentation */}
      <div style={{ padding: '24px 20px', textAlign: 'center', backgroundColor: '#090C15' }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '12px',
            borderRadius: 'var(--radius-lg, 16px)',
            display: 'inline-block',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8)',
          }}
        >
          {qrCodeElement ?? (
            <div style={{ width: '200px', height: '200px', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '12px' }}>
              QR Pass Payload
            </div>
          )}
        </div>

        {/* Live Status Freshness Clock (Heartbeat Indicator) */}
        {showLiveClock && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-secondary, #94A3B8)' }}>
              Pass Status Active • Live Clock: {clock}
            </span>
          </div>
        )}

        <div style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', color: '#C4B5FD', fontWeight: '700' }}>
          #{ticketNumber}
        </div>
      </div>

      {/* Notch Perforations */}
      <div style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#090C15' }}>
        <div style={{ width: '16px', height: '24px', backgroundColor: 'var(--color-bg-base, #090C15)', borderTopRightRadius: '12px', borderBottomRightRadius: '12px', borderRight: '1px solid var(--color-border-strong, rgba(255, 255, 255, 0.16))' }} />
        <div style={{ flex: 1, borderTop: '2px dashed var(--color-border-strong, rgba(255, 255, 255, 0.16))', margin: '0 8px' }} />
        <div style={{ width: '16px', height: '24px', backgroundColor: 'var(--color-bg-base, #090C15)', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px', borderLeft: '1px solid var(--color-border-strong, rgba(255, 255, 255, 0.16))' }} />
      </div>

      {/* Bottom Stub Info */}
      <div style={{ padding: '16px 24px 20px 24px', backgroundColor: 'var(--color-bg-surface-elevated, #182035)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
          <div>
            <span style={{ color: 'var(--color-text-muted, #64748B)', display: 'block', fontSize: '11px' }}>Date & Time</span>
            <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{formattedDate()}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted, #64748B)', display: 'block', fontSize: '11px' }}>Location</span>
            <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{venueName}</span>
          </div>
        </div>

        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-text-secondary, #94A3B8)' }}>
          <span>{seatInfo}</span>
          <span style={{ color: '#10B981', fontWeight: '600' }}>✓ Cryptographic Signed</span>
        </div>
      </div>
    </div>
  );
};
