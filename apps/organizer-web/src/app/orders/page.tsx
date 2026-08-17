'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '../../components/DashboardLayout';
import { apiClient, ApiError } from '../../lib/api';
import type { Event, OrganizerOrderDto } from '@platform/types';

export default function OrdersPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [orders, setOrders] = useState<OrganizerOrderDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch organizer events list for selector
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setError(null);
    try {
      const res = await apiClient.getOrganizerEvents<{ items: Event[]; nextCursor: string | null; hasMore: boolean }>();
      const list = res.data.items ?? [];
      setEvents(list);
      if (list.length > 0 && !selectedEventId) {
        setSelectedEventId(list[0]!.id);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load organizer events for orders.');
      } else {
        setError(err?.message || 'Error occurred while loading events.');
      }
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch orders for currently selected event (lazy loaded)
  const fetchOrdersForEvent = useCallback(async (eventId: string) => {
    if (!eventId) return;
    setLoadingOrders(true);
    setError(null);
    try {
      const res = await apiClient.getOrganizerEventOrders<OrganizerOrderDto[]>(eventId, { limit: '50' });
      setOrders(res.data ?? []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load orders for the selected event.');
      } else {
        setError(err?.message || 'Network error occurred while fetching orders.');
      }
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchOrdersForEvent(selectedEventId);
    }
  }, [selectedEventId, fetchOrdersForEvent]);

  const filteredOrders = orders.filter((ord) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ord.orderId.toLowerCase().includes(q) ||
      (ord.purchaserEmail?.toLowerCase().includes(q) ?? false) ||
      (ord.purchaserName?.toLowerCase().includes(q) ?? false) ||
      (ord.promoterCode?.toLowerCase().includes(q) ?? false)
    );
  });

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'tickets_issued':
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'payment_pending':
      case 'created':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'cancelled':
      case 'payment_failed':
      case 'expired':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <DashboardLayout title="Orders & Attendees" subtitle="Paginated PII-sanitized order list and purchaser details">
      <div className="space-y-4">
        {/* Controls & Filter Bar */}
        <div className="flex flex-wrap justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Event Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Event:</span>
              {loadingEvents ? (
                <div className="w-48 h-8 bg-slate-800 rounded-lg animate-pulse" />
              ) : events.length === 0 ? (
                <span className="text-xs text-slate-500 font-italic">No events available</span>
              ) : (
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500 max-w-xs font-semibold"
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order ID, email, or promoter..."
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500 w-64"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Orders Found: <strong className="text-slate-200">{filteredOrders.length}</strong>
            </span>
            <button
              onClick={() => selectedEventId && fetchOrdersForEvent(selectedEventId)}
              title="Refresh Orders"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => selectedEventId && fetchOrdersForEvent(selectedEventId)} className="font-bold underline ml-2">
              Retry
            </button>
          </div>
        )}

        {/* Orders Table Container */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          {loadingOrders ? (
            <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
              Loading sanitized event orders ledger...
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-slate-300">No Events Configured</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Create an event to start recording attendee orders.</p>
              <Link href="/events/new" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold">
                + Create Event
              </Link>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {searchQuery
                ? `No orders matching "${searchQuery}".`
                : 'No orders placed for this event yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Purchaser</th>
                    <th className="py-2.5 px-3">Subtotal</th>
                    <th className="py-2.5 px-3">Total Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Promoter Code</th>
                    <th className="py-2.5 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.orderId} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-mono font-bold text-purple-300">
                        {ord.orderId.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-200">{ord.purchaserName ?? 'Attendee'}</p>
                        <p className="text-[11px] text-slate-400">{ord.purchaserEmail ?? '—'}</p>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">{formatCurrency(ord.subtotalMinor)}</td>
                      <td className="py-3 px-3 font-bold text-slate-100 font-mono">{formatCurrency(ord.totalMinor)}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadge(ord.status)}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {ord.promoterCode ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {ord.promoterCode}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                        {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
