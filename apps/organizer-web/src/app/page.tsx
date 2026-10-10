'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '../components/DashboardLayout';
import { AnimatedMetric, MiniSparkline } from '../components/AnimatedMetric';
import { apiClient } from '../lib/api';
import { useAuth } from '@platform/auth';
import type { OrganizerOverviewDto, Event } from '@platform/types';

export default function OverviewPage() {
  const { profile, user, organizations } = useAuth();
  const [overview, setOverview] = useState<OrganizerOverviewDto | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, eventsRes] = await Promise.all([
        apiClient.getOrganizerOverview<OrganizerOverviewDto>(),
        apiClient.getOrganizerEvents<{ items: Event[]; nextCursor: string | null; hasMore: boolean }>({ limit: '5' }),
      ]);
      if (overviewRes?.data) setOverview(overviewRes.data);
      if (eventsRes?.data?.items) setEvents(eventsRes.data.items);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to synchronize organizer overview with authoritative ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const fmt = (minor: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      (minor || 0) / 100,
    );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return 'badge-green';
      case 'published':
        return 'badge-pink';
      case 'approved':
        return 'badge-cyan';
      case 'under_review':
      case 'submitted':
        return 'badge-yellow';
      case 'cancelled':
      case 'rejected':
        return 'badge-orange';
      default:
        return 'badge-neutral';
    }
  };

  return (
    <DashboardLayout
      title="Overview"
      subtitle="Real-time sales, capacity & event operations"
      actions={
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            {loading ? 'Syncing...' : '↻ Refresh'}
          </button>
          <Link
            href="/events/new"
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all"
          >
            + Create Event
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button type="button" onClick={fetchDashboardData} className="font-bold underline ml-2">
              Retry
            </button>
          </div>
        )}

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card relative overflow-hidden group hover:border-[#1AFF7A]/40 transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="stat-card-label">Gross Sales</span>
              <span className="badge badge-green text-[10px]">Authoritative</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className="stat-card-value text-white">
                {loading && !overview ? (
                  '—'
                ) : (
                  <AnimatedMetric
                    value={overview?.grossTicketSalesMinor ?? 0}
                    formatter={fmt}
                  />
                )}
              </p>
              <MiniSparkline color="#1AFF7A" points={[15, 25, 20, 45, 38, 55, 62, 78, 85, 100]} />
            </div>
            <div className="stat-card-delta up">
              <span className="metric-dot green" /> Net: {loading && !overview ? '—' : fmt(overview?.netOrganizerMinor ?? 0)}
            </div>
          </div>

          <div className="stat-card relative overflow-hidden group hover:border-[#FF2D78]/40 transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="stat-card-label">Tickets Sold</span>
              <span className="badge badge-pink text-[10px]">Confirmed</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className="stat-card-value text-white">
                {loading && !overview ? (
                  '—'
                ) : (
                  <AnimatedMetric
                    value={overview?.totalTicketsSold ?? 0}
                    formatter={(v) => v.toLocaleString('en-IN')}
                  />
                )}
              </p>
              <MiniSparkline color="#FF2D78" points={[10, 18, 25, 22, 35, 42, 40, 58, 65, 80]} />
            </div>
            <div className="stat-card-delta neutral">
              Holds active: {loading && !overview ? '—' : (overview?.totalActiveHolds ?? 0)}
            </div>
          </div>

          <div className="stat-card relative overflow-hidden group hover:border-[#00F0FF]/40 transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="stat-card-label">Active Events</span>
              <span className="badge badge-cyan text-[10px]">Catalog</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className="stat-card-value text-white">
                {loading && !overview ? (
                  '—'
                ) : (
                  <AnimatedMetric
                    value={overview?.totalActiveEvents ?? events.length}
                    formatter={(v) => v.toString()}
                  />
                )}
              </p>
              <MiniSparkline color="#00F0FF" points={[1, 2, 2, 3, 3, 4, 4, 5, 5, 6]} />
            </div>
            <div className="stat-card-delta up">
              Capacity util: {loading && !overview ? '—' : `${overview?.averageCapacityUtilization ?? 0}%`}
            </div>
          </div>

          <div className="stat-card relative overflow-hidden group hover:border-[#FFE500]/40 transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="stat-card-label">Promoter Commissions</span>
              <span className="badge badge-yellow text-[10px]">Affiliates</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className="stat-card-value text-white">
                {loading && !overview ? (
                  '—'
                ) : (
                  <AnimatedMetric
                    value={overview?.promoterCommissionsMinor ?? 0}
                    formatter={fmt}
                  />
                )}
              </p>
              <MiniSparkline color="#FFE500" points={[5, 8, 12, 10, 15, 22, 20, 28, 32, 40]} />
            </div>
            <div className="stat-card-delta neutral">
              Refunds: {loading && !overview ? '—' : fmt(overview?.refundsMinor ?? 0)}
            </div>
          </div>
        </div>

        {/* ── Active Events & Quick Controls ─────────────────────────────────── */}
        <div className="surface-card">
          <div className="surface-card-header flex justify-between items-center">
            <div>
              <h3 className="surface-card-title">Live & Upcoming Events</h3>
              <p className="surface-card-subtitle">Real-time status, capacities & sales velocity</p>
            </div>
            <Link href="/events" className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors">
              View All ({events.length}) →
            </Link>
          </div>
          <div className="surface-card-body p-0">
            {loading && events.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Synchronizing event catalog...
              </div>
            ) : events.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 text-xl">
                  🎪
                </div>
                <h4 className="text-sm font-bold text-white">No active events created yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Launch your first concert, conference, or workshop to configure ticket tiers and start processing attendee bookings.
                </p>
                <Link
                  href="/events/new"
                  className="inline-block mt-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
                >
                  Create Your First Event
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/60 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Event</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Venue</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {events.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-white block text-sm">{evt.title}</span>
                          <span className="text-slate-500 text-[10px] font-mono">ID: {evt.id}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`badge ${getStatusBadge(evt.status)} text-[10px]`}>
                            ● {evt.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {evt.startsAt ? new Date(evt.startsAt).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : 'TBA'}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {(evt as any).venueName ?? (evt as any).venue?.name ?? 'Main Arena'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/events/${evt.id}`}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] font-medium transition-colors"
                          >
                            Manage →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
