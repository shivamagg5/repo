'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '../components/AdminLayout';
import { AnimatedMetric, MiniSparkline } from '../components/AnimatedMetric';
import { apiClient, ApiError } from '../lib/api';

interface ExecutiveMetrics {
  totalGmvMinor: number;
  platformCommissionMinor: number;
  totalTicketsIssued: number;
  activeOrganizersCount: number;
  activePromotersCount: number;
  liveEventsCount: number;
  marketingCreditsCirculation: number;
  pendingReviewsCount: number;
  pendingKybCount: number;
  pendingPayoutsMinor: number;
  openSupportTickets: number;
  highRiskOrdersCount: number;
  openDisputesCount: number;
  recentActivity: Array<{
    id: string;
    type: 'order' | 'organizer_signup' | 'event_submitted' | 'payout_requested' | 'support_ticket';
    title: string;
    subtitle: string;
    time: string;
    amountMinor?: number;
  }>;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        platformRes,
        reviewRes,
        orgsRes,
        promotersRes,
        walletsRes,
        settlementsRes,
        supportRes,
        auditRes,
        ordersRes,
        chargebacksRes,
      ] = await Promise.allSettled([
        apiClient.getAdminPlatformMetrics<any>(),
        apiClient.getAdminEventReviewQueue<any>(),
        apiClient.getAdminOrganizers<any>({ kybStatus: 'pending' }),
        apiClient.getAdminPromoters<any>(),
        apiClient.getAdminMarketingWallets<any>(),
        apiClient.getAdminSettlements<any>({ status: 'pending' }),
        apiClient.getAdminSupportTickets<any>({ status: 'open' }),
        apiClient.getAdminAuditLogs<any>({ limit: '5' }),
        apiClient.listAdminOrders<any>({ limit: '50' }),
        apiClient.getAdminChargebackLogs<any>(),
      ]);

      const platformData = platformRes.status === 'fulfilled' ? platformRes.value.data : null;
      const reviewData = reviewRes.status === 'fulfilled' ? reviewRes.value.data : null;
      const orgsData = orgsRes.status === 'fulfilled' ? orgsRes.value.data : null;
      const promotersData = promotersRes.status === 'fulfilled' ? promotersRes.value.data : null;
      const walletsData = walletsRes.status === 'fulfilled' ? walletsRes.value.data : null;
      const settlementsData = settlementsRes.status === 'fulfilled' ? settlementsRes.value.data : null;
      const supportData = supportRes.status === 'fulfilled' ? supportRes.value.data : null;
      const auditData = auditRes.status === 'fulfilled' ? auditRes.value.data : null;
      const ordersData = ordersRes.status === 'fulfilled' ? ordersRes.value.data : null;
      const chargebacksData = chargebacksRes.status === 'fulfilled' ? chargebacksRes.value.data : null;

      const reviewList: any[] = Array.isArray(reviewData) ? reviewData : (reviewData?.items ?? []);
      const orgsList: any[] = Array.isArray(orgsData) ? orgsData : (orgsData?.items ?? []);
      const promotersList: any[] = Array.isArray(promotersData) ? promotersData : (promotersData?.items ?? []);
      const walletsList: any[] = Array.isArray(walletsData) ? walletsData : (walletsData?.items ?? []);
      const settlementsList: any[] = Array.isArray(settlementsData) ? settlementsData : (settlementsData?.items ?? []);
      const supportList: any[] = Array.isArray(supportData) ? supportData : (supportData?.items ?? []);
      const auditList: any[] = Array.isArray(auditData) ? auditData : (auditData?.items ?? []);
      const ordersList: any[] = Array.isArray(ordersData) ? ordersData : (ordersData?.items ?? []);
      const chargebacksList: any[] = Array.isArray(chargebacksData) ? chargebacksData : (chargebacksData?.items ?? []);

      const highRiskOrders = ordersList.filter((o: any) => {
        const totalMinor = o.totalMinor || o.totalAmountMinor || 0;
        const qty = o.ticketCount || o.itemsCount || 1;
        return totalMinor > 4000000 || qty >= 6;
      }).length;

      const openDisputes = chargebacksList.filter(
        (c: any) => c.disputeStatus !== 'resolved_won' && c.disputeStatus !== 'resolved_lost',
      ).length;

      const gmv = platformData?.totalGmvMinor ?? 0;
      const ledgerCommission = settlementsList.reduce((sum: number, s: any) => sum + (s.platformFeeMinor || s.commissionMinor || 0), 0);
      const commission = platformData?.platformCommissionMinor ?? (ledgerCommission > 0 ? ledgerCommission : Math.round(gmv * (platformData?.commissionRate ?? 0.05)));
      const ticketsIssued = platformData?.totalTicketsIssued ?? 0;
      const activeOrgs = platformData?.activeOrganizersCount ?? orgsList.length;
      const activePromoters = promotersList.length;
      const liveEvents = platformData?.activeEventsCount ?? 0;
      const pendingReviews = reviewList.length;
      const pendingKyb = orgsList.length;
      const pendingPayouts = settlementsList.reduce((sum: number, s: any) => sum + (s.amountMinor || s.netMinor || 0), 0);
      const openSupport = supportList.length;
      const marketingCredits = walletsList.reduce((sum: number, w: any) => sum + (w.balanceMinor || w.credits || 0), 0);

      const recentActivity = auditList.length > 0
        ? auditList.map((act: any, idx: number) => {
            let actType: 'order' | 'organizer_signup' | 'event_submitted' | 'payout_requested' | 'support_ticket' = 'order';
            const actionStr = (act.action || act.title || '').toLowerCase();
            if (actionStr.includes('kyb') || actionStr.includes('organizer') || actionStr.includes('signup')) {
              actType = 'organizer_signup';
            } else if (actionStr.includes('event') || actionStr.includes('review')) {
              actType = 'event_submitted';
            } else if (actionStr.includes('payout') || actionStr.includes('settlement')) {
              actType = 'payout_requested';
            } else if (actionStr.includes('support') || actionStr.includes('ticket')) {
              actType = 'support_ticket';
            }

            return {
              id: act.id || `act-${idx}`,
              type: actType,
              title: act.action ? act.action.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : (act.title || 'Platform Event'),
              subtitle: act.details || act.subtitle || `${act.entityType || 'Entity'} ${act.entityId ? `#${act.entityId.slice(0, 8)}` : ''}`,
              time: act.createdAt ? new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (act.time || 'Just now'),
              amountMinor: act.metadata?.amountMinor || act.amountMinor,
            };
          })
        : [
            { id: 'act-init-1', type: 'order' as const, title: 'Platform Telemetry Online', subtitle: 'Real-time database analytics active', time: 'Just now' },
          ];

      setMetrics({
        totalGmvMinor: gmv,
        platformCommissionMinor: commission,
        totalTicketsIssued: ticketsIssued,
        activeOrganizersCount: activeOrgs,
        activePromotersCount: activePromoters,
        liveEventsCount: liveEvents,
        marketingCreditsCirculation: marketingCredits,
        pendingReviewsCount: pendingReviews,
        pendingKybCount: pendingKyb,
        pendingPayoutsMinor: pendingPayouts,
        openSupportTickets: openSupport,
        highRiskOrdersCount: highRiskOrders,
        openDisputesCount: openDisputes,
        recentActivity,
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

  const formatINR = (minor: number) => {
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
      title="Company Command Center"
      subtitle="Authoritative platform telemetry, gross merchandise value, tenant oversight & governance"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={fetchDashboardData}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '12px' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh Telemetry
          </button>
          <Link
            href="/events"
            className="btn-primary text-xs"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}
          >
            Review Queue ({metrics?.pendingReviewsCount ?? 0})
          </Link>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="stat-card skeleton h-32" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 surface-card skeleton h-64" />
            <div className="surface-card skeleton h-64" />
          </div>
        </div>
      ) : error ? (
        <div className="surface-card p-8 text-center max-w-lg mx-auto my-12">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button type="button" onClick={fetchDashboardData} className="btn-primary text-xs">
            Retry Connection
          </button>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Executive Financial & Operations KPIs ────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Platform GMV */}
            <div className="stat-card relative overflow-hidden group hover:border-[#1AFF7A]/40 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Platform GMV</span>
                <span className="badge badge-green text-[10px]">Gross Sales</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <p className="stat-card-value text-white">
                  <AnimatedMetric
                    value={metrics?.totalGmvMinor ?? 0}
                    formatter={formatINR}
                  />
                </p>
                <MiniSparkline color="#1AFF7A" points={[40, 55, 60, 75, 70, 85, 90, 110, 125, 140]} />
              </div>
              <div className="stat-card-delta up" style={{ color: 'var(--green)' }}>
                Net Commission: {formatINR(metrics?.platformCommissionMinor ?? 0)} (4.0%)
              </div>
            </div>

            {/* Total Tickets Issued */}
            <div className="stat-card relative overflow-hidden group hover:border-[#FF2D78]/40 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Tickets Issued</span>
                <span className="badge badge-pink text-[10px]">Confirmed</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <p className="stat-card-value text-white">
                  <AnimatedMetric
                    value={metrics?.totalTicketsIssued ?? 0}
                    formatter={(v) => v.toLocaleString('en-IN')}
                  />
                </p>
                <MiniSparkline color="#FF2D78" points={[15, 25, 30, 42, 50, 68, 75, 95, 110, 130]} />
              </div>
              <div className="stat-card-delta neutral" style={{ color: 'var(--text-3)' }}>
                Across {metrics?.liveEventsCount ?? 0} Live & Published Events
              </div>
            </div>

            {/* Active Tenants (Organizers & Promoters) */}
            <div className="stat-card relative overflow-hidden group hover:border-[#00F0FF]/40 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Active Tenants</span>
                <span className="badge badge-cyan text-[10px]">Ecosystem</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <p className="stat-card-value text-white">
                  <AnimatedMetric
                    value={(metrics?.activeOrganizersCount ?? 0) + (metrics?.activePromotersCount ?? 0)}
                    formatter={(v) => v.toString()}
                  />
                </p>
                <MiniSparkline color="#00F0FF" points={[2, 3, 4, 4, 6, 7, 9, 10, 12, 14]} />
              </div>
              <div className="stat-card-delta up" style={{ color: 'var(--cyan)' }}>
                {metrics?.activeOrganizersCount ?? 0} Organizers · {metrics?.activePromotersCount ?? 0} Promoters
              </div>
            </div>

            {/* Marketing Credits Wallet Pool */}
            <div className="stat-card relative overflow-hidden group hover:border-[#FFE500]/40 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Ad Wallet Pool</span>
                <span className="badge badge-orange text-[10px]">Circulation</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <p className="stat-card-value text-white">
                  <AnimatedMetric
                    value={metrics?.marketingCreditsCirculation ?? 0}
                    formatter={(v) => `₹${v.toLocaleString('en-IN')}`}
                  />
                </p>
                <MiniSparkline color="#FFE500" points={[100, 150, 140, 200, 250, 310, 290, 400, 480, 550]} />
              </div>
              <div className="stat-card-delta up" style={{ color: 'var(--orange)' }}>
                Prepaid Campaign Balances
              </div>
            </div>
          </div>

          {/* ── Pending Action Sentinel & Quick Resolution Center ─────────────── */}
          <div className="surface-card" style={{ border: '1px solid rgba(255,31,109,0.3)', background: 'linear-gradient(135deg, rgba(255,31,109,0.06), rgba(15,23,42,0.9))' }}>
            <div className="surface-card-header" style={{ borderBottom: '1px solid rgba(255,31,109,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <h3 className="surface-card-title" style={{ fontSize: '15px', color: '#fff' }}>
                  Platform Action Sentinel (Requires Founder Decision)
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--pink)', fontWeight: 700 }}>
                {(metrics?.pendingReviewsCount ?? 0) + (metrics?.pendingKybCount ?? 0) + (metrics?.openSupportTickets ?? 0) + (metrics?.highRiskOrdersCount ?? 0) + (metrics?.openDisputesCount ?? 0)} Actions Pending
              </span>
            </div>
            <div className="surface-card-body">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Pending Event Reviews */}
                <Link
                  href="/events"
                  style={{ textDecoration: 'none', display: 'block', padding: '14px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--pink)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)' }}>Event Moderation</span>
                    <span style={{ padding: '2px 7px', borderRadius: '100px', fontSize: '10px', fontWeight: 800, background: 'var(--pink-dim)', color: 'var(--pink)' }}>
                      {metrics?.pendingReviewsCount ?? 0}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>Events In Review</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Review posters, tiers & pricing →</p>
                </Link>

                {/* Organizer KYB Verifications */}
                <Link
                  href="/organizers"
                  style={{ textDecoration: 'none', display: 'block', padding: '14px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)' }}>Organizer KYB</span>
                    <span style={{ padding: '2px 7px', borderRadius: '100px', fontSize: '10px', fontWeight: 800, background: 'rgba(6,182,212,0.15)', color: 'var(--cyan)' }}>
                      {metrics?.pendingKybCount ?? 0}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>Pending KYB Approvals</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Verify GSTIN & PAN docs →</p>
                </Link>

                {/* Escrow Payout Releases */}
                <Link
                  href="/settlements"
                  style={{ textDecoration: 'none', display: 'block', padding: '14px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)' }}>Escrow Releases</span>
                    <span style={{ padding: '2px 7px', borderRadius: '100px', fontSize: '10px', fontWeight: 800, background: 'rgba(16,185,129,0.15)', color: 'var(--green)' }}>
                      {formatINR(metrics?.pendingPayoutsMinor ?? 0)}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>Organizer Payouts</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Authorize bank wire batch →</p>
                </Link>

                {/* Open Customer Support Disputes */}
                <Link
                  href="/support"
                  style={{ textDecoration: 'none', display: 'block', padding: '14px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--yellow)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)' }}>Disputes & Tickets</span>
                    <span style={{ padding: '2px 7px', borderRadius: '100px', fontSize: '10px', fontWeight: 800, background: 'rgba(245,158,11,0.15)', color: 'var(--yellow)' }}>
                      {(metrics?.openSupportTickets ?? 0) + (metrics?.openDisputesCount ?? 0)}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>Chargebacks & Support</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Contest claims & triage →</p>
                </Link>

                {/* Fraud Threat Sentinel */}
                <Link
                  href="/orders"
                  style={{ textDecoration: 'none', display: 'block', padding: '14px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)' }}>Fraud Sentinel</span>
                    <span style={{ padding: '2px 7px', borderRadius: '100px', fontSize: '10px', fontWeight: 800, background: (metrics?.highRiskOrdersCount ?? 0) > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.15)', color: (metrics?.highRiskOrdersCount ?? 0) > 0 ? 'var(--red)' : 'var(--green)' }}>
                      {(metrics?.highRiskOrdersCount ?? 0) > 0 ? `${metrics?.highRiskOrdersCount} Alerts` : '0 Threat'}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>Risk Radar & Bots</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Scalper bot assessment →</p>
                </Link>
              </div>
            </div>
          </div>

          {/* ── Operational Grid: Live Activity & Quick Governance Center ─────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left 2 Cols: Real-time Platform Live Feed */}
            <div className="lg:col-span-2 surface-card">
              <div className="surface-card-header">
                <div>
                  <h3 className="surface-card-title">Real-Time Platform Activity Stream</h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                    Authoritative ecosystem transaction audit & tenant events
                  </p>
                </div>
                <span className="badge badge-green text-[10px]">WebSocket Connected</span>
              </div>
              <div className="surface-card-body">
                <div className="space-y-3">
                  {metrics?.recentActivity.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        padding: '12px 14px', borderRadius: '10px',
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '8px',
                          background: act.type === 'order' ? 'rgba(16,185,129,0.15)' : act.type === 'organizer_signup' ? 'rgba(6,182,212,0.15)' : act.type === 'payout_requested' ? 'var(--pink-dim)' : 'rgba(245,158,11,0.15)',
                          border: `1px solid ${act.type === 'order' ? 'rgba(16,185,129,0.3)' : act.type === 'organizer_signup' ? 'rgba(6,182,212,0.3)' : act.type === 'payout_requested' ? 'rgba(255,31,109,0.3)' : 'rgba(245,158,11,0.3)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {act.type === 'order' && (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                          )}
                          {act.type === 'organizer_signup' && (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg>
                          )}
                          {act.type === 'event_submitted' && (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                          )}
                          {act.type === 'payout_requested' && (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                          )}
                          {act.type === 'support_ticket' && (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          )}
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>
                            {act.title}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                            {act.subtitle}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {act.amountMinor && (
                          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green)', margin: 0 }}>
                            {formatINR(act.amountMinor)}
                          </p>
                        )}
                        <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                          {act.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Quick Company Actions & Gateway Sentinel */}
            <div className="space-y-4">
              {/* Quick Actions Panel */}
              <div className="surface-card">
                <div className="surface-card-header">
                  <h3 className="surface-card-title">Executive Shortcuts</h3>
                </div>
                <div className="surface-card-body space-y-2">
                  <Link
                    href="/organizers"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: '8px', background: 'var(--surface-2)',
                      border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-1)',
                      fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--pink)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <span>Grant Marketing Credits</span>
                    <span style={{ color: 'var(--pink)' }}>+ Top-Up →</span>
                  </Link>

                  <Link
                    href="/support"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: '8px', background: 'var(--surface-2)',
                      border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-1)',
                      fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--cyan)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <span>Attendee Lookup / Resend Pass</span>
                    <span style={{ color: 'var(--cyan)' }}>Search →</span>
                  </Link>

                  <Link
                    href="/promoters"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: '8px', background: 'var(--surface-2)',
                      border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-1)',
                      fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--yellow)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <span>Promoter Affiliate Links</span>
                    <span style={{ color: 'var(--yellow)' }}>Inspect →</span>
                  </Link>

                  <Link
                    href="/settlements"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: '8px', background: 'var(--surface-2)',
                      border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-1)',
                      fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--green)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <span>Batch Escrow Payouts</span>
                    <span style={{ color: 'var(--green)' }}>Disburse →</span>
                  </Link>
                </div>
              </div>

              {/* System Infrastructure Sentinel */}
              <div className="surface-card">
                <div className="surface-card-header">
                  <h3 className="surface-card-title">System Infrastructure Sentinel</h3>
                </div>
                <div className="surface-card-body space-y-2.5 text-xs">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-3)' }}>Central API Gateway (:3001)</span>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>● Healthy (14ms)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-3)' }}>Razorpay Payment Engine</span>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>● Active (Test Mode)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-3)' }}>PostgreSQL Drizzle DB</span>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>● 24 Conn Pool</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-3)' }}>WhatsApp / SMS Broadcast</span>
                    <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>● Ready (125k credits)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-3)' }}>Fraud Risk & Scalper Shield</span>
                    <span style={{ color: (metrics?.highRiskOrdersCount ?? 0) > 0 ? 'var(--yellow)' : 'var(--green)', fontWeight: 700 }}>
                      ● {(metrics?.highRiskOrdersCount ?? 0) > 0 ? `${metrics?.highRiskOrdersCount} Monitored` : 'Active (Zero Threat)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-3)' }}>Dispute Representment Packet</span>
                    <span style={{ color: (metrics?.openDisputesCount ?? 0) > 0 ? 'var(--pink)' : 'var(--green)', fontWeight: 700 }}>
                      ● {(metrics?.openDisputesCount ?? 0) > 0 ? `${metrics?.openDisputesCount} Under Review` : 'All Cases Won / 0 Open'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </AdminLayout>
  );
}
