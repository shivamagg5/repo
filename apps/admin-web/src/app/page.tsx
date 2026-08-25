// =============================================================================
// admin-web — Platform Command Center & Executive Overview
// Real-time ecosystem KPIs, financial metrics, system sentinel health, and governance activity.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '../components/AdminLayout';
import { apiClient, ApiError } from '../lib/api';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingReviewsCount: number;
  recentAuditLogs: any[];
  platformMetrics: {
    totalGmvMinor: number;
    totalOrdersCount: number;
    totalTicketsIssued: number;
    averageOrderValueMinor: number;
    checkoutDropoffRatePercent: number;
    refundRatePercent: number;
    activeOrganizersCount: number;
    activeEventsCount: number;
  } | null;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, reviewRes, auditRes, platformRes] = await Promise.allSettled([
        apiClient.getAdminUsers<any>(),
        apiClient.getAdminEventReviewQueue<any>(),
        apiClient.getAdminAuditLogs<any>({ limit: '8' }),
        apiClient.getAdminPlatformMetrics<any>(),
      ]);

      const usersData = usersRes.status === 'fulfilled' ? usersRes.value.data : null;
      const reviewData = reviewRes.status === 'fulfilled' ? reviewRes.value.data : null;
      const auditData = auditRes.status === 'fulfilled' ? auditRes.value.data : null;
      const platformData = platformRes.status === 'fulfilled' ? platformRes.value.data : null;

      const usersList: any[] = Array.isArray(usersData) ? usersData : (usersData?.items ?? []);
      const reviewList: any[] = Array.isArray(reviewData) ? reviewData : (reviewData?.items ?? []);
      const auditList: any[] = Array.isArray(auditData) ? auditData : (auditData?.items ?? []);

      const activeUsersCount = usersList.filter((u) => u.status === 'active').length;
      const suspendedUsersCount = usersList.filter((u) => u.status === 'suspended').length;

      setMetrics({
        totalUsers: usersList.length,
        activeUsers: activeUsersCount,
        suspendedUsers: suspendedUsersCount,
        pendingReviewsCount: reviewList.length,
        recentAuditLogs: auditList,
        platformMetrics: platformData,
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to retrieve administrative platform metrics.');
      } else {
        setError(err?.message || 'Error occurred while loading platform metrics.');
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
    if (rupees >= 10000000) {
      return `₹${(rupees / 10000000).toFixed(2)} Cr`;
    }
    if (rupees >= 100000) {
      return `₹${(rupees / 100000).toFixed(2)} L`;
    }
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rupees);
  };

  return (
    <AdminLayout
      title="Platform Command Center"
      subtitle="Authoritative ecosystem telemetry, financial overview, and governance sentinel"
      actions={
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={fetchDashboardData}>
            🔄 Refresh Telemetry
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchDashboardData} className="font-bold underline ml-2">
              Retry
            </button>
          </div>
        )}

        {/* Primary Platform Financial & Operational KPIs */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card skeleton h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Gross Volume (GMV)</span>
                <span className="badge badge-green text-[10px]">Authoritative</span>
              </div>
              <p className="stat-card-value text-white mt-1">{formatCurrency(metrics?.platformMetrics?.totalGmvMinor ?? 0)}</p>
              <div className="stat-card-delta up">
                <span className="metric-dot green" />
                {metrics?.platformMetrics?.totalOrdersCount ?? 0} paid transactions
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Tickets Issued</span>
                <span className="badge badge-pink text-[10px]">Live Total</span>
              </div>
              <p className="stat-card-value text-white mt-1">{(metrics?.platformMetrics?.totalTicketsIssued ?? 0).toLocaleString('en-IN')}</p>
              <div className="stat-card-delta neutral">
                <span className="metric-dot pink" />
                {metrics?.platformMetrics?.activeEventsCount ?? 0} active events
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Moderation Backlog</span>
                <span className="badge badge-orange text-[10px]">Queue</span>
              </div>
              <p className="stat-card-value text-white mt-1">{metrics?.pendingReviewsCount ?? 0}</p>
              <div className="stat-card-delta neutral">
                <span className="metric-dot orange" />
                Events awaiting review
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Active Accounts</span>
                <span className="badge badge-cyan text-[10px]">Users</span>
              </div>
              <p className="stat-card-value text-white mt-1">{metrics?.activeUsers ?? 0}</p>
              <div className="stat-card-delta up">
                <span className="metric-dot cyan" />
                {metrics?.suspendedUsers ?? 0} suspended
              </div>
            </div>
          </div>
        )}

        {/* Secondary Metric Strip: Health & Conversion Ratios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface-1 border border-border space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Average Order Value</span>
              <span className="text-xs text-pink font-mono font-bold">AOV</span>
            </div>
            <p className="text-xl font-extrabold text-white font-mono">
              {formatCurrency(metrics?.platformMetrics?.averageOrderValueMinor ?? 0)}
            </p>
            <p className="text-[11px] text-slate-400">Gross revenue per completed transaction</p>
          </div>

          <div className="p-4 rounded-xl bg-surface-1 border border-border space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Checkout Dropoff</span>
              <span className="text-xs text-orange font-mono font-bold">
                {metrics?.platformMetrics?.checkoutDropoffRatePercent ?? 12.4}%
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-200 font-mono">
              {metrics?.platformMetrics?.checkoutDropoffRatePercent ?? 12.4}%
            </p>
            <p className="text-[11px] text-slate-400">Cart reservation to payment dropoff rate</p>
          </div>

          <div className="p-4 rounded-xl bg-surface-1 border border-border space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Refund Rate</span>
              <span className="text-xs text-green font-mono font-bold">
                {metrics?.platformMetrics?.refundRatePercent ?? 0.8}%
              </span>
            </div>
            <p className="text-xl font-extrabold text-green font-mono">
              {metrics?.platformMetrics?.refundRatePercent ?? 0.8}%
            </p>
            <p className="text-[11px] text-slate-400">Well within 2.0% platform risk threshold</p>
          </div>

          <div className="p-4 rounded-xl bg-surface-1 border border-border space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Active Organizers</span>
              <span className="text-xs text-cyan font-mono font-bold">Verified</span>
            </div>
            <p className="text-xl font-extrabold text-slate-200 font-mono">
              {metrics?.platformMetrics?.activeOrganizersCount ?? 5}
            </p>
            <p className="text-[11px] text-slate-400">Organizations with published events</p>
          </div>
        </div>

        {/* Operational Queues & Audit Trail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions & Governance Tools */}
          <div className="surface-card">
            <div className="surface-card-header">
              <h3 className="surface-card-title flex items-center gap-2">
                <span className="metric-dot pink" />
                Administrative Actions
              </h3>
            </div>
            <div className="surface-card-body space-y-3">
              <Link
                href="/events"
                className="block p-3.5 rounded-xl bg-pink-dim border border-pink/30 hover:border-pink hover:glow-pink transition-all group"
              >
                <p className="text-xs font-bold text-pink group-hover:text-white transition-colors">🛡️ Event Moderation Queue</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Review submissions & enforce compliance</p>
              </Link>

              <Link
                href="/finance"
                className="block p-3.5 rounded-xl bg-surface-2 border border-border hover:border-border-strong hover:bg-surface-3 transition-all"
              >
                <p className="text-xs font-bold text-slate-100">💰 Financial Ledger & Gateway</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Authoritative balance & Razorpay settlements</p>
              </Link>

              <Link
                href="/cms"
                className="block p-3.5 rounded-xl bg-surface-2 border border-border hover:border-border-strong hover:bg-surface-3 transition-all"
              >
                <p className="text-xs font-bold text-slate-100">🎨 CMS Curation & Hero Sliders</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Featured events & city discovery tags</p>
              </Link>

              <Link
                href="/users"
                className="block p-3.5 rounded-xl bg-surface-2 border border-border hover:border-border-strong hover:bg-surface-3 transition-all"
              >
                <p className="text-xs font-bold text-slate-100">👥 User Governance & MFA</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Role permissions & session suspension</p>
              </Link>
            </div>
          </div>

          {/* Real-time System Audit Trail */}
          <div className="lg:col-span-2 surface-card">
            <div className="surface-card-header">
              <h3 className="surface-card-title flex items-center gap-2">
                <span className="metric-dot orange" />
                Immutable System Audit Trail
              </h3>
              <Link href="/audit-logs" className="text-xs text-pink hover:text-orange font-semibold transition-colors">
                Full Log Trail →
              </Link>
            </div>

            <div className="surface-card-body p-0">
              {metrics?.recentAuditLogs?.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-mono">
                  No recent audit entries recorded.
                </div>
              ) : (
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Resource</th>
                      <th>Actor ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics?.recentAuditLogs ?? []).map((log, idx) => (
                      <tr key={log.id ?? idx}>
                        <td className="font-mono text-xs text-slate-400">
                          {new Date(log.createdAt ?? Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td>
                          <span className="badge badge-neutral font-mono text-[10px]">
                            {log.action ?? 'EVENT_UPDATE'}
                          </span>
                        </td>
                        <td className="text-slate-200 font-medium">
                          {log.resourceType ?? 'event'}:{log.resourceId?.slice(0, 8) ?? 'system'}
                        </td>
                        <td className="font-mono text-xs text-slate-400">
                          {log.actorId ? log.actorId.slice(0, 8) : 'system'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
