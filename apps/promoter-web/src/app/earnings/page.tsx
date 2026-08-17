// =============================================================================
// promoter-web — Commission Ledger & Earnings History
// Real auditable historical commission entries and refund reversals from backend.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PromoterLayout } from '../../components/PromoterLayout';
import { apiClient, ApiError } from '../../lib/api';

export default function EarningsLedgerPage() {
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getPromoterEarnings<any>();
      const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setEarnings(list);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load promoter earnings ledger.');
      } else {
        setError(err?.message || 'Error occurred while loading commission records.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const filteredEarnings = earnings.filter((e) => {
    if (selectedFilter === 'all') return true;
    return e.status === selectedFilter;
  });

  const formatCurrency = (minor: number) => {
    const isNegative = minor < 0;
    const absVal = Math.abs(minor) / 100;
    const formatted = `₹${absVal.toLocaleString('en-IN')}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'approved':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'reversed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending':
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
  };

  return (
    <PromoterLayout title="Commission Ledger and Earnings History" subtitle="Auditable historical commission entries and refund reversal records">
      <div className="space-y-4">
        {/* Filter Controls */}
        <div className="flex flex-wrap justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800 gap-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {['all', 'pending', 'approved', 'paid', 'reversed'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedFilter(st)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  selectedFilter === st
                    ? 'bg-violet-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Ledger Rows: <strong className="text-slate-200">{filteredEarnings.length}</strong></span>
            <button onClick={fetchEarnings} title="Refresh Ledger" className="p-1 rounded bg-slate-800 text-slate-300 text-xs">🔄</button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchEarnings} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* Ledger Table */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 animate-pulse">Loading commission entries from ledger...</div>
          ) : filteredEarnings.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No commission entries match the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Entry ID / Order</th>
                    <th className="py-2.5 px-3">Event / Campaign</th>
                    <th className="py-2.5 px-3">Order Base</th>
                    <th className="py-2.5 px-3">Earned Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEarnings.map((row) => {
                    const isReversal = row.status === 'reversed' || (row.amountMinor ?? 0) < 0;
                    const amount = row.commissionEarnedMinor ?? row.amountMinor ?? 0;

                    return (
                      <tr key={row.id} className={isReversal ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-slate-900/40'}>
                        <td className="py-3 px-3 font-mono font-bold text-violet-300">
                          {row.orderId ?? row.id?.substring(0, 8)}
                        </td>
                        <td className="py-3 px-3">
                          <p className={isReversal ? 'font-semibold text-red-300' : 'font-semibold text-slate-200'}>
                            {row.eventTitle ?? row.event?.title ?? (isReversal ? 'Refund Reversal' : 'Affiliate Order')}
                          </p>
                          {row.campaignCode && <p className="text-[10px] text-slate-400 font-mono">Code: {row.campaignCode}</p>}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono">
                          {row.orderTotalMinor ? formatCurrency(row.orderTotalMinor) : '—'}
                        </td>
                        <td className={isReversal ? 'py-3 px-3 font-bold font-mono text-red-400' : 'py-3 px-3 font-bold font-mono text-slate-100'}>
                          {formatCurrency(amount)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(row.status)}`}>
                            {row.status ?? 'pending'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                          {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PromoterLayout>
  );
}
