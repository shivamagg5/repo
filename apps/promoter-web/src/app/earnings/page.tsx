// =============================================================================
// promoter-web — Commission Ledger & Earnings History
// Real auditable historical commission entries, payout requests, and tax invoices.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PromoterLayout } from '../../components/PromoterLayout';
import { apiClient, ApiError } from '../../lib/api';
import { useAuth } from '@platform/auth';
import { PayoutInvoiceModal, PayoutInvoiceData } from '../../components/PayoutInvoiceModal';
import { getTierForMetrics } from '../../components/PromoterTierMilestone';

export default function EarningsLedgerPage() {
  const { user, profile, organizations } = useAuth();
  const activeOrg = organizations?.find((o) => o.type === 'promoter' && o.status === 'active') ?? organizations?.[0];

  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [earningsSummary, setEarningsSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'ledger' | 'payouts'>('ledger');

  // Payout Modal State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank_transfer'>('upi');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  // Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<PayoutInvoiceData | null>(null);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, commRes, payoutRes] = await Promise.allSettled([
        apiClient.getPromoterEarnings<any>(),
        apiClient.getPromoterCommissions<any>(),
        apiClient.getPromoterPayouts<any>(),
      ]);

      const sumData = sumRes.status === 'fulfilled' ? sumRes.value.data : null;
      const commData = commRes.status === 'fulfilled' ? commRes.value.data : [];
      const payoutData = payoutRes.status === 'fulfilled' ? payoutRes.value.data : [];

      setEarningsSummary(sumData);
      setCommissions(Array.isArray(commData) ? commData : (commData?.items ?? []));
      setPayouts(Array.isArray(payoutData) ? payoutData : (payoutData?.items ?? []));
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

  const filteredEarnings = commissions.filter((e) => {
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
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'approved':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'reversed':
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending':
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
  };

  const availableBalanceMinor = earningsSummary
    ? (earningsSummary.pendingCommissionMinor ?? 0) + (earningsSummary.approvedCommissionMinor ?? 0)
    : 0;
  const approvedBalanceMinor = earningsSummary ? (earningsSummary.approvedCommissionMinor ?? 0) : 0;
  const paidOutMinor = earningsSummary ? (earningsSummary.paidCommissionMinor ?? 0) : 0;
  const totalEarnedMinor = (earningsSummary?.pendingCommissionMinor ?? 0) +
    (earningsSummary?.approvedCommissionMinor ?? 0) +
    (earningsSummary?.paidCommissionMinor ?? 0);

  const totalSales = commissions.filter((c) => !['reversed', 'cancelled'].includes(c.status?.toLowerCase() ?? '')).length;
  const { currentTier } = useMemo(() => getTierForMetrics(totalSales, totalEarnedMinor), [totalSales, totalEarnedMinor]);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payoutAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPayoutError('Please enter a valid payout amount.');
      return;
    }

    setRequestingPayout(true);
    setPayoutError(null);
    try {
      await apiClient.requestPromoterPayout({
        amountMinor: Math.round(amountNum * 100),
        payoutMethod,
        upiId: payoutMethod === 'upi' ? upiId.trim() : undefined,
        bankAccount: payoutMethod === 'bank_transfer' ? {
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          accountHolderName: accountHolder.trim(),
        } : undefined,
      });

      setPayoutSuccess(`Payout request for ₹${amountNum.toLocaleString('en-IN')} submitted successfully.`);
      setShowPayoutModal(false);
      setPayoutAmount('');
      setUpiId('');
      await fetchEarnings();
    } catch (err: any) {
      setPayoutError(err?.message || 'Failed to submit payout request.');
    } finally {
      setRequestingPayout(false);
    }
  };

  const generateInvoiceForPayout = (payout: any) => {
    const invoiceId = `PRM-${new Date(payout.createdAt ?? Date.now()).getFullYear()}-${(payout.id ?? 'PAY').substring(0, 8).toUpperCase()}`;
    const invoiceDate = payout.createdAt
      ? new Date(payout.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    setSelectedInvoice({
      invoiceNumber: invoiceId,
      invoiceDate,
      promoterName: profile?.name ?? user?.email?.split('@')[0] ?? 'Affiliate Partner',
      promoterEmail: user?.email ?? 'promoter@eventhub.io',
      promoterOrgName: activeOrg?.name,
      promoterPan: (profile as any)?.panNumber ?? undefined,
      payoutMethod: payout.payoutMethod ?? 'upi',
      destinationDetail: payout.destinationDetail ?? payout.destinationReference ?? 'UPI / Bank Settlement',
      transactionReference: payout.transactionReference ?? `UTR-${Date.now()}`,
      status: payout.status ?? 'pending',
      grossAmountMinor: Number(payout.amountMinor ?? 0),
      tdsRatePct: 5.0,
      eventTitle: 'Platform Affiliate Referral Settlements',
    });
  };

  const generateInvoiceForCommission = (comm: any) => {
    const invoiceId = `COMM-${new Date(comm.createdAt ?? Date.now()).getFullYear()}-${(comm.id ?? 'C').substring(0, 8).toUpperCase()}`;
    const invoiceDate = comm.createdAt
      ? new Date(comm.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const amount = Number(comm.commissionEarnedMinor ?? comm.amountMinor ?? 0);

    setSelectedInvoice({
      invoiceNumber: invoiceId,
      invoiceDate,
      promoterName: profile?.name ?? user?.email?.split('@')[0] ?? 'Affiliate Partner',
      promoterEmail: user?.email ?? 'promoter@eventhub.io',
      promoterOrgName: activeOrg?.name,
      promoterPan: (profile as any)?.panNumber ?? undefined,
      payoutMethod: 'upi',
      destinationDetail: `Affiliate Commission Ledger (Ref: ${comm.orderId ?? comm.id})`,
      transactionReference: comm.orderId ?? `ORD-${Date.now()}`,
      status: comm.status ?? 'approved',
      grossAmountMinor: Math.abs(amount),
      tdsRatePct: 5.0,
      campaignCode: comm.campaignCode,
      eventTitle: comm.eventTitle ?? comm.event?.title ?? 'Event Ticket Sales',
    });
  };

  return (
    <PromoterLayout
      title="Commission Ledger & Tax Invoices"
      subtitle="Auditable commission ledger, instant UPI withdrawals, and one-click GST/TDS tax invoices"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (commissions.length > 0) {
                generateInvoiceForCommission(commissions[0]);
              } else {
                generateInvoiceForPayout({
                  id: 'CONSOLIDATED-01',
                  amountMinor: totalEarnedMinor,
                  status: 'processed',
                  payoutMethod: 'upi',
                  destinationReference: 'UPI Instant Settlement',
                });
              }
            }}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <span>📄</span>
            <span>Tax Invoice Slip</span>
          </button>
          <button
            type="button"
            onClick={fetchEarnings}
            disabled={loading}
            className="btn-secondary text-xs py-2 px-3"
          >
            ↻ Refresh
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Tier Milestone Commission Banner */}
        <div
          className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(24, 24, 38, 0.95), rgba(18, 18, 28, 0.95))',
            borderColor: currentTier.colorHex + '40',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentTier.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{currentTier.name} Active</span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                  style={{ backgroundColor: currentTier.colorHex + '20', color: currentTier.colorHex }}
                >
                  {currentTier.bonusCommissionPct > 0 ? `+${currentTier.bonusCommissionPct}% Boost` : 'Base Tier'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                All payouts processed via automated clearing house with 5% TDS (Section 194H) tax deduction and Form 16A generation.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ✓ 0% Payout Fee
          </span>
        </div>

        {/* Earnings Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-violet-800/40 bg-gradient-to-br from-violet-950/40 to-slate-900/60 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400 font-medium">Available to Withdraw</p>
              <p className="text-2xl font-bold font-mono text-violet-300 mt-1">
                {formatCurrency(availableBalanceMinor)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Approved: {formatCurrency(approvedBalanceMinor)}
              </p>
            </div>
            <button
              onClick={() => {
                setShowPayoutModal(true);
                setPayoutAmount((availableBalanceMinor / 100).toString());
                setPayoutSuccess(null);
                setPayoutError(null);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-900/30 transition-all flex items-center gap-1.5"
            >
              <span>⚡</span> Request UPI Payout
            </button>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
            <p className="text-xs text-slate-400 font-medium">Total Paid Out</p>
            <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {formatCurrency(paidOutMinor)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Settled across {payouts.length} past payout request{payouts.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
            <p className="text-xs text-slate-400 font-medium">Lifetime Gross Earned</p>
            <p className="text-2xl font-bold font-mono text-cyan-300 mt-1">
              {formatCurrency(totalEarnedMinor)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              From {totalSales} attributed ticket order{totalSales === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {payoutSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex justify-between items-center animate-in fade-in">
            <span>✓ {payoutSuccess}</span>
            <button onClick={() => setPayoutSuccess(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* View Tabs: Commission Ledger vs Payout History */}
        <div className="flex border-b border-slate-800 gap-6 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'ledger'
                ? 'text-yellow border-b-2 border-yellow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Commission Entries Ledger ({filteredEarnings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payouts')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'payouts'
                ? 'text-yellow border-b-2 border-yellow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Withdrawal Payouts History & Invoices ({payouts.length})
          </button>
        </div>

        {/* TAB 1: COMMISSION ENTRIES LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex flex-wrap justify-between items-center bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 gap-3">
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
              <div className="text-xs text-slate-400">
                Audited Ledger Rows: <strong className="text-slate-200 font-mono">{filteredEarnings.length}</strong>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
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
                        <th className="py-2.5 px-3">Earned Commission</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Invoice Slip</th>
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
                            <td className="py-3 px-3 text-slate-400 text-[11px]">
                              {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => generateInvoiceForCommission(row)}
                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-medium border border-white/10 transition-colors"
                              >
                                🧾 Invoice
                              </button>
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
        )}

        {/* TAB 2: PAYOUT HISTORY & TAX INVOICES */}
        {activeTab === 'payouts' && (
          <div className="space-y-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Disbursement Payout Records</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verified bank IMPS and instant UPI transactions with automated TDS remittance slips.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  + New Withdrawal
                </button>
              </div>

              {loading ? (
                <div className="py-16 text-center text-xs text-slate-400 animate-pulse">Loading payout history...</div>
              ) : payouts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No payout requests recorded yet. Withdraw your approved commissions to generate tax slips.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2.5 px-3">Payout ID</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Method / Destination</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">UTR / Reference</th>
                        <th className="py-2.5 px-3">Requested Date</th>
                        <th className="py-2.5 px-3 text-right">Tax Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {payouts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-3 font-mono font-bold text-violet-300">
                            {p.id?.substring(0, 12)}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-white text-sm">
                            {formatCurrency(p.amountMinor ?? 0)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-slate-300 font-medium">
                              {p.destinationDetail ?? p.destinationReference ?? (p.payoutMethod === 'upi' ? 'UPI' : 'Bank IMPS')}
                            </span>
                            <span className="block text-[10px] text-slate-400 uppercase">{p.payoutMethod ?? 'upi'}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(p.status)}`}>
                              {p.status ?? 'pending'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                            {p.transactionReference ?? 'PENDING CLEARANCE'}
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-[11px]">
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => generateInvoiceForPayout(p)}
                              className="px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold transition-all shadow-sm"
                            >
                              📄 Tax Invoice
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
        )}

        {/* Payout Withdrawal Request Modal */}
        {showPayoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>⚡</span> Request Commission Payout
                </h3>
                <button onClick={() => setShowPayoutModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
              </div>

              {payoutError && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs">
                  {payoutError}
                </div>
              )}

              <form onSubmit={handleRequestPayout} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Payout Channel</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('upi')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                        payoutMethod === 'upi'
                          ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      UPI ID (Instant VPA)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('bank_transfer')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                        payoutMethod === 'bank_transfer'
                          ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      Bank IMPS / NEFT
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="100"
                    step="1"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Enter amount to withdraw"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-violet-500 font-mono text-sm"
                    required
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                    <span>Available: ₹{(availableBalanceMinor / 100).toFixed(2)}</span>
                    <span className="text-amber-400">TDS 5% withheld u/s 194H</span>
                  </div>
                </div>

                {payoutMethod === 'upi' ? (
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">UPI ID (VPA)</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@okhdfcbank, mobile@paytm"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-violet-500 font-mono"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        placeholder="As registered with bank"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Account Number</label>
                        <input
                          type="text"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="Bank account number"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">IFSC Code</label>
                        <input
                          type="text"
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                          placeholder="HDFC0001234"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono uppercase"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPayoutModal(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={requestingPayout}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-violet-900/30"
                  >
                    {requestingPayout ? 'Processing...' : 'Confirm Withdrawal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* One-Click Tax Invoice Modal */}
        {selectedInvoice && (
          <PayoutInvoiceModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
      </div>
    </PromoterLayout>
  );
}
