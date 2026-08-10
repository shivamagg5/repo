'use client';

import React from 'react';
import { PromoterLayout } from '../../components/PromoterLayout';

export default function EarningsLedgerPage() {
  const ledgerEntries = [
    { id: 'comm-101', orderId: 'ORD-10291', eventTitle: 'Summer Fest 2026', ticketQuantity: 2, calculationBaseMinor: 200000, snapshotRate: '10%', amountMinor: 20000, status: 'pending', createdAt: '2026-08-10T14:30:00Z', isReversal: false },
    { id: 'comm-102', orderId: 'ORD-10289', eventTitle: 'Summer Fest 2026', ticketQuantity: 1, calculationBaseMinor: 100000, snapshotRate: '10%', amountMinor: 10000, status: 'approved', createdAt: '2026-08-10T10:00:00Z', isReversal: false },
    { id: 'comm-103', orderId: 'ORD-10200', eventTitle: 'Summer Fest 2026', ticketQuantity: 1, calculationBaseMinor: 100000, snapshotRate: '10%', amountMinor: 10000, status: 'paid', createdAt: '2026-08-01T12:00:00Z', isReversal: false },
    // Explicit Partial/Full Refund Reversal Row preserving historical auditability!
    { id: 'comm-104-rev', orderId: 'ORD-10200', eventTitle: 'Summer Fest 2026 (Refund Reversal)', ticketQuantity: 1, calculationBaseMinor: -50000, snapshotRate: '10%', amountMinor: -5000, status: 'reversed', createdAt: '2026-08-05T09:15:00Z', isReversal: true },
  ];

  const formatCurrency = (minor: number) => {
    const isNegative = minor < 0;
    const absVal = Math.abs(minor) / 100;
    const formatted = `₹${absVal.toLocaleString('en-IN')}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  return (
    <PromoterLayout title="Commission Ledger and Earnings History" subtitle="Auditable historical commission entries and refund reversal records">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex gap-2 text-xs">
            <button className="px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-300 font-semibold border border-violet-500/30">All Ledger Entries</button>
            <button className="px-3 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 hover:text-slate-200 font-medium">Pending</button>
            <button className="px-3 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 hover:text-slate-200 font-medium">Paid</button>
            <button className="px-3 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 hover:text-slate-200 font-medium">Reversals</button>
          </div>
          <span className="text-xs text-slate-400 font-mono">Ledger Rows: {ledgerEntries.length}</span>
        </div>

        {/* Ledger Table */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Calculation Base</th>
                  <th className="py-2.5 px-3">Snapshot Rate</th>
                  <th className="py-2.5 px-3">Earned Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ledgerEntries.map((row) => (
                  <tr key={row.id} className={row.isReversal ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-slate-900/40'}>
                    <td className="py-3 px-3 font-mono font-bold text-violet-300">{row.orderId}</td>
                    <td className="py-3 px-3">
                      <p className={row.isReversal ? 'font-semibold text-red-300' : 'font-semibold text-slate-200'}>{row.eventTitle}</p>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{row.ticketQuantity}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono">{formatCurrency(row.calculationBaseMinor)}</td>
                    <td className="py-3 px-3 text-slate-300 font-mono">{row.snapshotRate}</td>
                    <td className={row.isReversal ? 'py-3 px-3 font-bold font-mono text-red-400' : 'py-3 px-3 font-bold font-mono text-slate-100'}>
                      {formatCurrency(row.amountMinor)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-violet-500/20 text-violet-300 border-violet-500/30">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                      {new Date(row.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
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
