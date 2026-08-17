// =============================================================================
// consumer-web — Order Detail & Receipt Page
// Immutable Historical Price Snapshot & Payment Record
// =============================================================================
'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@platform/auth';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';
import { Card, Badge, Button } from '@platform/ui';
import type { Order, OrderItem } from '@platform/types';

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const router = useRouter();
  const { isAuthenticated, status, apiClient } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getOrder<{ order: Order; items: OrderItem[] }>(orderId);
      if (res.data) {
        setOrder(res.data.order);
        setItems(res.data.items || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load order receipt.');
    } finally {
      setLoading(false);
    }
  }, [apiClient, orderId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/auth/login?redirectTo=/orders/${encodeURIComponent(orderId)}`);
      return;
    }
    if (status === 'authenticated') {
      loadOrder();
    }
  }, [status, loadOrder, router, orderId]);

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

      <main className="container mx-auto px-4 py-10 max-w-2xl flex-1">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/orders" className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 font-medium">
            ← Back to Order History
          </Link>
          {isPaid && (
            <Link href="/tickets">
              <Button variant="ghost" size="sm">
                🎟️ View Issued Tickets →
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <Card variant="default" padding="lg" className="text-center">
            <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-[var(--color-text-secondary)] font-['Inter']">Loading order receipt...</p>
          </Card>
        ) : error || !order ? (
          <Card variant="bordered" padding="lg" className="text-center border-red-800/40">
            <h2 className="text-xl font-bold text-white mb-2 font-['Outfit']">Order Not Found</h2>
            <p className="text-sm text-gray-400 mb-6 font-['Inter']">{error || 'Could not locate this order.'}</p>
            <Link href="/orders">
              <Button variant="primary" size="md">
                Return to Orders
              </Button>
            </Link>
          </Card>
        ) : (
          <Card variant="elevated" padding="lg" className="shadow-2xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--color-border)] gap-4 mb-6">
              <div>
                <span className="text-xs uppercase font-bold text-purple-400 font-mono">Official Order Receipt</span>
                <h1 className="text-xl font-black text-white mt-1 font-['Outfit']">Order #{order.id}</h1>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 font-['Inter']">
                  Placed on {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              {isPaid ? (
                <Badge variant="success" size="md" dot>
                  Paid & Issued
                </Badge>
              ) : (
                <Badge variant="warning" size="md" dot pulse>
                  {order.status}
                </Badge>
              )}
            </div>

            {/* Purchased Items List */}
            <div className="space-y-3 mb-6 pb-6 border-b border-[var(--color-border)]">
              <h2 className="text-xs font-bold uppercase text-[var(--color-text-muted)] tracking-wider font-mono">Purchased Items</h2>
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-[#182035] p-3.5 rounded-xl border border-[var(--color-border)] text-sm font-['Inter']">
                  <div>
                    <span className="font-semibold text-white block">Standard Event Entry</span>
                    <span className="text-xs text-[var(--color-text-muted)]">Qty: {item.quantity} × {formatPrice(item.unitPriceMinor, order.currency)}</span>
                  </div>
                  <span className="font-bold text-white">{formatPrice(item.totalMinor, order.currency)}</span>
                </div>
              ))}
            </div>

            {/* Authoritative Price Snapshot */}
            <div className="space-y-2.5 pb-6 border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] font-['Inter']">
              <div className="flex justify-between">
                <span>Ticket Subtotal</span>
                <span className="text-white font-medium">{formatPrice(order.subtotalMinor, order.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fees</span>
                <span className="text-white font-medium">{formatPrice(order.feesMinor, order.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & GST</span>
                <span className="text-white font-medium">{formatPrice(order.taxMinor, order.currency)}</span>
              </div>
              {order.discountMinor > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Promotional Discount</span>
                  <span>-{formatPrice(order.discountMinor, order.currency)}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="pt-4 flex justify-between items-center mb-8">
              <span className="font-extrabold text-base text-white font-['Outfit']">Total Amount Paid</span>
              <span className="text-2xl font-black text-purple-400 font-['Outfit']">
                {formatPrice(order.totalMinor, order.currency)}
              </span>
            </div>

            {/* Actions */}
            {isPaid && (
              <div className="flex justify-end gap-3">
                <Link href="/tickets" className="w-full sm:w-auto">
                  <Button variant="brand-glow" size="lg" fullWidth>
                    🎟️ Access Tickets in Wallet →
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
