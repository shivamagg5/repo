// =============================================================================
// admin-web — Order Inspection, Management & Refunds
// Live order directory, status filters, deep order inspection, and authoritative refunds.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient, ApiError } from '../../lib/api';
import { Badge, Button, Card, Skeleton } from '@platform/ui';

interface AdminOrderSummary {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  purchaserName: string;
  purchaserEmail: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  totalMinor: number;
  currency: string;
  createdAt: string;
}

export default function AdminOrdersPage() {
  const [ordersList, setOrdersList] = useState<AdminOrderSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderIdInput, setOrderIdInput] = useState('');

  // Order Details Modal State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (selectedStatus !== 'all') params['status'] = selectedStatus;
      if (searchQuery.trim()) params['search'] = searchQuery.trim();

      const res = await apiClient.listAdminOrders<any>(params);
      const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setOrdersList(list);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setListError(err.message || 'Failed to retrieve orders directory.');
      } else {
        setListError(err?.message || 'Error occurred while loading orders.');
      }
    } finally {
      setLoadingList(false);
    }
  }, [selectedStatus, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const inspectOrderById = async (id: string) => {
    setInspectLoading(true);
    setInspectError(null);
    try {
      const res = await apiClient.inspectAdminOrder<any>(id);
      setSelectedOrder(res.data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setInspectError(err.message || 'Order not found or access denied.');
      } else {
        setInspectError(err?.message || 'Error occurred while inspecting order.');
      }
      setSelectedOrder(null);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderIdInput.trim()) {
      inspectOrderById(orderIdInput.trim());
    } else {
      fetchOrders();
    }
  };

  const openRefundModal = () => {
    setIdempotencyKey(`ref-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    setRefundReason('');
    setRefundError(null);
    setRefundSuccess(null);
    setShowRefundModal(true);
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder?.id || !refundReason.trim()) return;

    setRefunding(true);
    setRefundError(null);
    try {
      await apiClient.refundAdminOrder(selectedOrder.id, {
        reason: refundReason.trim(),
        idempotencyKey: idempotencyKey.trim(),
      });

      setRefundSuccess('Refund successfully initiated and recorded in general ledger.');
      setTimeout(async () => {
        setShowRefundModal(false);
        await inspectOrderById(selectedOrder.id);
        await fetchOrders();
      }, 1200);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setRefundError(err.message || 'Failed to process refund.');
      } else {
        setRefundError(err?.message || 'Error occurred during refund operation.');
      }
    } finally {
      setRefunding(false);
    }
  };

  const formatCurrency = (minor: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(minor / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success" size="sm">Paid</Badge>;
      case 'refunded':
        return <Badge variant="danger" size="sm">Refunded</Badge>;
      case 'pending':
        return <Badge variant="warning" size="sm">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="neutral" size="sm">Cancelled</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <AdminLayout
      title="Orders & Refund Operations"
      subtitle="Authoritative platform order ledger, ticket verification, and financial refund management"
      actions={
        <Button variant="secondary" size="sm" onClick={fetchOrders}>
          🔄 Refresh Orders
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search & Direct Lookup Bar */}
        <Card variant="elevated" padding="md">
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[280px]">
              <input
                type="text"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder="Lookup Order ID (UUID) or search purchaser / event..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={inspectLoading}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {inspectLoading ? 'Inspecting...' : '🔍 Inspect Order'}
            </button>
          </form>
        </Card>

        {/* Filter Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0C101A] p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['all', 'paid', 'pending', 'refunded', 'cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedStatus(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedStatus === tab
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Showing <strong className="text-white">{ordersList.length}</strong> orders
          </div>
        </div>

        {/* Error State */}
        {listError && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
            {listError}
          </div>
        )}

        {/* Orders Table */}
        <Card variant="elevated" padding="none">
          {loadingList ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height="48px" variant="rect" />
              ))}
            </div>
          ) : ordersList.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No orders found matching the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Purchaser</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ordersList.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-purple-300 font-semibold">
                        {ord.id.substring(0, 8)}...
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{ord.purchaserName || 'Customer'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{ord.purchaserEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium max-w-[200px] truncate">
                        {ord.eventTitle || 'Event'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {formatCurrency(ord.totalMinor, ord.currency)}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(ord.status)}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-400 font-mono">
                        {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => inspectOrderById(ord.id)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Deep Order Inspection Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 max-w-2xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order ID</span>
                  <h3 className="text-lg font-bold text-white font-mono">{selectedOrder.id}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(selectedOrder.status)}
                  {selectedOrder.status === 'paid' && (
                    <button
                      onClick={openRefundModal}
                      className="px-4 py-1.5 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 font-bold text-xs transition-colors"
                    >
                      Issue Refund
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Purchaser & Event Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Purchaser Profile</p>
                  <p className="text-xs font-semibold text-slate-200">{selectedOrder.purchaserName}</p>
                  <p className="text-xs text-slate-400 font-mono">{selectedOrder.purchaserEmail}</p>
                  <p className="text-[10px] text-slate-500 font-mono">User ID: {selectedOrder.userId}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Event Details</p>
                  <p className="text-xs font-semibold text-slate-200">{selectedOrder.eventTitle}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Event ID: {selectedOrder.eventId}</p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <p className="text-xs text-slate-400">Subtotal</p>
                  <p className="text-base font-bold text-slate-200 font-mono mt-1">
                    {formatCurrency(selectedOrder.subtotalMinor ?? selectedOrder.totalMinor ?? 0, selectedOrder.currency)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <p className="text-xs text-slate-400">Discount</p>
                  <p className="text-base font-bold text-slate-200 font-mono mt-1">
                    {formatCurrency(selectedOrder.discountMinor ?? 0, selectedOrder.currency)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <p className="text-xs text-slate-400">Total Charged</p>
                  <p className="text-base font-bold text-emerald-400 font-mono mt-1">
                    {formatCurrency(selectedOrder.totalMinor ?? 0, selectedOrder.currency)}
                  </p>
                </div>
              </div>

              {/* Associated Tickets */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Issued Tickets ({selectedOrder.tickets?.length ?? 0})
                </h4>
                {selectedOrder.tickets && selectedOrder.tickets.length > 0 ? (
                  <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-xl overflow-hidden">
                    {selectedOrder.tickets.map((t: any) => (
                      <div key={t.id} className="p-3 bg-slate-900/40 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-mono text-purple-300 font-bold">{t.ticketNumber ?? t.id}</p>
                          <p className="text-[11px] text-slate-400">Status: {t.status}</p>
                        </div>
                        <div className="text-right">
                          {t.checkedInAt ? (
                            <span className="text-emerald-400 text-[11px] font-mono">
                              Checked in: {new Date(t.checkedInAt).toLocaleTimeString()}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Unscanned</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No ticket items linked to this order record.</p>
                )}
              </div>

              {/* Payments Ledger History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Payment Transactions ({selectedOrder.payments?.length ?? 0})
                </h4>
                {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                  <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-xl overflow-hidden">
                    {selectedOrder.payments.map((p: any) => (
                      <div key={p.id} className="p-3 bg-slate-900/40 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-mono text-slate-300 font-semibold">{p.provider || 'Gateway'}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Tx ID: {p.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-400 font-mono">{formatCurrency(p.amountMinor ?? selectedOrder.totalMinor)}</p>
                          <span className="text-[10px] uppercase font-bold text-slate-400">{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No gateway transaction records.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Authoritative Refund Modal */}
        {showRefundModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl border border-red-900/50 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-red-400">Issue Authoritative Refund</h3>
              <p className="text-xs text-slate-300">
                Processing refund for Order <strong className="text-white font-mono">{selectedOrder?.id}</strong>. The server will calculate and balance all general ledger journal entries.
              </p>

              {refundError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
                  {refundError}
                </div>
              )}

              {refundSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                  {refundSuccess}
                </div>
              )}

              <form onSubmit={handleRefundSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Idempotency Key (Auto-Generated)</label>
                  <input
                    type="text"
                    readOnly
                    value={idempotencyKey}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Refund Reason *</label>
                  <textarea
                    required
                    rows={3}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Provide justification for ledger audit trail (e.g. event cancellation, attendee dispute)..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowRefundModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={refunding || !refundReason.trim()}
                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {refunding ? 'Processing Refund...' : 'Confirm Refund'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
