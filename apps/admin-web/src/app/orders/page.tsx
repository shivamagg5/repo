// =============================================================================
// admin-web — Order Inspection & Refunds
// Inspect order records and issue authoritative refunds with idempotency keys.
// =============================================================================
'use client';

import React, { useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient, ApiError } from '../../lib/api';

export default function AdminOrdersPage() {
  const [orderIdInput, setOrderIdInput] = useState('');
  const [orderData, setOrderData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = orderIdInput.trim();
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.inspectAdminOrder<any>(id);
      setOrderData(res.data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Order not found or access denied.');
      } else {
        setError(err?.message || 'Error occurred while looking up order.');
      }
      setOrderData(null);
    } finally {
      setLoading(false);
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
    if (!orderData?.id || !refundReason.trim()) return;

    setRefunding(true);
    setRefundError(null);
    try {
      await apiClient.refundAdminOrder(orderData.id, {
        reason: refundReason.trim(),
        idempotencyKey: idempotencyKey.trim(),
      });

      setRefundSuccess('Refund successfully initiated and recorded in ledger.');
      setTimeout(async () => {
        setShowRefundModal(false);
        // Refresh order inspection
        const updated = await apiClient.inspectAdminOrder<any>(orderData.id);
        setOrderData(updated.data);
      }, 1500);
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
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
  };

  return (
    <AdminLayout
      title="Order Inspection & Refunds"
      subtitle="Inspect order ledger items, verify tickets, and issue authoritative refund transactions"
    >
      <div className="space-y-6">
        {/* Lookup Bar */}
        <div className="bg-[#0C101A] p-5 rounded-2xl border border-slate-800">
          <form onSubmit={handleInspect} className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[280px]">
              <input
                type="text"
                required
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder="Enter complete Order ID (e.g. 00000000-0000-0000-0000-000000000000)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !orderIdInput.trim()}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Inspecting...' : '🔍 Inspect Order'}
            </button>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Order Details Panel */}
        {orderData && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order ID</span>
                <h3 className="text-lg font-bold text-white font-mono">{orderData.id}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Placed on {new Date(orderData.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                  {orderData.status}
                </span>
                {orderData.status === 'paid' && (
                  <button
                    onClick={openRefundModal}
                    className="px-4 py-1.5 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 font-bold text-xs transition-colors"
                  >
                    Issue Refund
                  </button>
                )}
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <p className="text-xs text-slate-400">Subtotal</p>
                <p className="text-base font-bold text-slate-200 font-mono mt-1">
                  {formatCurrency(orderData.subtotalMinor ?? orderData.totalMinor ?? 0, orderData.currency)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <p className="text-xs text-slate-400">Discount</p>
                <p className="text-base font-bold text-slate-200 font-mono mt-1">
                  {formatCurrency(orderData.discountMinor ?? 0, orderData.currency)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <p className="text-xs text-slate-400">Total Charged</p>
                <p className="text-base font-bold text-emerald-400 font-mono mt-1">
                  {formatCurrency(orderData.totalMinor ?? 0, orderData.currency)}
                </p>
              </div>
            </div>

            {/* Associated Tickets */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Issued Tickets ({orderData.tickets?.length ?? 0})
              </h4>
              {orderData.tickets && orderData.tickets.length > 0 ? (
                <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-xl overflow-hidden">
                  {orderData.tickets.map((t: any) => (
                    <div key={t.id} className="p-3 bg-slate-900/40 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-mono text-purple-300 font-bold">{t.ticketNumber ?? t.id}</p>
                        <p className="text-[11px] text-slate-400">Tier: {t.ticketTypeId ?? 'Standard'}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No ticket items linked to this order record.</p>
              )}
            </div>
          </div>
        )}

        {/* Refund Modal */}
        {showRefundModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl border border-red-900/50 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-red-400">Issue Authoritative Refund</h3>
              <p className="text-xs text-slate-300">
                Processing refund for Order <strong className="text-white font-mono">{orderData?.id}</strong>. The server will calculate the exact refundable amount.
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
                  <label className="text-xs text-slate-400 block mb-1">Idempotency Key (Generated)</label>
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
