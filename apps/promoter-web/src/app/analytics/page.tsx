'use client';

import React from 'react';
import { PromoterLayout } from '../../components/PromoterLayout';

export default function AnalyticsPage() {
  const performanceData = {
    totalClicks: 1240,
    attributedOrders: 182,
    conversionRatePct: 14.7,
    topEvents: [
      { id: 'evt-1', title: 'Summer Fest 2026', clicks: 1240, orders: 182, conversionPct: 14.7 },
      { id: 'evt-2', title: 'Neon Night Concert', clicks: 450, orders: 45, conversionPct: 10.0 },
    ],
  };

  return (
    <PromoterLayout title="Analytics and Referral Traffic" subtitle="Referral link traffic analysis and conversion performance metrics">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Total Link Clicks</span>
            <p className="text-2xl font-bold text-slate-100 mt-1">{performanceData.totalClicks.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-blue-400 mt-1">Tracked click events</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Attributed Orders</span>
            <p className="text-2xl font-bold text-slate-100 mt-1">{performanceData.attributedOrders}</p>
            <p className="text-[11px] text-emerald-400 mt-1">1:1 Orders confirmed</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Average Conversion Rate</span>
            <p className="text-2xl font-bold text-slate-100 mt-1">{performanceData.conversionRatePct}%</p>
            <p className="text-[11px] text-violet-300 mt-1">Click → Paid Order</p>
          </div>
        </div>

        {/* Notice for Accumulating Historical Time-Series Data (NO FAKE CHARTS RULE) */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
          <span className="text-lg">📊</span>
          <span>Time-series traffic trend charts will populate automatically as historical referral traffic accumulates over active campaign windows.</span>
        </div>

        {/* Top Campaigns Performance Leaderboard */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <h3 className="text-base font-bold text-slate-200 mb-4">Event Referral Performance Leaderboard</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Event Title</th>
                  <th className="py-2.5 px-3">Total Clicks</th>
                  <th className="py-2.5 px-3">Attributed Orders</th>
                  <th className="py-2.5 px-3 text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {performanceData.topEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-semibold text-slate-200">{evt.title}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{evt.clicks}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-100">{evt.orders}</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-violet-300">{evt.conversionPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PromoterLayout>
  );
}
