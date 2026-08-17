// =============================================================================
// admin-web — Finance & Financial Reconciliation
// Real immutable financial transaction ledger and automated reconciliation trigger.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient, ApiError } from '../../lib/api';

export default function AdminFinancePage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reconciliation execution state
  const [runningReconciliation, setRunningReconciliation] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.listFinancialTransactions<any>();
      const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setTransactions(list);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load financial transactions ledger.');
      } else {
        setError(err?.message || 'Error occurred while loading ledger.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleRunReconciliation = async () => {
    setRunningReconciliation(true);
    setReconcileResult(null);
    try {
      const res = await apiClient.runReconciliation<any>();
      setReconcileResult(res.data?.message ?? (res as any).message ?? 'Reconciliation run completed successfully.');
      await fetchTransactions();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to execute reconciliation.');
      } else {
        setError(err?.message || 'Error occurred during reconciliation run.');
      }
    } finally {
      setRunningReconciliation(false);
    }
  };

  const formatCurrency = (minor: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
  };

  return (
    <AdminLayout
      title="Financial Ledger & Reconciliation"
      subtitle="Immutable platform transactions ledger, audit breakdown, and automated daily reconciliation"
      actions={
        <button
          onClick={handleRunReconciliation}
          disabled={runningReconciliation}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-950/40"
        >
          {runningReconciliation ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Reconciling...
            </>
          ) : (
            '⚡ Run Automated Reconciliation'
          )}
        </button>
      }
    >
      <div className="space-y-4">
        {/* Result & Error Banners */}
        {reconcileResult && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex justify-between items-center">
            <span>✓ {reconcileResult}</span>
            <button onClick={() => setReconcileResult(null)} className="font-bold ml-2">Dismiss</button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchTransactions} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* Transactions Table */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Platform Ledger Journal Entries ({transactions.length})
            </h3>
            <button
              onClick={fetchTransactions}
              title="Refresh Ledger"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              🔄
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
              Querying immutable double-entry ledger transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No financial transaction entries recorded in platform ledger.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Entry ID</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Reference ID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-mono text-[11px] text-purple-300">
                        {tx.id?.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-3 capitalize font-semibold text-slate-200">
                        {tx.type ?? 'Payment'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-100">
                        {formatCurrency(tx.amountMinor ?? 0, tx.currency ?? 'INR')}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                        {tx.referenceId ?? '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                          {tx.status ?? 'settled'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
