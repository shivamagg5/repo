// =============================================================================
// consumer-web — TicketSelector Component
// Server-Authoritative Ticket Tier Selection & Atomic Reservation Hold Trigger
// =============================================================================
'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, useAnalytics, useTrackOnce } from '@platform/auth';
import type { TicketType } from '@platform/types';

interface TicketSelectorProps {
  eventId: string;
  ticketTypes: TicketType[];
}

export function TicketSelector({ eventId, ticketTypes }: TicketSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, apiClient } = useAuth();
  const { track } = useAnalytics(apiClient);

  useTrackOnce('event_view', { tierCount: ticketTypes.length }, eventId, apiClient);

  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    ticketTypes.find((t) => t.status === 'active' && t.quantity > t.soldQuantity + t.reservedQuantity)?.id ?? '',
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTier = ticketTypes.find((t) => t.id === selectedTypeId);

  const handleTierSelect = (tier: TicketType) => {
    setSelectedTypeId(tier.id);
    setQuantity(Math.max(1, tier.minPerOrder));
    setError(null);
    track('checkout_ticket_selected', { ticketTypeId: tier.id, quantity: Math.max(1, tier.minPerOrder) }, eventId);
  };

  const handleQuantityChange = (delta: number) => {
    if (!selectedTier) return;
    const next = quantity + delta;
    if (next >= selectedTier.minPerOrder && next <= selectedTier.maxPerOrder) {
      setQuantity(next);
      setError(null);
      track('checkout_ticket_selected', { ticketTypeId: selectedTier.id, quantity: next }, eventId);
    }
  };

  const handleReserve = async () => {
    if (!selectedTier) {
      setError('Please select a ticket tier.');
      return;
    }

    if (!isAuthenticated) {
      // Direct user to login and return back to this event
      router.push(`/auth/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = `res_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const res = await apiClient.createReservation<any>(
        {
          ticketTypeId: selectedTier.id,
          quantity,
        },
        idempotencyKey,
      );

      if (res.data?.reservationId) {
        router.push(`/checkout?reservationId=${encodeURIComponent(res.data.reservationId)}`);
      } else {
        setError('Could not complete reservation hold. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Inventory reservation conflict. The selected tier may be sold out.');
    } finally {
      setLoading(false);
    }
  };

  if (!ticketTypes || ticketTypes.length === 0) {
    return (
      <div className="glass-surface rounded-3xl p-6 border border-gray-800 text-center">
        <span className="inline-block bg-purple-500/10 text-purple-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2">
          Ticketing
        </span>
        <h3 className="text-lg font-bold text-white mb-2">Tickets Opening Soon</h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          Ticket sales and reservations for this event will launch shortly.
        </p>
      </div>
    );
  }

  const formatPrice = (minor: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'INR' ? 'INR' : currency,
      maximumFractionDigits: 0,
    }).format(minor / 100);
  };

  return (
    <div className="glass-surface rounded-3xl p-6 border border-purple-500/30 shadow-[var(--shadow-brand)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Select Tickets</h3>
        <span className="text-xs text-purple-400 font-medium">Instant 10-Min Hold</span>
      </div>

      {error && (
        <div className="mb-4 bg-red-950/50 border border-red-800 text-red-300 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Ticket Tiers List */}
      <div className="space-y-3 mb-6">
        {ticketTypes.map((tier) => {
          const available = tier.quantity - tier.soldQuantity - tier.reservedQuantity;
          const isSoldOut = available <= 0 || tier.status !== 'active';
          const isSelected = selectedTypeId === tier.id;

          return (
            <div
              key={tier.id}
              onClick={() => !isSoldOut && handleTierSelect(tier)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                isSoldOut
                  ? 'opacity-50 border-gray-800 bg-gray-900/40 cursor-not-allowed'
                  : isSelected
                  ? 'border-purple-500 bg-purple-950/20 shadow-sm'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{tier.name}</span>
                    {isSoldOut ? (
                      <span className="text-[10px] uppercase font-bold bg-red-500/20 text-red-300 px-2 py-0.5 rounded">
                        Sold Out
                      </span>
                    ) : available <= 10 ? (
                      <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                        Only {available} Left
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                        Available
                      </span>
                    )}
                  </div>
                  {tier.description && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2">{tier.description}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-base font-extrabold text-white">
                    {formatPrice(tier.priceMinor, tier.currency)}
                  </span>
                  <span className="block text-[10px] text-[var(--color-text-muted)]">per ticket</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quantity Selector */}
      {selectedTier && (
        <div className="bg-[var(--color-surface)] p-3.5 rounded-2xl border border-[var(--color-border)] mb-6 flex items-center justify-between">
          <div>
            <span className="block text-xs font-semibold text-white">Quantity</span>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Max {selectedTier.maxPerOrder} tickets
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={quantity <= selectedTier.minPerOrder || loading}
              onClick={() => handleQuantityChange(-1)}
              className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 text-white flex items-center justify-center font-bold disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              -
            </button>
            <span className="font-extrabold text-sm text-white w-6 text-center">{quantity}</span>
            <button
              type="button"
              disabled={quantity >= selectedTier.maxPerOrder || loading}
              onClick={() => handleQuantityChange(1)}
              className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 text-white flex items-center justify-center font-bold disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Reserve CTA */}
      <button
        type="button"
        disabled={loading || !selectedTier}
        onClick={handleReserve}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm py-3.5 rounded-xl text-center shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Locking Tickets...</span>
          </>
        ) : (
          <span>🎟️ Lock Tickets & Proceed to Checkout</span>
        )}
      </button>

      <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] text-center space-y-1">
        <p>✓ 100% Server-Verified Inventory Hold</p>
        <p>🔒 256-Bit Encrypted Razorpay Checkout</p>
      </div>
    </div>
  );
}
