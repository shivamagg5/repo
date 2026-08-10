'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardLayout } from '../../components/DashboardLayout';

export default function EventsListPage() {
  const eventsList = [
    { id: 'event-1', title: 'Summer Fest 2026', status: 'live', startsAt: '2026-08-24T19:00:00Z', venue: 'Grand Arena', totalSold: 842, capacity: 1000, grossMinor: 48250000 },
    { id: 'event-2', title: 'Neon Night Concert', status: 'published', startsAt: '2026-09-15T20:00:00Z', venue: 'Club Vista', totalSold: 421, capacity: 500, grossMinor: 9200000 },
    { id: 'event-3', title: 'Tech Innovators Summit', status: 'draft', startsAt: '2026-10-10T09:00:00Z', venue: 'Convention Center', totalSold: 0, capacity: 1500, grossMinor: 0 },
  ];

  return (
    <DashboardLayout title="Events Management" subtitle="Create, edit, configure ticket tiers, and publish organizer events">
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 text-xs font-semibold border border-purple-500/30">All Events</button>
            <button className="px-3 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 hover:text-slate-200 text-xs font-medium">Published</button>
            <button className="px-3 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 hover:text-slate-200 text-xs font-medium">Drafts</button>
          </div>
          <Link href="/events/new" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-xs font-bold shadow-md hover:brightness-110">
            + New Event Workflow
          </Link>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventsList.map((evt) => (
            <div key={evt.id} className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    evt.status === 'live' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                    evt.status === 'published' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {evt.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{new Date(evt.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>

                <h3 className="font-bold text-slate-100 text-base mb-1">{evt.title}</h3>
                <p className="text-xs text-slate-400 mb-4">{evt.venue}</p>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Sales Progress</span>
                    <span className="font-semibold">{evt.totalSold} / {evt.capacity} tickets</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full" style={{ width: `${Math.round((evt.totalSold / evt.capacity) * 100)}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  {evt.grossMinor > 0 ? `₹${(evt.grossMinor / 100).toLocaleString('en-IN')}` : '₹0'}
                </span>
                <Link
                  href={`/events/${evt.id}`}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
                >
                  Manage Command Center →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
