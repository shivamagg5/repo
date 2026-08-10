'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PromoterLayout } from '../components/PromoterLayout';

export default function PromoterOverviewPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Environment-configured consumer origin (NEVER hardcoded in production)
  const consumerOrigin = process.env.NEXT_PUBLIC_CONSUMER_WEB_URL ?? 'http://localhost:3000';

  const overview = {
    totalEarnedMinor: 4825000, // ₹48,250
    totalPaidMinor: 3000000,   // ₹30,000
    pendingPayoutMinor: 1825000, // ₹18,250
    attributedSalesCount: 182,
    totalClicksCount: 1240,
    conversionRatePct: 14.7,
    activeCampaigns: [
      { id: 'camp-1', eventTitle: 'Summer Fest 2026', eventSlug: 'summer-fest-2026', code: 'SUMMER2026', commissionType: 'percentage', commissionValue: 10, clicks: 1240, sales: 182, earnedMinor: 4825000, venue: 'Grand Arena, Amritsar' },
    ],
    recentSales: [
      { orderId: 'ORD-10291', eventTitle: 'Summer Fest 2026', ticketQuantity: 2, totalMinor: 200000, earnedMinor: 20000, status: 'pending', createdAt: '2026-08-10T14:30:00Z' },
      { orderId: 'ORD-10289', eventTitle: 'Summer Fest 2026', ticketQuantity: 1, totalMinor: 100000, earnedMinor: 10000, status: 'approved', createdAt: '2026-08-10T10:00:00Z' },
    ],
  };

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
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-400 font-medium">Total Earned Commissions</span>
              <span className="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full font-semibold">10% Basis Rate</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(overview.totalEarnedMinor)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Pending Payout: {formatCurrency(overview.pendingPayoutMinor)}</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-400 font-medium">Attributed Sales</span>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold">1:1 Orders</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{overview.attributedSalesCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Confirmed ticket orders</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-400 font-medium">Referral Link Clicks</span>
              <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-semibold">Traffic</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{overview.totalClicksCount.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-slate-500 mt-1">Tracked click events</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-400 font-medium">Conversion Rate</span>
              <span className="text-xs text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full font-semibold">Click → Order</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{overview.conversionRatePct}%</p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-1.5 rounded-full" style={{ width: `${overview.conversionRatePct}%` }}></div>
            </div>
          </div>
        </div>

        {/* Active Campaigns Feed & One-Click Referral Link Tool */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-200">Active Affiliate Campaigns</h3>
              <Link href="/campaigns" className="text-xs text-violet-400 hover:text-violet-300 font-medium">
                View All Campaigns →
              </Link>
            </div>

            <div className="space-y-4">
              {overview.activeCampaigns.map((camp) => (
                <div key={camp.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{camp.eventTitle}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{camp.venue}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {camp.commissionType === 'percentage' ? `${camp.commissionValue}% Rate` : `₹${camp.commissionValue} Fixed`}
                    </span>
                  </div>

                  {/* Referral Link Copy Bar */}
                  <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-400 truncate flex-1 px-2">
                      {`${consumerOrigin}/events/${camp.eventSlug}?ref=${camp.code}`}
                    </span>
                    <button
                      onClick={() => handleCopyLink(camp.code, camp.eventSlug)}
                      className="px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all whitespace-nowrap"
                    >
                      {copiedCode === camp.code ? '✓ Copied Link' : 'Copy Link'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                    <span>Clicks: <span className="font-mono text-slate-200">{camp.clicks}</span></span>
                    <span>Sales: <span className="font-mono text-slate-200">{camp.sales}</span></span>
                    <span className="font-bold text-slate-200">Earned: {formatCurrency(camp.earnedMinor)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Attributed Sales Activity Stream */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-base font-bold text-slate-200 mb-4">Recent Attributed Orders</h3>
            <div className="space-y-3">
              {overview.recentSales.map((sale) => (
                <div key={sale.orderId} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-mono text-violet-300 font-semibold">{sale.orderId}</p>
                    <p className="text-slate-400 text-[11px]">{sale.ticketQuantity} ticket(s) · {sale.eventTitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-200">+{formatCurrency(sale.earnedMinor)}</p>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase font-semibold">
                      {sale.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PromoterLayout>
  );
}
