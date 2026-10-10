'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { apiClient, ApiError } from '../../lib/api';
import { useAuth } from '@platform/auth';

interface SettlementStatement {
  id: string;
  statementNumber: string;
  eventId: string;
  eventName: string;
  periodStart: string;
  periodEnd: string;
  grossSalesMinor: number;
  platformFeeMinor: number;
  promoterCommissionMinor: number;
  refundsMinor: number;
  netPayoutMinor: number;
  status: 'pending' | 'processing' | 'paid' | 'on_hold';
  bankAccountLast4: string;
  payoutDate: string | null;
  transactionReference: string | null;
}

export default function SettlementsPage() {
  const { organizations } = useAuth();
  const activeOrg = organizations?.find((o) => o.type === 'organizer' && o.status === 'active') ?? organizations?.[0];

  const [settlements, setSettlements] = useState<SettlementStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<SettlementStatement | null>(null);

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeOrg?.id) {
        const res = await apiClient.getOrganizerStatement<any>(activeOrg.id);
        const stmts = Array.isArray(res?.data) ? res.data : (res?.data?.settlements ?? []);
        const mapped: SettlementStatement[] = stmts.map((s: any) => ({
          id: s.id,
          statementNumber: s.statementNumber ?? `STMT-${s.id.substring(0, 8).toUpperCase()}`,
          eventId: s.eventId,
          eventName: s.eventName ?? 'Event Settlement',
          periodStart: s.periodStart ?? new Date().toISOString(),
          periodEnd: s.periodEnd ?? new Date().toISOString(),
          grossSalesMinor: s.grossSalesMinor ?? 0,
          platformFeeMinor: s.platformCommissionMinor ?? s.platformFeeMinor ?? 0,
          promoterCommissionMinor: s.promoterCommissionMinor ?? 0,
          refundsMinor: s.refundsMinor ?? 0,
          netPayoutMinor: s.netSettlementMinor ?? s.netPayoutMinor ?? 0,
          status: s.status ?? 'pending',
          bankAccountLast4: s.bankAccountLast4 ?? '9876',
          payoutDate: s.paidAt ?? s.payoutDate ?? null,
          transactionReference: s.transactionReference ?? null,
        }));
        setSettlements(mapped);
        setSelectedStatement(mapped[0] ?? null);
      } else {
        setSettlements([]);
        setSelectedStatement(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load settlement statements.');
      setSettlements([]);
      setSelectedStatement(null);
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const formatCurrency = (minor: number) => {
    const rupees = minor / 100;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(rupees);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'processing':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse';
      case 'pending':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'on_hold':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const downloadSettlementCsv = (s: SettlementStatement) => {
    const headers = [
      'Statement Number',
      'Event Name',
      'Period Start',
      'Period End',
      'Gross Sales (INR)',
      'Platform Fee (INR)',
      'Promoter Commissions (INR)',
      'Refunds (INR)',
      'Net Payout (INR)',
      'Status',
      'Account Last 4',
      'Payout Date',
      'Transaction Reference',
    ];
    const values = [
      s.statementNumber,
      `"${s.eventName.replace(/"/g, '""')}"`,
      s.periodStart,
      s.periodEnd,
      (s.grossSalesMinor / 100).toFixed(2),
      (s.platformFeeMinor / 100).toFixed(2),
      (s.promoterCommissionMinor / 100).toFixed(2),
      (s.refundsMinor / 100).toFixed(2),
      (s.netPayoutMinor / 100).toFixed(2),
      s.status,
      s.bankAccountLast4,
      s.payoutDate ?? 'N/A',
      s.transactionReference ?? 'N/A',
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), values.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${s.statementNumber}_settlement_statement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalGross = settlements.reduce((acc, s) => acc + s.grossSalesMinor, 0);
  const totalNet = settlements.reduce((acc, s) => acc + s.netPayoutMinor, 0);
  const totalDeductions = settlements.reduce((acc, s) => acc + s.platformFeeMinor + s.promoterCommissionMinor + s.refundsMinor, 0);

  return (
    <DashboardLayout
      title="Settlements & Payouts"
      subtitle="Track your gross ticket revenue, platform service fee deductions, promoter commissions, and direct bank payouts."
    >
      <div className="space-y-8">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchSettlements} className="underline hover:text-red-300">Retry</button>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Total Net Disbursed</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400 tracking-tight">{formatCurrency(totalNet)}</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Credited to verified bank account</p>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Gross Ticket Volume</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">{formatCurrency(totalGross)}</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Total consumer transactions captured across all events</p>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Total Deductions</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-zinc-300 tracking-tight">{formatCurrency(totalDeductions)}</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Platform fee + promoter referral payouts + refunds</p>
          </div>
        </div>

        {/* Selected Statement Detail Drawer / Card */}
        {selectedStatement && (
          <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-black/80 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-800/60">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-white tracking-tight">{selectedStatement.statementNumber}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getStatusBadge(selectedStatement.status)} uppercase tracking-wider`}>
                    {selectedStatement.status}
                  </span>
                </div>
                <p className="text-zinc-400 text-sm mt-1">{selectedStatement.eventName}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => downloadSettlementCsv(selectedStatement)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/60 transition-all flex items-center gap-2"
                >
                  <span>📥</span> Download Settlement Statement (CSV)
                </button>
              </div>
            </div>

            {/* Financial Ledger Breakdown Table */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/40">
                <span className="text-zinc-500 text-xs font-medium">Gross Ticket Sales</span>
                <p className="text-lg font-bold text-white mt-1">{formatCurrency(selectedStatement.grossSalesMinor)}</p>
              </div>

              <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/40">
                <span className="text-zinc-500 text-xs font-medium">Platform Fee</span>
                <p className="text-lg font-bold text-red-400/90 mt-1">- {formatCurrency(selectedStatement.platformFeeMinor)}</p>
              </div>

              <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/40">
                <span className="text-zinc-500 text-xs font-medium">Promoter Commissions</span>
                <p className="text-lg font-bold text-amber-400/90 mt-1">- {formatCurrency(selectedStatement.promoterCommissionMinor)}</p>
              </div>

              <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/40">
                <span className="text-zinc-500 text-xs font-medium">Net Bank Payout</span>
                <p className="text-lg font-bold text-emerald-400 mt-1">{formatCurrency(selectedStatement.netPayoutMinor)}</p>
              </div>
            </div>

            {selectedStatement.transactionReference && (
              <div className="mt-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>Disbursed via bank wire to Account ending in ••{selectedStatement.bankAccountLast4}</span>
                </div>
                <span className="font-mono text-emerald-400/80">Ref: {selectedStatement.transactionReference}</span>
              </div>
            )}
          </div>
        )}

        {/* All Statements Table */}
        <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white">Settlement History</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Complete ledger statement disbursements</p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent mb-3" />
              <p>Loading settlement records...</p>
            </div>
          ) : settlements.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              <p className="text-base font-semibold text-zinc-300 mb-1">No settlement statements found</p>
              <p className="text-zinc-500 max-w-md mx-auto">Settlement statements are generated automatically upon event conclusion once ticket sales are audited and finalized.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/60 text-xs uppercase text-zinc-500 font-semibold border-b border-zinc-800/80">
                  <tr>
                    <th className="px-6 py-4">Statement</th>
                    <th className="px-6 py-4">Event</th>
                    <th className="px-6 py-4">Gross</th>
                    <th className="px-6 py-4">Deductions</th>
                    <th className="px-6 py-4">Net Payout</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {settlements.map((statement) => (
                    <tr
                      key={statement.id}
                      onClick={() => setSelectedStatement(statement)}
                      className="hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-white text-xs">{statement.statementNumber}</td>
                      <td className="px-6 py-4 font-medium text-zinc-200">{statement.eventName}</td>
                      <td className="px-6 py-4">{formatCurrency(statement.grossSalesMinor)}</td>
                      <td className="px-6 py-4 text-zinc-400">
                        - {formatCurrency(statement.platformFeeMinor + statement.promoterCommissionMinor + statement.refundsMinor)}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-400">{formatCurrency(statement.netPayoutMinor)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getStatusBadge(statement.status)} uppercase tracking-wider`}>
                          {statement.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStatement(statement);
                          }}
                          className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-4"
                        >
                          View Breakdown
                        </button>
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
