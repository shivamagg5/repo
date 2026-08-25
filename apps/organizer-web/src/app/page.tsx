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
    <DashboardLayout title="Dashboard Overview" subtitle="Real-time ticket sales, capacity tracking, and event operations">
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card skeleton h-32" />
            ))}
          </div>
          <div className="surface-card skeleton h-72" />
        </div>
      ) : error ? (
        <div className="surface-card p-8 text-center max-w-lg mx-auto my-12 border-red-500/30">
          <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-600/50 flex items-center justify-center mx-auto mb-4 text-red-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="font-display text-2xl text-white mb-1 tracking-wide uppercase">Unable to Load Overview</h3>
          <p className="text-xs text-slate-400 mb-5">{error}</p>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="btn-primary text-xs"
          >
            Retry Request
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Gross Sales</span>
                <span className="badge badge-green text-[10px]">Authoritative</span>
              </div>
              <p className="stat-card-value text-white mt-1">{formatCurrency(overview?.grossTicketSalesMinor ?? 0)}</p>
              <div className="stat-card-delta up">
                <span className="metric-dot green" />
                Net: {formatCurrency(overview?.netOrganizerMinor ?? 0)}
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Tickets Sold</span>
                <span className="badge badge-pink text-[10px]">Confirmed</span>
              </div>
              <p className="stat-card-value text-white mt-1">{(overview?.totalTicketsSold ?? 0).toLocaleString('en-IN')}</p>
              <div className="stat-card-delta neutral">
                <span className="metric-dot pink" />
                Active Holds: {overview?.totalActiveHolds ?? 0}
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Capacity Util</span>
                <span className="badge badge-cyan text-[10px]">Average</span>
              </div>
              <p className="stat-card-value text-white mt-1">{overview?.averageCapacityUtilization ?? 0}%</p>
              <div className="w-full bg-surface-3 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-hot h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, overview?.averageCapacityUtilization ?? 0)}%` }}
                />
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Active Events</span>
                <span className="badge badge-orange text-[10px]">Live Feed</span>
              </div>
              <p className="stat-card-value text-white mt-1">{overview?.totalActiveEvents ?? 0}</p>
              <div className="stat-card-delta up">
                <span className="metric-dot orange" />
                Published & Scheduled
              </div>
            </div>
          </div>

          {/* Active Events & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Events Console Feed */}
            <div className="lg:col-span-2 surface-card">
              <div className="surface-card-header">
                <h3 className="surface-card-title flex items-center gap-2">
                  <span className="metric-dot pink" />
                  Active Event Operational Feed
                </h3>
                <Link href="/events" className="text-xs text-pink hover:text-orange font-semibold transition-colors">
                  View All Events →
                </Link>
              </div>

              <div className="surface-card-body">
                {events.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border rounded-xl">
                    <p className="font-display text-xl text-white tracking-wide uppercase">No Events Scheduled</p>
                    <p className="text-xs text-slate-400 mt-1 mb-5">Get started by creating your first event experience.</p>
                    <Link
                      href="/events/new"
                      className="btn-primary text-xs"
                    >
                      + Create First Event
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-4 rounded-xl bg-surface-2 border border-border flex items-center justify-between hover:border-pink/40 hover:bg-surface-3/60 transition-all group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-slate-100 group-hover:text-pink transition-colors">{evt.title}</h4>
                            <span className={`badge ${getStatusBadge(evt.status)} text-[10px]`}>
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
                            className="btn-secondary text-xs py-1.5 px-3.5"
                          >
                            Manage →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="surface-card flex flex-col justify-between">
              <div>
                <div className="surface-card-header">
                  <h3 className="surface-card-title flex items-center gap-2">
                    <span className="metric-dot orange" />
                    Quick Actions
                  </h3>
                </div>
                <div className="surface-card-body space-y-3">
                  <Link
                    href="/events/new"
                    className="block p-3.5 rounded-xl bg-pink-dim border border-pink/30 hover:border-pink hover:glow-pink transition-all group"
                  >
                    <p className="text-xs font-bold text-pink group-hover:text-white transition-colors">🎪 Create Event Experience</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Publish new ticket tiers & seating maps</p>
                  </Link>

                  <Link
                    href="/orders"
                    className="block p-3.5 rounded-xl bg-surface-2 border border-border hover:border-border-strong hover:bg-surface-3 transition-all"
                  >
                    <p className="text-xs font-bold text-slate-100">🎟️ View Order Receipts</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Attendee orders & ticket records</p>
                  </Link>

                  <Link
                    href="/promoters"
                    className="block p-3.5 rounded-xl bg-surface-2 border border-border hover:border-border-strong hover:bg-surface-3 transition-all"
                  >
                    <p className="text-xs font-bold text-slate-100">🚀 Promoter Campaigns</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Affiliate codes & sales tracking</p>
                  </Link>

                  <Link
                    href="/team"
                    className="block p-3.5 rounded-xl bg-surface-2 border border-border hover:border-border-strong hover:bg-surface-3 transition-all"
                  >
                    <p className="text-xs font-bold text-slate-100">👥 Organization Team</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Staff roles & scanner permissions</p>
                  </Link>
                </div>
              </div>

              <div className="p-4 mx-4 mb-4 rounded-xl bg-surface-0 border border-border text-center">
                <p className="text-[11px] text-slate-400 font-mono">⚡ Connected to Authoritative Ledger</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
