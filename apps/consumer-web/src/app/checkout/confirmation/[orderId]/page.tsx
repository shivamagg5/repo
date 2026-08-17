// =============================================================================
// consumer-web — Order Confirmation Page
// Authoritative Confirmation of Paid Order, Ticket Issuance, & Delayed Webhook Polling
// =============================================================================
'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@platform/auth';
import { Navbar } from '../../../../components/Navbar';
import { Footer } from '../../../../components/Footer';
import { Card, Badge, Button, Spinner } from '@platform/ui';
import type { Order, OrderItem } from '@platform/types';

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;
  const searchParams = useSearchParams();

  const router = useRouter();
  const { isAuthenticated, status, apiClient } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      const res = await apiClient.getOrder<{ order: Order; items: OrderItem[] }>(orderId);
      if (res.data) {
        setOrder(res.data.order);
        setItems(res.data.items || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve order confirmation details.');
    } finally {
      setLoading(false);
    }
  }, [apiClient, orderId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/auth/login?redirectTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (status === 'authenticated') {
      loadOrder();
    }
  }, [status, loadOrder, router]);

  // Delayed Webhook Auto-Polling: If order is still 'pending', poll every 2.5 seconds (up to 5 times)
  useEffect(() => {
    if (!order || order.status === 'paid' || order.status === 'completed') return;

    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount > 5) {
        clearInterval(interval);
        return;
      }
      try {
        const res = await apiClient.getOrder<{ order: Order; items: OrderItem[] }>(orderId);
        if (res.data?.order?.status === 'paid' || res.data?.order?.status === 'completed') {
          setOrder(res.data.order);
          setItems(res.data.items || []);
          clearInterval(interval);
        }
      } catch {
        // silent retry
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [order, apiClient, orderId]);

  const formatPrice = (minor: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'INR' ? 'INR' : currency,
      maximumFractionDigits: 0,
    }).format(minor / 100);
  };

  const isPaid = order?.status === 'paid' || order?.status === 'completed';

  return (
    <div className="min-h-screen bg-[#090C15] text-[#F8FAFC] flex flex-col justify-between">
      <Navbar />

      <main className="container mx-auto px-4 py-12 max-w-2xl flex-1">
        {loading ? (
          <Card variant="default" padding="lg" className="text-center">
            <Spinner size={36} className="mx-auto mb-4" />
            <p className="text-sm text-[var(--color-text-secondary)] font-['Inter']">Verifying payment with gateway...</p>
          </Card>
        ) : error ? (
          <Card variant="bordered" padding="lg" className="text-center border-red-800/40">
            <h2 className="text-xl font-bold text-white mb-2 font-['Outfit']">Confirmation Notice</h2>
            <p className="text-sm text-gray-400 mb-6 font-['Inter']">{error}</p>
            <Link href="/tickets">
              <Button variant="primary" size="md">
                Check My Tickets
              </Button>
            </Link>
          </Card>
        ) : (
          <Card variant="elevated" padding="lg" className="text-center shadow-2xl">
            {isPaid ? (
              <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500 flex items-center justify-center mx-auto mb-5 text-emerald-400 text-3xl shadow-lg shadow-emerald-950/50">
                ✓
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-amber-950/80 border border-amber-500 flex items-center justify-center mx-auto mb-5 text-amber-400 text-3xl shadow-lg shadow-amber-950/50">
                ⏳
              </div>
            )}

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-2 font-['Outfit']">
              {isPaid ? 'Payment Confirmed & Tickets Issued!' : 'Payment Reconciling with Gateway'}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto font-['Inter']">
              {isPaid
                ? 'Your order has been verified and your digital passes are ready in your wallet.'
                : 'Your payment intent is being reconciled with the gateway. Your tickets will be issued automatically.'}
            </p>

            {/* Order Details Card */}
            <div className="bg-[#182035] rounded-2xl p-6 border border-[var(--color-border)] text-left mb-8 space-y-3 text-sm font-['Inter']">
              <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Order Reference</span>
                <span className="font-mono font-bold text-white text-xs">{order?.id}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Order Status</span>
                {isPaid ? (
                  <Badge variant="success" size="sm" dot>
                    Paid / Confirmed
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm" dot pulse>
                    Reconciling
                  </Badge>
                )}
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Total Amount</span>
                <span className="font-bold text-purple-300 text-lg font-['Outfit']">
                  {formatPrice(order?.totalMinor || 0, order?.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)]">
                <span>Timestamp</span>
                <span>{order?.createdAt ? new Date(order.createdAt).toLocaleString() : 'Just now'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/tickets">
                <Button variant="brand-glow" size="lg">
                  🎟️ View My Tickets & QR →
                </Button>
              </Link>
              <Link href={`/orders/${encodeURIComponent(orderId)}`}>
                <Button variant="secondary" size="lg">
                  View Receipt
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
