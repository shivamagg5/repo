'use client';

import React from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';

export default function OrdersPage() {
  const ordersList = [
    { orderId: 'ORD-10291', purchaserName: 'Alice Smith', purchaserEmail: 'alice@example.com', eventTitle: 'Summer Fest 2026', ticketQuantity: 2, totalMinor: 200000, status: 'paid', promoterCode: 'SUMMER2026', createdAt: '2026-08-10T14:30:00Z' },
    { orderId: 'ORD-10290', purchaserName: 'Bob Jones', purchaserEmail: 'bob@example.com', eventTitle: 'Summer Fest 2026', ticketQuantity: 4, totalMinor: 240000, status: 'paid', promoterCode: null, createdAt: '2026-08-10T12:15:00Z' },
    { orderId: 'ORD-10289', purchaserName: 'Charlie Brown', purchaserEmail: 'charlie@example.com', eventTitle: 'Neon Night Concert', ticketQuantity: 1, totalMinor: 100000, status: 'paid', promoterCode: 'AMANFEST', createdAt: '2026-08-10T10:00:00Z' },
  ];

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);
  };

  return (
    <DashboardLayout title="Orders & Attendees" subtitle="Paginated PII-sanitized order list and purchaser details">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <input
            type="text"
            placeholder="Search order ID or email..."
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500 w-64"
          />
          <span className="text-xs text-slate-400">Total Paid Orders: {ordersList.length}</span>
        </div>

        {/* Orders Table */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Purchaser</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Total Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Promoter</th>
                  <th className="py-2.5 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ordersList.map((ord) => (
                  <tr key={ord.orderId} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-mono font-bold text-purple-300">{ord.orderId}</td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-200">{ord.purchaserName}</p>
                      <p className="text-[11px] text-slate-400">{ord.purchaserEmail}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{ord.eventTitle}</td>
                    <td className="py-3 px-3 font-mono text-slate-200">{ord.ticketQuantity}</td>
                    <td className="py-3 px-3 font-bold text-slate-100">{formatCurrency(ord.totalMinor)}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {ord.promoterCode ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {ord.promoterCode}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                      {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
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
