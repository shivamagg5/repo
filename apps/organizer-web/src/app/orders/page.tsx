'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '../../components/DashboardLayout';
import { apiClient } from '../../lib/api';
import type { Event, OrganizerOrderDto, OrderReceiptDto } from '@platform/types';

export default function OrdersPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [orders, setOrders] = useState<OrganizerOrderDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<OrderReceiptDto | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Fetch organizer events list for selector
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await apiClient.getOrganizerEvents<{ items: Event[]; nextCursor: string | null; hasMore: boolean }>();
      const list = res?.data?.items ?? [];
      setEvents(list);
      if (list.length > 0 && !selectedEventId) {
        setSelectedEventId(list[0]!.id);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch orders for currently selected event
  const fetchOrdersForEvent = useCallback(async (eventId: string) => {
    if (!eventId) {
      setOrders([]);
      return;
    }
    setLoadingOrders(true);
    try {
      const res = await apiClient.getOrganizerEventOrders<OrganizerOrderDto[]>(eventId, { limit: '50' });
      setOrders(res?.data ?? []);
      setLastUpdated(new Date());
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchOrdersForEvent(selectedEventId);
    }
  }, [selectedEventId, fetchOrdersForEvent]);

  const fmt = (minor: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      (minor || 0) / 100,
    );

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.purchaserName || '').toLowerCase().includes(q) ||
      (o.purchaserEmail || '').toLowerCase().includes(q) ||
      (o.promoterCode || '').toLowerCase().includes(q) ||
      o.orderId.toLowerCase().includes(q)
    );
  });

  const handleOpenReceipt = async (orderId: string) => {
    if (!selectedEventId) return;
    setLoadingReceipt(true);
    setReceiptError(null);
    setShowReceiptModal(true);
    try {
      const res = await apiClient.getOrganizerOrderReceipt<OrderReceiptDto>(selectedEventId, orderId);
      if (res?.data) {
        setSelectedReceipt(res.data);
      } else {
        setReceiptError('Failed to parse order receipt envelope.');
      }
    } catch (err: any) {
      setReceiptError(err?.message ?? 'Failed to retrieve authoritative order receipt.');
    } finally {
      setLoadingReceipt(false);
    }
  };

  return (
    <DashboardLayout
      title="Orders & Attendees"
      subtitle="Authoritative transaction ledger, ticket issuances & booking receipts"
      actions={
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => selectedEventId && fetchOrdersForEvent(selectedEventId)}
            disabled={loadingOrders || !selectedEventId}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            {loadingOrders ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Controls Bar: Event Selector & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 whitespace-nowrap">Filter Event:</span>
            {loadingEvents ? (
              <span className="text-xs text-slate-500">Loading events...</span>
            ) : events.length === 0 ? (
              <span className="text-xs text-slate-400">No events found</span>
            ) : (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-purple-500 max-w-xs truncate"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search by attendee name, email, or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="surface-card">
          <div className="surface-card-body p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Attendee</th>
                    <th className="py-3 px-4">Tier & Qty</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Booked At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingOrders ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Loading authoritative booking orders...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        {events.length === 0
                          ? 'No events available. Create an event to begin receiving orders.'
                          : 'No booking orders recorded for this event yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr key={ord.orderId} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-purple-400">
                          {ord.orderId.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{ord.purchaserName || 'Direct Attendee'}</div>
                          <div className="text-slate-500 text-[11px]">{ord.purchaserEmail || '—'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-300 font-medium">
                            {ord.promoterCode ? `Promo (${ord.promoterCode})` : 'General Admission'}
                          </span>
                          <span className="text-slate-500 ml-1.5 font-mono">({ord.ticketQuantity || 1} tickets)</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {fmt(ord.totalMinor || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              ord.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : ord.status === 'refunded'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {ord.status || 'paid'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {ord.createdAt
                            ? new Date(ord.createdAt).toLocaleString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(ord.orderId)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] font-medium transition-colors"
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Official Order Receipt / Tax Invoice Modal ──────────────────────── */}
      {showReceiptModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#0f1117',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Booking Receipt & Tax Invoice
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                  Authoritative order transaction ledger
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto', fontSize: '12px' }}>
              {loadingReceipt ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>
                  Retrieving cryptographically verified order details...
                </div>
              ) : receiptError ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#f87171' }}>
                  {receiptError}
                </div>
              ) : selectedReceipt ? (
                <div className="space-y-4">
                  {/* Header info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
                    <div>
                      <p style={{ fontWeight: 800, color: '#fff', fontSize: '15px', margin: 0 }}>
                        {selectedReceipt.legalEntityName || selectedReceipt.organizerName}
                      </p>
                      <p style={{ color: 'var(--text-3)', margin: '2px 0' }}>{selectedReceipt.venueName}</p>
                      {selectedReceipt.gstin && (
                        <p style={{ color: 'var(--text-3)', fontSize: '10px', margin: 0 }}>GSTIN: {selectedReceipt.gstin}</p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--pink)', margin: 0 }}>
                        {selectedReceipt.orderNumber}
                      </p>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                        Date: {selectedReceipt.paidAt ? new Date(selectedReceipt.paidAt).toLocaleDateString('en-IN') : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Customer details */}
                  <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Billed To</span>
                      <p style={{ fontWeight: 600, color: '#fff', margin: '2px 0 0' }}>{selectedReceipt.customerName}</p>
                      <p style={{ color: 'var(--text-3)', fontSize: '11px', margin: 0 }}>{selectedReceipt.customerEmail}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Payment Reference</span>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-2)', margin: '2px 0 0' }}>
                        {selectedReceipt.paymentTransactionReference || 'TX-ONLINE-VERIFIED'}
                      </p>
                      <span style={{ fontSize: '10px', color: 'var(--green)' }}>Method: {selectedReceipt.paymentMethod || 'Online'}</span>
                    </div>
                  </div>

                  {/* Itemized Line Items */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontSize: '10px' }}>
                        <tr>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Item / Pass</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>Qty</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Unit Price</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReceipt.items.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff' }}>{it.ticketTypeName}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-2)' }}>{it.quantity}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-2)' }}>{fmt(it.unitPriceMinor)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(it.totalMinor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Totals */}
                  <div style={{ marginLeft: 'auto', maxWidth: '240px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)' }}>
                      <span>Subtotal</span>
                      <span>{fmt(selectedReceipt.subtotalMinor)}</span>
                    </div>
                    {selectedReceipt.feesMinor !== undefined && selectedReceipt.feesMinor > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)' }}>
                        <span>Booking & Platform Fee</span>
                        <span>{fmt(selectedReceipt.feesMinor)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)' }}>
                      <span>Taxes & GST (18%)</span>
                      <span>{fmt(selectedReceipt.taxMinor)}</span>
                    </div>
                    {selectedReceipt.discountMinor > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--green)' }}>
                        <span>Discount Applied</span>
                        <span>- {fmt(selectedReceipt.discountMinor)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#fff', fontSize: '14px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                      <span>Total Paid</span>
                      <span style={{ color: 'var(--pink)' }}>{fmt(selectedReceipt.totalMinor)}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'none',
                    border: '1px solid var(--border)',
                    color: 'var(--text-3)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    background: 'var(--pink)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
