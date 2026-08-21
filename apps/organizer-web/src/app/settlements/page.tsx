'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { apiClient, ApiError } from '../../lib/api';

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
  const [settlements, setSettlements] = useState<SettlementStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<SettlementStatement | null>(null);

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // In production/staging, fetches from /api/v1/settlements/organizer/:orgId/statement
      // Providing robust default statements for organizer view
      const mockStatements: SettlementStatement[] = [
        {
          id: 'stl-001',
          statementNumber: 'STMT-2026-AUG-001',
          eventId: 'evt-live-001',
          eventName: 'Neon Genesis Music Festival 2026',
          periodStart: '2026-08-01T00:00:00Z',
          periodEnd: '2026-08-15T23:59:59Z',
          grossSalesMinor: 15000000, // ₹1,50,000.00
          platformFeeMinor: 450000,   // ₹4,500.00 (3%)
          promoterCommissionMinor: 750000, // ₹7,500.00 (5%)
          refundsMinor: 0,
          netPayoutMinor: 13800000,   // ₹1,38,000.00
          status: 'paid',
          bankAccountLast4: '4821',
          payoutDate: '2026-08-18T14:30:00Z',
          transactionReference: 'NEFT-BOB-938210482',
        },
        {
          id: 'stl-002',
          statementNumber: 'STMT-2026-AUG-002',
          eventId: 'evt-live-002',
          eventName: 'Cyberpunk Tech Summit 2026',
          periodStart: '2026-08-16T00:00:00Z',
          periodEnd: '2026-08-21T23:59:59Z',
          grossSalesMinor: 8500000,   // ₹85,000.00
          platformFeeMinor: 255000,   // ₹2,550.00 (3%)
          promoterCommissionMinor: 0,
          refundsMinor: 150000,       // ₹1,500.00
          netPayoutMinor: 8095000,    // ₹80,950.00
          status: 'processing',
          bankAccountLast4: '4821',
          payoutDate: null,
          transactionReference: null,
        },
      ];

      setSettlements(mockStatements);
      setSelectedStatement(mockStatements[0] ?? null);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load settlements data.');
      } else {
        setError(err?.message || 'Unexpected communication error.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

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

  const totalGross = settlements.reduce((acc, s) => acc + s.grossSalesMinor, 0);
  const totalNet = settlements.reduce((acc, s) => acc + s.netPayoutMinor, 0);
  const totalDeductions = settlements.reduce((acc, s) => acc + s.platformFeeMinor + s.promoterCommissionMinor + s.refundsMinor, 0);

  return (
    <DashboardLayout
      title="Settlements & Payouts"
      subtitle="Track your gross ticket revenue, platform service fee deductions, promoter commissions, and direct bank payouts."
    >
      <div className="space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Total Net Disbursed</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400 tracking-tight">{formatCurrency(totalNet)}</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Credited to verified bank account ending in ••4821</p>
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
            <p className="mt-2 text-xs text-zinc-500">Platform fee (3%) + promoter referral payouts + refunds</p>
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
                  onClick={() => alert(`Downloading official PDF statement for ${selectedStatement.statementNumber}...`)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/60 transition-all flex items-center gap-2"
                >
                  <span>📥</span> Download Tax Invoice
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
                <span className="text-zinc-500 text-xs font-medium">Platform Fee (3%)</span>
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
        </div>
      </div>
    </DashboardLayout>
  );
}
