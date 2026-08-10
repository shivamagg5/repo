'use client';

import React from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';

export default function PromotersPage() {
  const campaignsList = [
    { id: 'camp-1', code: 'SUMMER2026', eventTitle: 'Summer Fest 2026', commissionType: 'percentage', commissionValue: 10, totalClicks: 1240, attributedOrders: 182, totalSalesMinor: 18200000, status: 'active' },
    { id: 'camp-2', code: 'AMANFEST', eventTitle: 'Summer Fest 2026', commissionType: 'fixed', commissionValue: 100, totalClicks: 850, attributedOrders: 141, totalSalesMinor: 7050000, status: 'active' },
  ];

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);
  };

  return (
    <DashboardLayout title="Promoters & Affiliate Campaigns" subtitle="Event promoter referral performance and campaign tracking">
      <div className="space-y-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <h3 className="text-base font-bold text-slate-200 mb-4">Active Event Referral Campaigns</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Referral Code</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Rate</th>
                  <th className="py-2.5 px-3">Clicks</th>
                  <th className="py-2.5 px-3">Attributed Sales</th>
                  <th className="py-2.5 px-3">Gross Sales</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {campaignsList.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-mono font-bold text-purple-300">{c.code}</td>
                    <td className="py-3 px-3 text-slate-200">{c.eventTitle}</td>
                    <td className="py-3 px-3 text-slate-300">
                      {c.commissionType === 'percentage' ? `${c.commissionValue}%` : `₹${c.commissionValue}`}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{c.totalClicks}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-200">{c.attributedOrders} orders</td>
                    <td className="py-3 px-3 font-bold text-slate-100">{formatCurrency(c.totalSalesMinor)}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                        {c.status}
                      </span>
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
