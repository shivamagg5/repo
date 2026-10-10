// =============================================================================
// consumer-web — Checkout Page
// 3-Step Checkout Progress, Server-Authoritative 10-Min Hold, Circular Gauge,
// Promo Codes, Audio Micro-Haptics, and Razorpay Flow
// =============================================================================
'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, useAnalytics } from '@platform/auth';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { Button, Card, Badge } from '@platform/ui';
import type { ReservationDto, Order } from '@platform/types';
import { soundFX } from '../../lib/soundEffects';
import { ShieldCheck, Tag, Sparkles, Check, AlertCircle, Clock } from 'lucide-react';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function HoldCountdownRing({
  remainingSeconds,
  totalSeconds = 600,
}: {
  remainingSeconds: number | null;
  totalSeconds?: number;
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const currentSecs = remainingSeconds ?? totalSeconds;
  const progress = Math.max(0, Math.min(1, currentSecs / totalSeconds));
  const strokeDashoffset = circumference - progress * circumference;

  const isUrgent = currentSecs <= 120;
  const isWarning = currentSecs > 120 && currentSecs <= 300;

  const strokeColor = isUrgent ? '#EF4444' : isWarning ? '#F59E0B' : '#A855F7';

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
        <svg className="w-16 h-16 transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="3.5"
            fill="transparent"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-linear"
            style={{
              filter: isUrgent ? 'drop-shadow(0 0 6px #EF4444)' : undefined,
            }}
          />
        </svg>
        <span
          className={`absolute text-xs font-mono font-black ${
            isUrgent ? 'text-red-400 animate-pulse' : 'text-purple-200'
          }`}
        >
          {remainingSeconds !== null ? formatTimer(remainingSeconds) : '--:--'}
        </span>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-red-400 animate-ping' : 'text-purple-400'}`} />
          <span className="text-xs font-bold text-white uppercase tracking-wider font-['Outfit']">
            {isUrgent ? 'Expiring Soon!' : 'Guaranteed Hold'}
          </span>
        </div>
        <span className="text-[11px] text-gray-400 block mt-0.5">
          {isUrgent ? 'Under 2 minutes remaining' : 'Inventory locked exclusively'}
        </span>
      </div>
    </div>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('reservationId');

  const { isAuthenticated, status, apiClient, user } = useAuth();
  const { track } = useAnalytics(apiClient);

  const [reservation, setReservation] = useState<ReservationDto | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Promo code support
  const [promoInput, setPromoInput] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountMinor: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  // Load Razorpay standard script
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.getElementById('razorpay-checkout-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch reservation and associated order
  const loadReservation = useCallback(async () => {
    if (!reservationId) {
      setError('No reservation ID provided.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.getReservation<ReservationDto>(reservationId);
      if (!res.data) {
        setError('Reservation not found.');
        return;
      }

      setReservation(res.data);
      track('checkout_started', { quantity: res.data.quantity, totalMinor: res.data.totalMinor });

      // Fetch order details if available
      if (res.data.orderId) {
        const orderRes = await apiClient.getOrder<{ order: Order }>(res.data.orderId);
        if (orderRes.data?.order) {
          setOrder(orderRes.data.order);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load reservation details.');
    } finally {
      setLoading(false);
    }
  }, [apiClient, reservationId, track]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/auth/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (status === 'authenticated') {
      loadReservation();
    }
  }, [status, loadReservation, router]);

  // Synchronized Server Countdown Timer
  useEffect(() => {
    if (!reservation?.expiresAt) return;

    const calculateTimeRemaining = () => {
      const expiryMs = new Date(reservation.expiresAt).getTime();
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((expiryMs - nowMs) / 1000));

      setRemainingSeconds(diffSecs);
      if (diffSecs <= 0) {
        setIsExpired(true);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [reservation]);

  const handleApplyPromo = () => {
    soundFX.playSelect();
    const code = promoInput.trim().toUpperCase();
    setPromoError(null);
    setPromoSuccess(null);

    if (!code) {
      setPromoError('Please enter a promo code');
      soundFX.playError();
      return;
    }

    // Supported festival & referral promo codes
    const validCodes: Record<string, number> = {
      PULSR10: 10,
      VIP2026: 15,
      EARLYBIRD: 10,
      APEX20: 20,
    };

    if (code in validCodes) {
      const percentage = validCodes[code]!;
      const subtotal = reservation?.subtotalMinor || 0;
      const discountMinor = Math.round((subtotal * percentage) / 100);
      setAppliedPromo({ code, discountMinor });
      setPromoSuccess(`Code ${code} applied! ${percentage}% discount unlocked.`);
      soundFX.playSuccess();
    } else {
      setPromoError('Invalid or expired promo code');
      soundFX.playError();
    }
  };

  const handleCancelHold = async () => {
    soundFX.playSelect();
    if (!reservationId) return;
    try {
      await apiClient.cancelReservation(reservationId);
      router.replace('/events');
    } catch {
      router.replace('/events');
    }
  };

  const handleRazorpayPayment = async () => {
    if (!reservation || !order || isExpired) return;

    soundFX.playSelect();
    setPaying(true);
    setError(null);

    const eventId = (order as any)?.eventId ?? (order as any)?.items?.[0]?.eventId;

    try {
      // Step 1: Create Payment Intent on backend
      const idempotencyKey = `pay_${order.id}_${Date.now()}`;
      const intentRes = await apiClient.createPaymentIntent<any>(
        {
          orderId: order.id,
          provider: 'razorpay',
        },
        idempotencyKey,
      );

      const intent = intentRes.data;
      if (!intent || !intent.providerOrderId) {
        throw new Error('Failed to initialize payment gateway.');
      }

      track('payment_started', { provider: 'razorpay' }, eventId);

      // Step 2: Configure Razorpay Checkout Options
      const razorpayKey = process.env['NEXT_PUBLIC_RAZORPAY_KEY_ID'] || 'rzp_test_placeholder';

      if (window.Razorpay && razorpayKey !== 'rzp_test_placeholder') {
        const options = {
          key: razorpayKey,
          amount: intent.amountMinor,
          currency: intent.currency || 'INR',
          name: 'EventPlatform Tickets',
          description: `Order #${order.id.slice(0, 8)}`,
          order_id: intent.providerOrderId,
          prefill: {
            email: user?.email || '',
          },
          theme: {
            color: '#7C3AED',
          },
          handler: async function (response: any) {
            try {
              const confirmRes = await apiClient.confirmOrderPayment<{ order: Order }>(order.id);
              if (confirmRes.data?.order?.status === 'paid' || confirmRes.data?.order?.status === 'completed') {
                soundFX.playSuccess();
                track('payment_success', { status: confirmRes.data.order.status }, eventId);
                router.push(`/checkout/confirmation/${encodeURIComponent(order.id)}`);
              } else {
                router.push(`/checkout/confirmation/${encodeURIComponent(order.id)}?pending=true`);
              }
            } catch {
              router.push(`/checkout/confirmation/${encodeURIComponent(order.id)}?pending=true`);
            }
          },
          modal: {
            ondismiss: function () {
              setPaying(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          setPaying(false);
          soundFX.playError();
          track('payment_failed', { reason: response?.error?.description ?? 'declined' }, eventId);
          setError(response?.error?.description || 'Payment was declined or cancelled.');
        });
        rzp.open();
        return;
      }

      // Test/Demo fallback: Confirm order payment directly through backend API
      const confirmRes = await apiClient.confirmOrderPayment<{ order: Order }>(order.id);
      if (confirmRes.data?.order?.status === 'paid' || confirmRes.data?.order?.status === 'completed') {
        soundFX.playSuccess();
        track('payment_success', { status: confirmRes.data.order.status, simulated: true }, eventId);
        router.push(`/checkout/confirmation/${encodeURIComponent(order.id)}`);
      } else {
        router.push(`/checkout/confirmation/${encodeURIComponent(order.id)}?pending=true`);
      }
    } catch (err: any) {
      setPaying(false);
      soundFX.playError();
      track('payment_failed', { reason: err?.message ?? 'intent_error' }, eventId);
      setError(err?.message || 'Could not initiate payment. Please try again.');
    }
  };

  const formatPrice = (minor: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'INR' ? 'INR' : currency,
      maximumFractionDigits: 0,
    }).format(minor / 100);
  };

  const finalTotalMinor = Math.max(
    0,
    (reservation?.totalMinor || 0) - (appliedPromo?.discountMinor || 0),
  );

  return (
    <div className="min-h-screen bg-[#090C15] text-[#F8FAFC] flex flex-col justify-between">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-3xl flex-1">
        {/* --- 3-STEP CHECKOUT STEPPER --- */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/events"
              onClick={() => soundFX.playSelect()}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5 font-medium"
            >
              ← Back to Event
            </Link>
            <Badge variant="brand" size="sm">
              Step 2 of 3: Guaranteed Hold & Payment
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="h-1.5 rounded-full bg-purple-600"></div>
            <div className="h-1.5 rounded-full bg-purple-600 shadow-[0_0_8px_rgba(124,58,237,0.6)]"></div>
            <div className="h-1.5 rounded-full bg-[#182035]"></div>
          </div>
        </div>

        {loading ? (
          <Card variant="default" padding="lg" className="text-center">
            <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-[var(--color-text-secondary)] font-['Inter']">
              Verifying your guaranteed ticket hold...
            </p>
          </Card>
        ) : error ? (
          <Card variant="bordered" padding="lg" className="text-center border-red-800/40">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-600 flex items-center justify-center mx-auto mb-4 text-red-400">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-white mb-2 font-['Outfit']">Reservation Error</h2>
            <p className="text-sm text-gray-400 mb-6 font-['Inter']">{error}</p>
            <Link href="/events">
              <Button variant="primary" size="md">
                Browse Live Events
              </Button>
            </Link>
          </Card>
        ) : isExpired ? (
          <Card variant="bordered" padding="lg" className="text-center border-amber-800/40">
            <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-600 flex items-center justify-center mx-auto mb-4 text-amber-400">
              ⏱️
            </div>
            <h2 className="text-xl font-bold text-white mb-2 font-['Outfit']">10-Minute Hold Expired</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto font-['Inter']">
              Your guaranteed ticket hold has expired and tickets were returned to general availability.
            </p>
            <Link href="/events">
              <Button variant="brand-glow" size="md">
                Select New Tickets →
              </Button>
            </Link>
          </Card>
        ) : (
          /* Active Checkout View */
          <div className="space-y-6">
            {/* Live Server Countdown Banner with Circular Ring */}
            <div className="bg-gradient-to-r from-purple-950/50 via-indigo-950/40 to-[#111625] border border-purple-800/60 rounded-3xl p-5 flex items-center justify-between shadow-[var(--shadow-brand)]">
              <HoldCountdownRing remainingSeconds={remainingSeconds} totalSeconds={600} />
              <div className="hidden sm:block text-right">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Security Protocol</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 justify-end">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Inventory Locked
                </span>
              </div>
            </div>

            {/* Order Summary Card */}
            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-white font-['Outfit']">Order Summary</h2>
                <Badge variant="brand" size="sm">
                  {reservation?.quantity} Pass{reservation?.quantity && reservation.quantity > 1 ? 'es' : ''}
                </Badge>
              </div>

              <div className="space-y-3 pb-6 border-b border-[var(--color-border)] text-sm font-['Inter']">
                <div className="flex justify-between text-gray-200">
                  <span>Reserved Tickets ({reservation?.quantity}x)</span>
                  <span className="font-semibold text-white">
                    {formatPrice(reservation?.subtotalMinor || 0, reservation?.currency)}
                  </span>
                </div>

                <div className="flex justify-between text-[var(--color-text-muted)] text-xs">
                  <span>Convenience Fee</span>
                  <span>{formatPrice(reservation?.feesMinor || 0, reservation?.currency)}</span>
                </div>

                {appliedPromo && (
                  <div className="flex justify-between text-emerald-400 text-xs font-semibold">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      Promo Discount ({appliedPromo.code})
                    </span>
                    <span>-{formatPrice(appliedPromo.discountMinor, reservation?.currency)}</span>
                  </div>
                )}

                <div className="flex justify-between text-[var(--color-text-muted)] text-xs">
                  <span>GST & Service Taxes</span>
                  <span>₹0.00</span>
                </div>
              </div>

              {/* Promo Code Entry Accordion */}
              <div className="py-4 border-b border-[var(--color-border)]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Enter Promo or Referral Code (e.g. PULSR10)"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 uppercase tracking-wider font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    Apply
                  </button>
                </div>
                {promoError && (
                  <p className="text-[11px] text-red-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {promoError}
                  </p>
                )}
                {promoSuccess && (
                  <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {promoSuccess}
                  </p>
                )}
              </div>

              {/* Total Payable */}
              <div className="pt-4 flex justify-between items-center text-lg font-extrabold text-white mb-6">
                <div>
                  <span className="font-['Outfit'] block">Total Payable</span>
                  <span className="text-[10px] text-gray-400 font-normal">All taxes included</span>
                </div>
                <span className="text-3xl text-purple-400 font-['Outfit'] font-black">
                  {formatPrice(finalTotalMinor, reservation?.currency)}
                </span>
              </div>

              {/* Attendee Confirmation */}
              <div className="bg-[#182035] p-4 rounded-2xl border border-[var(--color-border)] mb-6 text-xs text-[var(--color-text-secondary)] flex items-center justify-between">
                <div>
                  <span className="block text-white font-semibold mb-0.5">Purchaser Account</span>
                  <span className="font-mono text-purple-300">{user?.email}</span>
                </div>
                <Badge variant="success" size="sm" dot>
                  Verified Session
                </Badge>
              </div>

              {(!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID === 'rzp_test_placeholder') && (
                <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <span>⚡</span> Sandbox Gateway Mode
                  </div>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    Test gateway placeholder is active. In production, configure <code className="bg-amber-950 px-1 py-0.5 rounded text-amber-200">NEXT_PUBLIC_RAZORPAY_KEY_ID</code>.
                  </p>
                </div>
              )}

              {/* Payment Action Button */}
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  variant="brand-glow"
                  size="lg"
                  fullWidth
                  disabled={paying || isExpired}
                  loading={paying}
                  onClick={handleRazorpayPayment}
                  className="py-4 text-base font-black rounded-2xl shadow-[0_0_25px_rgba(124,58,237,0.4)]"
                >
                  🔒 Pay {formatPrice(finalTotalMinor, reservation?.currency)} with Razorpay
                </Button>
              </motion.div>

              <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-text-muted)] font-['Inter']">
                <button
                  type="button"
                  onClick={handleCancelHold}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Cancel Hold & Release Tickets
                </button>
                <span>256-Bit SSL Encrypted Gateway</span>
              </div>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090C15] flex items-center justify-center text-gray-400 font-['Inter']">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
