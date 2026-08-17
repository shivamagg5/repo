// =============================================================================
// promoter-web — Promoter Overview Dashboard
// Real affiliate referral tracking, campaigns, and earnings from backend APIs.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PromoterLayout } from '../components/PromoterLayout';
import { apiClient, ApiError } from '../lib/api';

export default function PromoterOverviewPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Environment-configured consumer origin
  const consumerOrigin = process.env.NEXT_PUBLIC_CONSUMER_URL ?? 'http://localhost:3000';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, eRes] = await Promise.allSettled([
        apiClient.getPromoterCampaigns<any>(),
        apiClient.getPromoterEarnings<any>(),
      ]);

      const cData = cRes.status === 'fulfilled' ? cRes.value.data : [];
      const eData = eRes.status === 'fulfilled' ? eRes.value.data : [];

      setCampaigns(Array.isArray(cData) ? cData : (cData?.items ?? []));
      setEarnings(Array.isArray(eData) ? eData : (eData?.items ?? []));
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load promoter dashboard.');
      } else {
        setError(err?.message || 'Error occurred while loading affiliate data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived financial metrics from authoritative backend earnings
  const totalEarnedMinor = earnings
    .filter((e) => e.status !== 'reversed')
    .reduce((sum, e) => sum + (e.commissionEarnedMinor ?? e.amountMinor ?? 0), 0);

  const pendingPayoutMinor = earnings
    .filter((e) => e.status === 'pending' || e.status === 'approved')
    .reduce((sum, e) => sum + (e.commissionEarnedMinor ?? e.amountMinor ?? 0), 0);

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);
  };

  const handleCopyLink = (code: string, eventSlug: string) => {
    const fullUrl = `${consumerOrigin}/events/${eventSlug}?ref=${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <PromoterLayout title="Promoter Dashboard" subtitle="Real-time affiliate referral tracking, sales, and commission overview">
      <div className="space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchData} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* KPI Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-slate-400 font-medium">Total Earned Commissions</span>
                <span className="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full font-semibold">Ledger Net</span>
              </div>
              <p className="text-2xl font-bold text-slate-100 font-mono">{formatCurrency(totalEarnedMinor)}</p>
              <p className="text-[11px] text-slate-500 mt-1">Pending Payout: {formatCurrency(pendingPayoutMinor)}</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-slate-400 font-medium">Attributed Sales</span>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold">1:1 Orders</span>
              </div>
              <p className="text-2xl font-bold text-slate-100 font-mono">{earnings.length}</p>
              <p className="text-[11px] text-slate-500 mt-1">Confirmed ticket orders</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-slate-400 font-medium">Active Campaigns</span>
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-semibold">Active</span>
              </div>
              <p className="text-2xl font-bold text-slate-100 font-mono">
                {campaigns.filter((c) => c.status === 'active').length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Total: {campaigns.length} campaigns</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-slate-400 font-medium">Commission Status</span>
                <span className="text-xs text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full font-semibold">Live</span>
              </div>
              <p className="text-sm font-bold text-emerald-400 mt-2">Active Affiliate</p>
              <p className="text-[11px] text-slate-400 mt-1">Server tracking verified</p>
            </div>
          </div>
        )}

        {/* Active Campaigns Feed & One-Click Referral Link Tool */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-200">Active Affiliate Campaigns ({campaigns.length})</h3>
              <Link href="/campaigns" className="text-xs text-violet-400 hover:text-violet-300 font-medium">
                View All Campaigns →
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active affiliate campaigns found. Join or create a campaign to start earning.
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((camp) => (
                  <div key={camp.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-100 text-sm">{camp.event?.title ?? camp.eventTitle ?? 'Affiliate Event'}</h4>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">Code: <strong className="text-purple-300">{camp.code}</strong></p>
                      </div>
                      <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {camp.commissionType === 'percentage' ? `${camp.commissionValue}% Rate` : `₹${camp.commissionValue} Fixed`}
                      </span>
                    </div>

                    {/* Referral Link Copy Bar */}
                    <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-[11px] font-mono text-slate-400 truncate flex-1 px-2">
                        {`${consumerOrigin}/events/${camp.event?.slug ?? camp.eventSlug ?? camp.eventId}?ref=${camp.code}`}
                      </span>
                      <button
                        onClick={() => handleCopyLink(camp.code, camp.event?.slug ?? camp.eventSlug ?? camp.eventId)}
                        className="px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all whitespace-nowrap"
                      >
                        {copiedCode === camp.code ? '✓ Copied Link' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Attributed Sales Activity Stream */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-base font-bold text-slate-200 mb-4">Recent Attributed Orders ({earnings.length})</h3>
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading orders...</div>
            ) : earnings.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No orders attributed to your referral codes yet.
              </div>
            ) : (
              <div className="space-y-3">
                {earnings.slice(0, 5).map((sale) => (
                  <div key={sale.id ?? sale.orderId} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-mono text-violet-300 font-semibold">{sale.orderId ?? sale.id?.substring(0, 8)}</p>
                      <p className="text-slate-400 text-[11px]">
                        {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('en-IN') : 'Recent'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-200 font-mono">
                        +{formatCurrency(sale.commissionEarnedMinor ?? sale.amountMinor ?? 0)}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                        sale.status === 'paid' ? 'text-emerald-400 bg-emerald-500/10' :
                        sale.status === 'reversed' ? 'text-red-400 bg-red-500/10' :
                        'text-amber-400 bg-amber-500/10'
                      }`}>
                        {sale.status ?? 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PromoterLayout>
  );
}
