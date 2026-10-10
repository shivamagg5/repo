// =============================================================================
// consumer-web — TicketSelector Component
// Server-Authoritative Ticket Tier Selection, Interactive Arena Seat Map,
// Audio Micro-Haptics, and Atomic Reservation Hold Trigger
// =============================================================================
'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, useAnalytics, useTrackOnce } from '@platform/auth';
import type { TicketType } from '@platform/types';
import { soundFX } from '../../lib/soundEffects';
import { InteractiveSeatMap } from './InteractiveSeatMap';
import { WaitingRoomModal } from './WaitingRoomModal';
import { Sparkles, Map, List, ShieldCheck, Lock, AlertCircle, Users } from 'lucide-react';

interface TicketSelectorProps {
  eventId: string;
  ticketTypes: TicketType[];
  venueName?: string;
  eventName?: string;
  isHighDemand?: boolean;
}

export function TicketSelector({
  eventId,
  ticketTypes,
  venueName,
  eventName,
  isHighDemand = false,
}: TicketSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, apiClient } = useAuth();
  const { track } = useAnalytics(apiClient);

  useTrackOnce('event_view', { tierCount: ticketTypes.length }, eventId, apiClient);

  const [activeTab, setActiveTab] = useState<'tiers' | 'arena'>('arena');
  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    ticketTypes.find((t) => t.status === 'active' && t.quantity > t.soldQuantity + t.reservedQuantity)?.id ?? '',
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // High-traffic fair queue waiting room state
  const [showWaitingRoom, setShowWaitingRoom] = useState<boolean>(false);
  const [admitToken, setAdmitToken] = useState<string | null>(null);

  const selectedTier = ticketTypes.find((t) => t.id === selectedTypeId);

  const handleTierSelect = (tier: TicketType) => {
    soundFX.playSelect();
    setSelectedTypeId(tier.id);
    setQuantity(Math.max(1, tier.minPerOrder));
    setError(null);
    track('checkout_ticket_selected', { ticketTypeId: tier.id, quantity: Math.max(1, tier.minPerOrder) }, eventId);
  };

  const handleSelectTierById = (id: string) => {
    const tier = ticketTypes.find((t) => t.id === id);
    if (tier) {
      handleTierSelect(tier);
    }
  };

  const handleQuantityChange = (delta: number) => {
    if (!selectedTier) return;
    const next = quantity + delta;
    if (next >= selectedTier.minPerOrder && next <= selectedTier.maxPerOrder) {
      soundFX.playSelect();
      setQuantity(next);
      setError(null);
      track('checkout_ticket_selected', { ticketTypeId: selectedTier.id, quantity: next }, eventId);
    }
  };

  const executeReservation = async (overrideToken?: string) => {
    if (!selectedTier) return;

    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = `res_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const res = await apiClient.createReservation<any>(
        {
          ticketTypeId: selectedTier.id,
          quantity,
          admitToken: overrideToken ?? admitToken,
        },
        idempotencyKey,
      );

      if (res.data?.reservationId) {
        soundFX.playSuccess();
        router.push(`/checkout?reservationId=${encodeURIComponent(res.data.reservationId)}`);
      } else {
        soundFX.playError();
        setError('Could not complete reservation hold. Please try again.');
      }
    } catch (err: any) {
      soundFX.playError();
      setError(err?.message || 'Inventory reservation conflict. The selected tier may be sold out.');
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async () => {
    if (!selectedTier) {
      soundFX.playError();
      setError('Please select a ticket tier.');
      return;
    }

    if (!isAuthenticated) {
      // Direct user to login and return back to this event
      router.push(`/auth/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }

    // High demand drop check: if waiting room is needed and user has not passed queue yet
    if (isHighDemand && !admitToken) {
      setShowWaitingRoom(true);
      return;
    }

    await executeReservation();
  };

  const handleQueueAdmitted = (token: string) => {
    setAdmitToken(token);
    setShowWaitingRoom(false);
    executeReservation(token);
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

  const totalPriceMinor = selectedTier ? selectedTier.priceMinor * quantity : 0;

  return (
    <div className="space-y-4">
      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            soundFX.playHover();
            setActiveTab('arena');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'arena'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>Interactive Arena Map</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFX.playHover();
            setActiveTab('tiers');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'tiers'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>Ticket Tiers ({ticketTypes.length})</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="glass-surface rounded-3xl p-6 border border-purple-500/30 shadow-[var(--shadow-brand)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-white font-['Outfit']">Reserve Your Tickets</h3>
            <span className="text-[11px] text-gray-400">Instant guaranteed 10-minute hold window</span>
          </div>
          {isHighDemand ? (
            <span className="text-[11px] font-bold text-[#A3F736] bg-[#A3F736]/10 px-2.5 py-1 rounded-full border border-[#A3F736]/30 flex items-center gap-1.5 shadow-[0_0_12px_rgba(163,247,54,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A3F736] animate-ping" />
              ⚡ Fair Queue Active
            </span>
          ) : (
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Inventory
            </span>
          )}
        </div>

        {isHighDemand && (
          <div className="mb-4 bg-gradient-to-r from-[#FF2E93]/15 via-[#FF5E1E]/10 to-[#A3F736]/15 border border-[#FF2E93]/30 rounded-2xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#FF2E93]" />
              <span className="font-bold text-white text-[11px]">High-Traffic Drop Protection Enabled</span>
            </div>
            <span className="text-[10px] text-[#A3F736] font-mono font-bold tracking-wider">ANTI-BOT FAIR QUEUE</span>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-red-950/60 border border-red-800 text-red-300 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Tab 1: Interactive Arena Map */}
        {activeTab === 'arena' && (
          <div className="mb-6">
            <InteractiveSeatMap
              ticketTypes={ticketTypes}
              selectedTypeId={selectedTypeId}
              onSelectTier={handleSelectTierById}
              venueName={venueName}
            />
          </div>
        )}

        {/* Tab 2: Ticket Tiers List */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold uppercase px-1">
            <span>Pass Category</span>
            <span>Price</span>
          </div>

          {ticketTypes.map((tier) => {
            const available = tier.quantity - tier.soldQuantity - tier.reservedQuantity;
            const isSoldOut = available <= 0 || tier.status !== 'active';
            const isSelected = selectedTypeId === tier.id;

            return (
              <motion.div
                key={tier.id}
                whileHover={!isSoldOut ? { scale: 1.01 } : {}}
                whileTap={!isSoldOut ? { scale: 0.99 } : {}}
                onClick={() => !isSoldOut && handleTierSelect(tier)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSoldOut
                    ? 'opacity-40 border-gray-800 bg-gray-900/30 cursor-not-allowed'
                    : isSelected
                    ? 'border-purple-500 bg-purple-950/30 shadow-[0_0_20px_rgba(124,58,237,0.25)]'
                    : 'border-white/10 bg-white/[0.02] hover:border-purple-500/40 hover:bg-white/[0.04]'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                    <div className="absolute transform rotate-45 bg-purple-600 text-white font-black text-[9px] py-0.5 right-[-35px] top-[18px] w-[120px] text-center shadow-md">
                      SELECTED
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between pr-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-['Outfit']">{tier.name}</span>
                      {isSoldOut ? (
                        <span className="text-[10px] uppercase font-black bg-red-500/20 text-red-300 px-2 py-0.5 rounded">
                          Sold Out
                        </span>
                      ) : available <= 15 ? (
                        <span className="text-[10px] uppercase font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 animate-pulse">
                          🔥 Only {available} Left
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                          Available
                        </span>
                      )}
                    </div>
                    {tier.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 max-w-sm">{tier.description}</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-base font-black text-white font-['Outfit'] block">
                      {formatPrice(tier.priceMinor, tier.currency)}
                    </span>
                    <span className="text-[10px] text-gray-400">incl. all taxes</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Selected Tier Quantity & Real-Time Calculation */}
        <AnimatePresence>
          {selectedTier && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-purple-950/20 p-4 rounded-2xl border border-purple-500/30 mb-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-white font-['Outfit']">Ticket Quantity</span>
                  <span className="text-[11px] text-purple-300/80">
                    Max {selectedTier.maxPerOrder} tickets per attendee order
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={quantity <= selectedTier.minPerOrder || loading}
                    onClick={() => handleQuantityChange(-1)}
                    className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center font-black disabled:opacity-30 hover:bg-white/20 transition-all active:scale-90"
                  >
                    -
                  </button>
                  <span className="font-black text-base text-white w-6 text-center font-['Outfit']">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={quantity >= selectedTier.maxPerOrder || loading}
                    onClick={() => handleQuantityChange(1)}
                    className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center font-black disabled:opacity-30 hover:bg-white/20 transition-all active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Subtotal Calculation */}
              <div className="pt-3 border-t border-purple-500/20 flex items-center justify-between text-xs">
                <span className="text-gray-300">
                  Total for {quantity} ticket{quantity > 1 ? 's' : ''}:
                </span>
                <span className="font-black text-white text-base font-['Outfit']">
                  {formatPrice(totalPriceMinor, selectedTier.currency)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reserve CTA */}
        <motion.button
          type="button"
          disabled={loading || !selectedTier}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleReserve}
          className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:via-pink-500 hover:to-indigo-500 text-white font-black text-sm py-4 rounded-2xl text-center shadow-[0_0_25px_rgba(236,72,153,0.35)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Locking Guaranteed Inventory...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>
                Lock {quantity} Pass{quantity > 1 ? 'es' : ''} & Proceed ({formatPrice(totalPriceMinor, selectedTier?.currency)})
              </span>
            </>
          )}
        </motion.button>

        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            10-min Atomic DB Hold
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Instant QR Ticket
          </span>
        </div>
      </div>

      {/* High-Traffic Virtual Waiting Room & Queue Modal */}
      <WaitingRoomModal
        eventId={eventId}
        eventName={eventName ?? 'High-Demand Event'}
        isOpen={showWaitingRoom}
        onAdmitted={handleQueueAdmitted}
        onCancel={() => setShowWaitingRoom(false)}
      />
    </div>
  );
}
