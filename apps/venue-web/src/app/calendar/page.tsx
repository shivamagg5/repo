'use client';

import React from 'react';
import { VenueLayout } from '../../components/VenueLayout';

export default function VenueCalendarPage() {
  const calendarData = {
    venueName: 'Grand Arena',
    timezone: 'Asia/Kolkata',
    events: [
      { id: 'evt-1', title: 'Summer Fest 2026', startsAt: '24 Aug 2026', endsAt: '24 Aug 2026', organizerName: 'Live Nation Org', status: 'published' },
      { id: 'evt-2', title: 'Tech Summit 2026', startsAt: '10 Oct 2026', endsAt: '12 Oct 2026', organizerName: 'Innovate Org', status: 'draft' },
    ],
  };

  return (
    <VenueLayout title="Booking Calendar" subtitle="Hosted event date availability and occupied schedule in Asia/Kolkata timezone">
      <div className="space-y-6">
        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-slate-100">{calendarData.venueName} Calendar</h3>
            <p className="text-xs text-slate-400">Canonical Timezone: <span className="font-mono text-blue-300">{calendarData.timezone}</span></p>
          </div>
          <span className="text-xs px-3 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-full font-semibold">
            {calendarData.events.length} Booked Events
          </span>
        </div>

        {/* Interactive Calendar Visual Grid */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-slate-200">August 2026 Availability Grid</h4>
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="py-1.5 font-bold text-slate-400 bg-slate-900/60 rounded border border-slate-800">{day}</div>
            ))}
            {Array.from({ length: 31 }).map((_, idx) => {
              const dayNum = idx + 1;
              const isOccupied = dayNum === 24;
              return (
                <div
                  key={dayNum}
                  className={`p-3 rounded-lg border text-left min-h-[70px] flex flex-col justify-between ${
                    isOccupied
                      ? 'bg-purple-600/20 border-purple-500/40 text-purple-200 shadow-sm'
                      : 'bg-slate-900/40 border-slate-800/60 text-slate-300'
                  }`}
                >
                  <span className="font-bold text-xs">{dayNum}</span>
                  {isOccupied && (
                    <span className="text-[10px] bg-purple-500/30 text-purple-200 px-1 py-0.5 rounded truncate font-medium">
                      Summer Fest
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendar Bookings Table */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <h4 className="text-sm font-bold text-slate-200 mb-3">Occupied Event Date Ranges</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Event Title</th>
                  <th className="py-2.5 px-3">Organizer</th>
                  <th className="py-2.5 px-3">Start Date</th>
                  <th className="py-2.5 px-3">End Date</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {calendarData.events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-semibold text-slate-200">{evt.title}</td>
                    <td className="py-3 px-3 text-slate-400">{evt.organizerName}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{evt.startsAt}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{evt.endsAt}</td>
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
