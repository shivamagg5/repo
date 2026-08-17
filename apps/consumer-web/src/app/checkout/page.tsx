// =============================================================================
// consumer-web — Checkout Page
// 3-Step Checkout Progress, Server-Authoritative 10-Min Hold, and Razorpay Flow
// =============================================================================
'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useAnalytics } from '@platform/auth';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { Button, Card, Badge } from '@platform/ui';
import type { ReservationDto, Order } from '@platform/types';

declare global {
  interface Window {
    Razorpay?: any;
  }
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

  // Synchronized Server Countdown Timer (uses reservation.expiresAt)
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

  const handleCancelHold = async () => {
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

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please refresh the page.');
      }

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
          // Razorpay client callback — triggers server reconciliation & verification
          try {
            const confirmRes = await apiClient.confirmOrderPayment<{ order: Order }>(order.id);
            if (confirmRes.data?.order?.status === 'paid' || confirmRes.data?.order?.status === 'completed') {
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
        track('payment_failed', { reason: response?.error?.description ?? 'declined' }, eventId);
        setError(response?.error?.description || 'Payment was declined or cancelled.');
      });
      rzp.open();
    } catch (err: any) {
      setPaying(false);
      track('payment_failed', { reason: err?.message ?? 'intent_error' }, eventId);
      setError(err?.message || 'Could not initiate payment. Please try again.');
    }
  };

  const formatPrice = (minor: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'INR' ? 'INR' : currency,
    }).format(minor / 100);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#090C15] text-[#F8FAFC] flex flex-col justify-between">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-3xl flex-1">
        {/* --- 3-STEP CHECKOUT STEPPER --- */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link href="/events" className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5 font-medium">
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
            <p className="text-sm text-[var(--color-text-secondary)] font-['Inter']">Verifying your guaranteed ticket hold...</p>
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
            {/* Live Server Countdown Banner */}
            <div className="bg-gradient-to-r from-purple-950/50 via-indigo-950/40 to-[#111625] border border-purple-800/60 rounded-2xl p-4 flex items-center justify-between shadow-[var(--shadow-brand)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/25 border border-purple-500/40 flex items-center justify-center text-purple-300 text-lg">
                  🔒
                </div>
                <div>
                  <span className="block text-sm font-bold text-white font-['Outfit']">Tickets Held Exclusively For You</span>
                  <span className="text-xs text-[var(--color-text-secondary)] font-['Inter']">Complete payment before timer releases inventory</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-2xl font-black text-purple-300">
                  {remainingSeconds !== null ? formatTimer(remainingSeconds) : '--:--'}
                </span>
                <span className="block text-[10px] text-gray-400 font-semibold uppercase">Hold Window</span>
              </div>
            </div>

            {/* Order Summary Card */}
            <Card variant="elevated" padding="lg">
              <h2 className="text-xl font-bold text-white mb-4 font-['Outfit']">Order Breakdown</h2>

              <div className="space-y-3 pb-6 border-b border-[var(--color-border)] text-sm font-['Inter']">
                <div className="flex justify-between text-gray-200">
                  <span>Reserved Tier Tickets ({reservation?.quantity}x)</span>
                  <span className="font-semibold text-white">
                    {formatPrice(reservation?.subtotalMinor || 0, reservation?.currency)}
                  </span>
                </div>

                <div className="flex justify-between text-[var(--color-text-muted)] text-xs">
                  <span>Convenience Fee</span>
                  <span>{formatPrice(reservation?.feesMinor || 0, reservation?.currency)}</span>
                </div>

                <div className="flex justify-between text-[var(--color-text-muted)] text-xs">
                  <span>GST Taxes</span>
                  <span>₹0.00</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center text-lg font-extrabold text-white mb-6">
                <span className="font-['Outfit']">Total Payable</span>
                <span className="text-2xl text-purple-400 font-['Outfit']">
                  {formatPrice(reservation?.totalMinor || 0, reservation?.currency)}
                </span>
              </div>

              {/* Attendee Confirmation */}
              <div className="bg-[#182035] p-4 rounded-xl border border-[var(--color-border)] mb-6 text-xs text-[var(--color-text-secondary)] flex items-center justify-between">
                <div>
                  <span className="block text-white font-semibold mb-0.5">Purchaser Account</span>
                  <span className="font-mono">{user?.email}</span>
                </div>
                <Badge variant="success" size="sm" dot>
                  Verified Session
                </Badge>
              </div>

              {/* Payment Action Button */}
              <Button
                variant="brand-glow"
                size="lg"
                fullWidth
                disabled={paying || isExpired}
                loading={paying}
                onClick={handleRazorpayPayment}
              >
                🔒 Complete Payment ({formatPrice(reservation?.totalMinor || 0, reservation?.currency)})
              </Button>

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
