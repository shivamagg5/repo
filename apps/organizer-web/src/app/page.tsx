'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '../components/DashboardLayout';
import type { OrganizerOverviewDto } from '@platform/types';

export default function OverviewPage() {
  const [overview, setOverview] = useState<OrganizerOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In actual production runtime, calls ApiClient.getOrganizerOverview()
    // Mocking robust initial data for demonstration
    setOverview({
      organizationId: 'org-organizer-1',
      totalActiveEvents: 3,
      grossTicketSalesMinor: 48250000, // ₹4,82,500
      refundsMinor: 0,
      discountsMinor: 1200000,
      promoterCommissionsMinor: 4825000, // ₹48,250
      netOrganizerMinor: 43425000, // ₹4,34,250
      totalTicketsSold: 1284,
      totalActiveHolds: 24,
      averageCapacityUtilization: 82,
      currency: 'INR',
    });
    setLoading(false);
  }, []);

  const formatCurrency = (minor: number) => {
    const rupees = minor / 100;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rupees);
  };

  return (
    <DashboardLayout title="Dashboard Overview" subtitle="Operational metrics & real-time event status summary">
      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400">Loading overview metrics...</div>
      ) : (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-slate-400 font-medium">Gross Sales</span>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold">↑ 18.4%</span>
              </div>
              <p className="text-2xl font-bold text-slate-100">{formatCurrency(overview?.grossTicketSalesMinor ?? 0)}</p>
              <p className="text-[11px] text-slate-500 mt-1">Net Organizer: {formatCurrency(overview?.netOrganizerMinor ?? 0)}</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-slate-400 font-medium">Tickets Sold</span>
                <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full font-semibold">Total</span>
              </div>
              <p className="text-2xl font-bold text-slate-100">{(overview?.totalTicketsSold ?? 0).toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-500 mt-1">Active Holds: {overview?.totalActiveHolds ?? 0}</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-slate-400 font-medium">Capacity Utilization</span>
                <span className="text-xs text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full font-semibold">Avg</span>
              </div>
              <p className="text-2xl font-bold text-slate-100">{overview?.averageCapacityUtilization ?? 0}%</p>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full"
                  style={{ width: `${overview?.averageCapacityUtilization ?? 0}%` }}
                ></div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-slate-400 font-medium">Active Events</span>
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-semibold">Live Feed</span>
              </div>
              <p className="text-2xl font-bold text-slate-100">{overview?.totalActiveEvents ?? 0}</p>
              <p className="text-[11px] text-slate-500 mt-1">Status: Published & Live</p>
            </div>
          </div>

          {/* Active Events & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Events Console Feed */}
            <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-200">Active Event Operational Feed</h3>
                <Link href="/events" className="text-xs text-purple-400 hover:text-purple-300 font-medium">
                  View All Events →
                </Link>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-all">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        LIVE ●
                      </span>
                      <h4 className="font-semibold text-slate-100 text-sm">Summer Fest 2026</h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Grand Arena, Amritsar · 24 Aug 2026</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-200">₹4,82,500</p>
                    <p className="text-xs text-slate-400">842 / 1,000 tickets</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-all">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        PUBLISHED
                      </span>
                      <h4 className="font-semibold text-slate-100 text-sm">Neon Night Concert</h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Club Vista, Ludhiana · 15 Sep 2026</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-200">₹92,000</p>
                    <p className="text-xs text-slate-400">421 / 500 tickets</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders Stream */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800/80">
              <h3 className="text-base font-bold text-slate-200 mb-4">Recent Orders Stream</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-mono text-purple-300 font-semibold">#ORD-10291</p>
                    <p className="text-slate-400 text-[11px]">2 × VIP Tier</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-200">₹2,000</p>
                    <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">SUMMER2026</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-mono text-purple-300 font-semibold">#ORD-10290</p>
                    <p className="text-slate-400 text-[11px]">4 × General Pass</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-200">₹2,400</p>
                    <span className="text-[10px] text-slate-400 font-mono">Direct</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
