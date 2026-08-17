// =============================================================================
// consumer-web — Orders History Page
// Displays all past & active orders for the authenticated consumer
// =============================================================================
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@platform/auth';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { Card, Badge, Button, EmptyState } from '@platform/ui';
import type { Order } from '@platform/types';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, status, apiClient } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.listUserOrders<Order[]>();
      if (res.data) {
        setOrders(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load order history.');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login?redirectTo=/orders');
      return;
    }
    if (status === 'authenticated') {
      loadOrders();
    }
  }, [status, loadOrders, router]);

  const formatPrice = (minor: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'INR' ? 'INR' : currency,
      maximumFractionDigits: 0,
    }).format(minor / 100);
  };

  const getStatusBadge = (orderStatus: string) => {
    switch (orderStatus) {
      case 'paid':
      case 'completed':
        return <Badge variant="success" size="sm" dot>Paid</Badge>;
      case 'created':
      case 'payment_pending':
      case 'pending':
        return <Badge variant="warning" size="sm" dot pulse>Pending</Badge>;
      case 'cancelled':
      case 'expired':
        return <Badge variant="neutral" size="sm">Cancelled</Badge>;
      case 'refunded':
        return <Badge variant="danger" size="sm">Refunded</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{orderStatus}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#090C15] text-[#F8FAFC] flex flex-col justify-between">
      <Navbar />

      <main className="container mx-auto px-4 py-10 max-w-4xl flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-['Outfit']">Order History</h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-['Inter']">
              Review your ticket purchases, transactions, and payment receipts
            </p>
          </div>
          <Link href="/tickets">
            <Button variant="ghost" size="sm">
              🎟️ My Ticket Wallet →
            </Button>
          </Link>
        </div>

        {loading ? (
          <Card variant="default" padding="lg" className="text-center">
            <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-[var(--color-text-secondary)] font-['Inter']">Loading your orders...</p>
          </Card>
        ) : error ? (
          <Card variant="bordered" padding="lg" className="text-center border-red-800/40">
            <p className="text-sm text-red-400 mb-4">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => loadOrders()}>
              Retry
            </Button>
          </Card>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<span>🧾</span>}
            title="No Orders Yet"
            description="You have not placed any ticket orders yet. Explore upcoming concerts, festivals, and live experiences!"
            action={
              <Link href="/events">
                <Button variant="brand-glow" size="md">
                  Explore Live Events →
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {orders.map((ord) => (
              <Card
                key={ord.id}
                variant="elevated"
                padding="md"
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 font-['Inter']">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-white">#{ord.id.slice(0, 8)}</span>
                    {getStatusBadge(ord.status)}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Ordered on {new Date(ord.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]">
                  <div className="text-left sm:text-right">
                    <span className="block text-lg font-bold text-white font-['Outfit']">
                      {formatPrice(ord.totalMinor, ord.currency)}
                    </span>
                    <span className="block text-[11px] text-[var(--color-text-muted)]">Total Amount</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/orders/${encodeURIComponent(ord.id)}`}>
                      <Button variant="secondary" size="sm">
                        Receipt
                      </Button>
                    </Link>
                    {(ord.status === 'paid' || ord.status === 'completed') && (
                      <Link href="/tickets">
                        <Button variant="primary" size="sm">
                          Tickets
                        </Button>
                      </Link>
                    )}
                  </div>
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
