'use client';

import React from 'react';
import { VenueLayout } from '../../components/VenueLayout';

export default function VenueEventsPage() {
  const hostedEvents = [
    { id: 'evt-1', title: 'Summer Fest 2026', startsAt: '24 Aug 2026', status: 'published', ticketsSold: 842, venueCapacity: 5000 },
    { id: 'evt-2', title: 'Tech Summit 2026', startsAt: '10 Oct 2026', status: 'draft', ticketsSold: 0, venueCapacity: 5000 },
  ];

  return (
    <VenueLayout title="Hosted Events" subtitle="Events hosted at this venue and venue occupancy progress">
      <div className="space-y-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <h3 className="text-base font-bold text-slate-200 mb-4">Hosted Events Progress</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Event Title</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Tickets Sold</th>
                  <th className="py-2.5 px-3">Occupancy Rate</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {hostedEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-semibold text-slate-200">{evt.title}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono">{evt.startsAt}</td>
                    <td className="py-3 px-3 text-slate-300 font-mono">{evt.ticketsSold} / {evt.venueCapacity}</td>
                    <td className="py-3 px-3">
                      <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${Math.round((evt.ticketsSold / evt.venueCapacity) * 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                        {evt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </VenueLayout>
  );
}
