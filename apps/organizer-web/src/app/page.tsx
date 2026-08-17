'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '../components/DashboardLayout';
import { apiClient, ApiError } from '../lib/api';
import type { OrganizerOverviewDto, Event } from '@platform/types';

export default function OverviewPage() {
  const [overview, setOverview] = useState<OrganizerOverviewDto | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, eventsRes] = await Promise.all([
        apiClient.getOrganizerOverview<OrganizerOverviewDto>(),
        apiClient.getOrganizerEvents<{ items: Event[]; nextCursor: string | null; hasMore: boolean }>({ limit: '5' }),
      ]);

      setOverview(overviewRes.data);
      setEvents(eventsRes.data.items ?? []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load organizer dashboard metrics');
      } else {
        setError(err?.message || 'An unexpected error occurred while communicating with the server.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = (minor: number) => {
    const rupees = minor / 100;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rupees);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse';
      case 'published':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'approved':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'under_review':
      case 'submitted':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <DashboardLayout title="Dashboard Overview" subtitle="Operational metrics & real-time event status summary">
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-900/60 rounded-xl border border-slate-800" />
            ))}
          </div>
          <div className="h-64 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
        </div>
      ) : error ? (
        <div className="glass-panel p-8 rounded-2xl border border-red-900/40 text-center max-w-lg mx-auto my-12">
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-700 flex items-center justify-center mx-auto mb-4 text-red-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Unable to Load Overview</h3>
          <p className="text-xs text-slate-400 mb-5">{error}</p>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Retry Request
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-slate-400 font-medium">Gross Sales</span>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold">Authoritative</span>
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
                  style={{ width: `${Math.min(100, overview?.averageCapacityUtilization ?? 0)}%` }}
                />
              </div>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-slate-400 font-medium">Active Events</span>
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-semibold">Live Feed</span>
              </div>
              <p className="text-2xl font-bold text-slate-100">{overview?.totalActiveEvents ?? 0}</p>
              <p className="text-[11px] text-slate-500 mt-1">Published / Live Events</p>
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

              {events.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-sm font-semibold text-slate-300">No events found</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Get started by creating your first event workflow.</p>
                  <Link
                    href="/events/new"
                    className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    + Create First Event
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-4 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100">{evt.title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusBadge(evt.status)}`}>
                            {evt.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Starts {new Date(evt.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · Capacity: {evt.capacity ?? 'Flexible'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link
                          href={`/events/${evt.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                        >
                          Command Center →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-200 mb-3">Organizer Quick Actions</h3>
                <div className="space-y-2.5">
                  <Link
                    href="/events/new"
                    className="block p-3 rounded-lg bg-purple-600/10 border border-purple-500/30 hover:bg-purple-600/20 transition-all"
                  >
                    <p className="text-xs font-bold text-purple-300">🎪 Create Event Workflow</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Publish new tickets & experiences</p>
                  </Link>

                  <Link
                    href="/orders"
                    className="block p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all"
                  >
                    <p className="text-xs font-bold text-slate-200">🎟️ View Order Receipts</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Attendee orders & ticket records</p>
                  </Link>

                  <Link
                    href="/promoters"
                    className="block p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all"
                  >
                    <p className="text-xs font-bold text-slate-200">🚀 Promoter Campaigns</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Affiliate codes & sales tracking</p>
                  </Link>

                  <Link
                    href="/team"
                    className="block p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all"
                  >
                    <p className="text-xs font-bold text-slate-200">👥 Organization Team</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Staff roles & invitations</p>
                  </Link>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80">
                <p className="text-[11px] text-slate-500">Connected to authoritative production database ledger.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
