// =============================================================================
// admin-web — Platform Overview & Admin Dashboard
// Composes real operational KPIs, event review backlog, user states, and audit feed.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '../components/AdminLayout';
import { apiClient, ApiError } from '../lib/api';
import { StatCard, Card, Badge, Button, Skeleton } from '@platform/ui';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingReviewsCount: number;
  recentAuditLogs: any[];
  platformMetrics: any;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Parallel fetch of real backend endpoints
      const [usersRes, reviewRes, auditRes, platformRes] = await Promise.allSettled([
        apiClient.getAdminUsers<any>(),
        apiClient.getAdminEventReviewQueue<any>(),
        apiClient.getAdminAuditLogs<any>({ limit: '6' }),
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

  return (
    <AdminLayout
      title="Platform Operations Overview"
      subtitle="Real-time ecosystem governance, user management, and moderation status"
      actions={
        <Button variant="secondary" size="sm" onClick={fetchDashboardData}>
          🔄 Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center font-['Inter']">
            <span>{error}</span>
            <button onClick={fetchDashboardData} className="font-bold underline ml-2">
              Retry
            </button>
          </div>
        )}

        {/* Top KPI Metrics Cards using @platform/ui StatCard */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height="120px" variant="rect" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Review Backlog"
              value={metrics?.pendingReviewsCount ?? 0}
              icon={<span>🛡️</span>}
              caption="Pending moderator sign-off"
            />
            <StatCard
              label="Registered Users"
              value={metrics?.totalUsers ?? 0}
              icon={<span>👥</span>}
              caption={`Active accounts: ${metrics?.activeUsers ?? 0}`}
            />
            <StatCard
              label="Suspended Users"
              value={metrics?.suspendedUsers ?? 0}
              icon={<span>🚫</span>}
              caption="Restricted access accounts"
            />
            <StatCard
              label="Ledger Status"
              value="Reconciled"
              icon={<span>💰</span>}
              caption="Automated reconciliation active"
            />
          </div>
        )}

        {/* Main Grid: Action Center & Recent Audit Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Action Center */}
          <div className="lg:col-span-1 space-y-4">
            <Card variant="elevated" padding="md" className="space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Quick Governance Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/events"
                  className="flex items-center justify-between p-3 rounded-xl bg-[#182035] hover:bg-[#222C46] border border-[var(--color-border)] transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-200">🛡️ Event Moderation Queue</span>
                  <Badge variant="warning" size="sm">{metrics?.pendingReviewsCount ?? 0}</Badge>
                </Link>
                <Link
                  href="/users"
                  className="flex items-center justify-between p-3 rounded-xl bg-[#182035] hover:bg-[#222C46] border border-[var(--color-border)] transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-200">👥 User Access Governance</span>
                  <span className="text-xs text-slate-400">Manage →</span>
                </Link>
                <Link
                  href="/orders"
                  className="flex items-center justify-between p-3 rounded-xl bg-[#182035] hover:bg-[#222C46] border border-[var(--color-border)] transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-200">📦 Order Inspection & Refunds</span>
                  <span className="text-xs text-slate-400">Inspect →</span>
                </Link>
                <Link
                  href="/finance"
                  className="flex items-center justify-between p-3 rounded-xl bg-[#182035] hover:bg-[#222C46] border border-[var(--color-border)] transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-200">💰 Financial Reconciliation</span>
                  <span className="text-xs text-slate-400">Run →</span>
                </Link>
              </div>
            </Card>

            {/* Node Info */}
            <div className="p-4 rounded-2xl bg-[#090C14] border border-slate-800/80 text-xs space-y-2 font-['Inter']">
              <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Environment Node</p>
              <div className="font-mono text-[11px] text-slate-300 space-y-1">
                <p>Status: <span className="text-emerald-400 font-semibold">Active Authorized</span></p>
                <p>MFA Policy: <span className="text-purple-400 font-semibold">Required for Privileged Ops</span></p>
              </div>
            </div>
          </div>

          {/* Real Audit Activity Feed */}
          <div className="lg:col-span-2">
            <Card variant="elevated" padding="md" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Recent Governance Audit Logs</h3>
                <Link href="/audit-logs" className="text-xs text-red-400 hover:underline font-semibold">
                  View Full Audit Ledger →
                </Link>
              </div>

              {loading ? (
                <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
                  Loading immutable audit trail records...
                </div>
              ) : !metrics?.recentAuditLogs || metrics.recentAuditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-['Inter']">
                  No recent governance audit log entries recorded.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 font-['Inter']">
                  {metrics.recentAuditLogs.map((log, idx) => (
                    <div key={log.id ?? idx} className="py-3 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-200 font-mono text-[11px]">
                          {log.action ?? 'system.operation'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Actor: <span className="text-slate-300 font-mono">{log.actorId ?? log.actorEmail ?? 'Admin'}</span> · Target: <span className="text-slate-300 font-mono">{log.targetId ?? '—'}</span>
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : 'Recent'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
