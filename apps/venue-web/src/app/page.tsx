'use client';

import React from 'react';
import Link from 'next/link';
import { VenueLayout } from '../components/VenueLayout';

export default function VenueOverviewPage() {
  const venueData = {
    name: 'Grand Arena',
    city: 'Amritsar',
    state: 'Punjab',
    capacity: 5000,
    status: 'active',
    upcomingEvents: [
      { id: 'evt-1', title: 'Summer Fest 2026', startsAt: '24 Aug 2026, 7:00 PM', organizerName: 'Live Nation Org', status: 'published', ticketsSold: 842 },
      { id: 'evt-2', title: 'Tech Summit 2026', startsAt: '10 Oct 2026, 9:00 AM', organizerName: 'Innovate Org', status: 'draft', ticketsSold: 0 },
    ],
  };

  return (
    <VenueLayout title="Venue Dashboard" subtitle="Operational profile summary, hosted events, and booking calendar">
      <div className="space-y-6">
        {/* Venue Profile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Total Venue Capacity</span>
            <p className="text-2xl font-bold text-slate-100 mt-1">{venueData.capacity.toLocaleString('en-IN')} seats</p>
            <p className="text-[11px] text-blue-400 mt-1">Multi-tier seating ready</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Venue Location</span>
            <p className="text-lg font-bold text-slate-100 mt-1">{venueData.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{venueData.city}, {venueData.state}</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Operating Status</span>
            <div className="mt-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                {venueData.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Timezone: Asia/Kolkata</p>
          </div>
        </div>

        {/* Hosted Events Stream */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-200">Upcoming Hosted Events</h3>
            <Link href="/calendar" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
              View Calendar →
            </Link>
          </div>

          <div className="space-y-3">
            {venueData.upcomingEvents.map((evt) => (
              <div key={evt.id} className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">{evt.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Organizer: {evt.organizerName} · {evt.startsAt}</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                    {evt.status}
                  </span>
                  <p className="text-xs text-slate-300 mt-1 font-mono">{evt.ticketsSold} tickets sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </VenueLayout>
  );
}
