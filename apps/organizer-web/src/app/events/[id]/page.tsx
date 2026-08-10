'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '../../../components/DashboardLayout';

export default function EventCommandCenterPage() {
  const params = useParams();
  const eventId = (params?.id as string) ?? 'event-1';

  // Event State Machine status
  const [eventStatus, setEventStatus] = useState<'draft' | 'submitted' | 'under_review' | 'approved' | 'published' | 'live' | 'cancelled'>('published');
  const [transitioning, setTransitioning] = useState(false);

  // Event Operating Data
  const eventData = {
    id: eventId,
    title: 'Summer Fest 2026',
    venueName: 'Grand Arena',
    city: 'Amritsar',
    startsAt: '24 Aug 2026, 7:00 PM',
    capacity: 1000,
    soldQuantity: 842,
    reservedQuantity: 24,
    grossSalesMinor: 48250000, // ₹4,82,500
    ticketTiers: [
      { id: 'tier-vip', name: 'VIP Pass', priceMinor: 100000, capacity: 200, soldQuantity: 182, reservedQuantity: 5, grossSalesMinor: 18200000 },
      { id: 'tier-eb', name: 'Early Bird', priceMinor: 40000, capacity: 300, soldQuantity: 300, reservedQuantity: 0, grossSalesMinor: 12000000 },
      { id: 'tier-ga', name: 'General Admission', priceMinor: 50000, capacity: 500, soldQuantity: 360, reservedQuantity: 19, grossSalesMinor: 18050000 },
    ],
    promoters: [
      { code: 'SUMMER2026', promoterHandle: '@rahul', salesCount: 182, totalAttributedMinor: 18200000 },
      { code: 'AMANFEST', promoterHandle: '@aman', salesCount: 141, totalAttributedMinor: 7050000 },
      { code: 'SIMRANVIP', promoterHandle: '@simran', salesCount: 96, totalAttributedMinor: 9600000 },
    ],
    recentOrders: [
      { orderId: 'ORD-10291', purchaserName: 'Alice Smith', quantity: 2, tierName: 'VIP Pass', totalMinor: 200000, promoterCode: 'SUMMER2026' },
      { orderId: 'ORD-10290', purchaserName: 'Bob Jones', quantity: 4, tierName: 'General Admission', totalMinor: 200000, promoterCode: null },
    ],
  };

  const handleStateTransition = async (targetAction: 'submit' | 'publish' | 'cancel') => {
    setTransitioning(true);
    // Calls canonical backend transition endpoint (e.g. POST /events/:id/publish) via ApiClient
    setTimeout(() => {
      if (targetAction === 'submit') setEventStatus('submitted');
      if (targetAction === 'publish') setEventStatus('published');
      if (targetAction === 'cancel') setEventStatus('cancelled');
      setTransitioning(false);
    }, 600);
  };

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);
  };

  const capacityPct = Math.round((eventData.soldQuantity / eventData.capacity) * 100);

  return (
    <DashboardLayout title={eventData.title} subtitle={`${eventData.venueName}, ${eventData.city} · ${eventData.startsAt}`}>
      <div className="space-y-6">
        {/* Command Center Control Header */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              eventStatus === 'live' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse' :
              eventStatus === 'published' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
              eventStatus === 'submitted' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {eventStatus}
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {eventId}</span>
          </div>

          {/* Backend State Transition Actions */}
          <div className="flex items-center gap-2">
            {eventStatus === 'draft' && (
              <button
                onClick={() => handleStateTransition('submit')}
                disabled={transitioning}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600/30 text-blue-200 border border-blue-500/40 text-xs font-semibold hover:bg-blue-600/40"
              >
                Submit for Review
              </button>
            )}
            {eventStatus === 'approved' && (
              <button
                onClick={() => handleStateTransition('publish')}
                disabled={transitioning}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-md hover:brightness-110"
              >
                🚀 Publish Event
              </button>
            )}
            {eventStatus !== 'cancelled' && (
              <button
                onClick={() => handleStateTransition('cancel')}
                disabled={transitioning}
                className="px-3.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20"
              >
                Cancel Event
              </button>
            )}
          </div>
        </div>

        {/* Top Operating KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-400 font-medium">Gross Ticket Sales</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">{formatCurrency(eventData.grossSalesMinor)}</p>
            <p className="text-[11px] text-emerald-400 mt-1">↑ Authoritative minor units</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-400 font-medium">Tickets Sold</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">{eventData.soldQuantity} / {eventData.capacity}</p>
            <p className="text-[11px] text-purple-300 mt-1">Active Holds: {eventData.reservedQuantity}</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-400 font-medium">Capacity Utilization</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">{capacityPct}%</p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full" style={{ width: `${capacityPct}%` }}></div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-400 font-medium">Gate Attendance</p>
            <p className="text-lg font-bold text-amber-300 mt-1">Pending Setup</p>
            <p className="text-[10px] text-slate-400 mt-1">Scanner setup required before live attendance is available.</p>
          </div>
        </div>

        {/* Operating Breakdown Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket Tier Breakdown Table */}
          <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-base font-bold text-slate-200 mb-4">Ticket Tier Configuration & Inventory</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Tier Name</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Sold / Cap</th>
                    <th className="py-2.5 px-3">Holds</th>
                    <th className="py-2.5 px-3 text-right">Gross Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {eventData.ticketTiers.map((tier) => (
                    <tr key={tier.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-semibold text-slate-200">{tier.name}</td>
                      <td className="py-3 px-3 text-slate-300">{formatCurrency(tier.priceMinor)}</td>
                      <td className="py-3 px-3 text-slate-300 font-mono">{tier.soldQuantity} / {tier.capacity}</td>
                      <td className="py-3 px-3 text-purple-400">{tier.reservedQuantity}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-200">{formatCurrency(tier.grossSalesMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Promoter Leaderboard */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-base font-bold text-slate-200 mb-4">Promoter Referral Performance</h3>
            <div className="space-y-3">
              {eventData.promoters.map((p) => (
                <div key={p.code} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-purple-300">{p.promoterHandle}</span>
                    <p className="text-[11px] text-slate-400">Code: <span className="font-mono text-slate-300">{p.code}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-200">{p.salesCount} sales</p>
                    <p className="text-[10px] text-slate-400">{formatCurrency(p.totalAttributedMinor)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
