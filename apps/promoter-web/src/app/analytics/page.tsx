// =============================================================================
// promoter-web — Analytics & Referral Traffic
// Real referral link traffic analysis, order attribution, and campaign conversion rates.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PromoterLayout } from '../../components/PromoterLayout';
import { apiClient, ApiError } from '../../lib/api';

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [performances, setPerformances] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const campRes = await apiClient.getPromoterCampaigns<any>();
      const list: any[] = Array.isArray(campRes.data) ? campRes.data : (campRes.data?.items ?? []);
      setCampaigns(list);

      // Fetch performance for each campaign in parallel
      const perfEntries = await Promise.allSettled(
        list.map(async (c) => {
          const res = await apiClient.getPromoterCampaignPerformance<any>(c.id);
          return { id: c.id, data: res.data };
        })
      );

      const perfMap: Record<string, any> = {};
      perfEntries.forEach((entry) => {
        if (entry.status === 'fulfilled' && entry.value.data) {
          perfMap[entry.value.id] = entry.value.data;
        }
      });
      setPerformances(perfMap);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load promoter analytics.');
      } else {
        setError(err?.message || 'Error occurred while loading analytics.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Aggregate stats across active campaigns
  let totalClicks = 0;
  let totalOrders = 0;
  Object.values(performances).forEach((p) => {
    totalClicks += p.clicks ?? 0;
    totalOrders += p.conversions ?? p.salesCount ?? 0;
  });
  const avgConversionPct = totalClicks > 0 ? ((totalOrders / totalClicks) * 100).toFixed(1) : '0.0';

  return (
    <PromoterLayout title="Analytics and Referral Traffic" subtitle="Referral link traffic analysis and conversion performance metrics">
      <div className="space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchAnalytics} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Total Link Clicks</span>
              <p className="text-2xl font-bold text-slate-100 mt-1 font-mono">{totalClicks.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-blue-400 mt-1">Direct referral clicks</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Attributed Orders</span>
              <p className="text-2xl font-bold text-slate-100 mt-1 font-mono">{totalOrders}</p>
              <p className="text-[11px] text-emerald-400 mt-1">1:1 Orders confirmed</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Average Conversion Rate</span>
              <p className="text-2xl font-bold text-slate-100 mt-1 font-mono">{avgConversionPct}%</p>
              <p className="text-[11px] text-violet-300 mt-1">Click → Paid Order</p>
            </div>
          </div>
        )}

        {/* Notice for Historical Time-Series (Real explicit empty state) */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
          <span className="text-lg">📊</span>
          <span>Time-series traffic trend charts will populate automatically as historical referral traffic accumulates over active campaign windows.</span>
        </div>

        {/* Campaign Performance Breakdown Table */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-200">Campaign Performance Breakdown ({campaigns.length})</h3>
            <button onClick={fetchAnalytics} title="Refresh Analytics" className="p-1 rounded bg-slate-800 text-slate-300 text-xs">🔄</button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading campaign performance metrics...</div>
          ) : campaigns.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No active campaigns to analyze.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Event Title</th>
                    <th className="py-2.5 px-3">Referral Code</th>
                    <th className="py-2.5 px-3">Clicks</th>
                    <th className="py-2.5 px-3">Attributed Orders</th>
                    <th className="py-2.5 px-3 text-right">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {campaigns.map((c) => {
                    const perf = performances[c.id];
                    const clicks = perf?.clicks ?? 0;
                    const orders = perf?.conversions ?? perf?.salesCount ?? 0;
                    const rate = clicks > 0 ? ((orders / clicks) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={c.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-3 font-semibold text-slate-200">{c.event?.title ?? c.eventTitle ?? 'Affiliate Event'}</td>
                        <td className="py-3 px-3 font-mono text-purple-300 font-bold">{c.code}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{clicks}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-100">{orders}</td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-violet-300">{rate}%</td>
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
