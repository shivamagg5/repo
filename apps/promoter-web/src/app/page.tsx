// =============================================================================
// promoter-web — Promoter Overview Dashboard
// =============================================================================
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PromoterLayout } from '../components/PromoterLayout';
import { apiClient, ApiError } from '../lib/api';
import { PromoterTierMilestone } from '../components/PromoterTierMilestone';
import { ShareCampaignModal } from '../components/ShareCampaignModal';

type Campaign = {
  id: string;
  code: string;
  eventId: string;
  eventSlug?: string;
  eventTitle?: string;
  event?: { slug?: string; title?: string };
  commissionType?: 'percentage' | 'fixed' | string;
  commissionValue?: number;
  status?: string;
};

type Commission = {
  id: string;
  amountMinor?: number;
  commissionEarnedMinor?: number;
  status?: string;
  createdAt?: string;
  eventTitle?: string;
  event?: { title?: string };
};

type EarningsSummary = {
  pendingCommissionMinor?: number;
  approvedCommissionMinor?: number;
  paidCommissionMinor?: number;
};

const formatCurrency = (minor: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(minor / 100);

const formatCommission = (campaign: Campaign) =>
  campaign.commissionType === 'fixed'
    ? `${formatCurrency(campaign.commissionValue ?? 0)} per order`
    : `${campaign.commissionValue ?? 0}% per order`;

const campaignStatusClass = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'paused':
    case 'inactive':
      return 'badge-neutral';
    case 'ended':
    case 'expired':
      return 'badge-orange';
    default:
      return 'badge-green';
  }
};

export default function PromoterOverviewPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummary | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [sharingCampaign, setSharingCampaign] = useState<Campaign | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const consumerOrigin = process.env.NEXT_PUBLIC_CONSUMER_URL ?? 'http://localhost:3000';

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const [campaignResult, earningsResult, commissionsResult] = await Promise.allSettled([
      apiClient.getPromoterCampaigns<Campaign[] | { items?: Campaign[] }>(),
      apiClient.getPromoterEarnings<EarningsSummary>(),
      apiClient.getPromoterCommissions<Commission[] | { items?: Commission[] }>(),
    ]);
    const failures = [campaignResult, earningsResult, commissionsResult].filter(
      (result) => result.status === 'rejected',
    );

    if (campaignResult.status === 'fulfilled') {
      const data = campaignResult.value.data;
      setCampaigns(Array.isArray(data) ? data : (data?.items ?? []));
    }
    if (earningsResult.status === 'fulfilled') setEarningsSummary(earningsResult.value.data);
    if (commissionsResult.status === 'fulfilled') {
      const data = commissionsResult.value.data;
      setCommissions(Array.isArray(data) ? data : (data?.items ?? []));
    }

    if (failures.length) {
      const firstFailure = failures[0]!;
      const message =
        firstFailure.status === 'rejected' && firstFailure.reason instanceof ApiError
          ? firstFailure.reason.message
          : 'Some dashboard data could not be refreshed.';
      setError(
        failures.length === 3
          ? message || 'Unable to load promoter dashboard.'
          : 'Some dashboard data may be out of date. Refresh to try again.',
      );
    } else {
      setLastUpdated(new Date());
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const metrics = useMemo(() => {
    const pending = earningsSummary?.pendingCommissionMinor ?? 0;
    const approved = earningsSummary?.approvedCommissionMinor ?? 0;
    const paid = earningsSummary?.paidCommissionMinor ?? 0;
    const inactiveStatuses = ['paused', 'inactive', 'ended', 'expired'];
    const activeCampaigns = campaigns.filter(
      (campaign) => !inactiveStatuses.includes(campaign.status?.toLowerCase() ?? 'active'),
    );
    const excludedOrderStatuses = ['reversed', 'cancelled', 'rejected'];
    const orders = commissions.filter(
      (commission) => !excludedOrderStatuses.includes(commission.status?.toLowerCase() ?? ''),
    ).length;
    const recentCommissions = [...commissions]
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, 4);
    return {
      pending,
      approved,
      paid,
      activeCampaigns,
      orders,
      recentCommissions,
      pendingEntries: commissions.filter((commission) => commission.status === 'pending').length,
      approvedEntries: commissions.filter((commission) => commission.status === 'approved').length,
    };
  }, [campaigns, commissions, earningsSummary]);

  const totalEarnedMinor = metrics.pending + metrics.approved + metrics.paid;
  const withdrawableMinor = metrics.pending + metrics.approved;

  const handleCopyLink = async (campaign: Campaign) => {
    const eventPath = campaign.event?.slug ?? campaign.eventSlug ?? campaign.eventId;
    const fullUrl = `${consumerOrigin}/events/${eventPath}?ref=${encodeURIComponent(campaign.code)}`;
    setCopyError(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(fullUrl);
      setCopiedCode(campaign.code);
      window.setTimeout(() => setCopiedCode(null), 2200);
    } catch {
      setCopyError('Could not copy the link. Please allow clipboard access and try again.');
    }
  };

  return (
    <PromoterLayout
      title="Promoter Dashboard"
      subtitle="Track links, commissions, and what is ready to withdraw."
      actions={
        <button
          type="button"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="btn-secondary text-xs py-2 px-3 disabled:opacity-60"
          aria-label="Refresh dashboard data"
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      }
    >
      <div className="space-y-6">
        {error && (
          <div role="alert" className="dashboard-alert dashboard-alert-error">
            <span>{error}</span>
            <button type="button" onClick={() => fetchData(true)} className="font-bold underline">
              Retry
            </button>
          </div>
        )}
        {copyError && (
          <div role="status" className="dashboard-alert dashboard-alert-warning">
            <span>{copyError}</span>
            <button
              type="button"
              onClick={() => setCopyError(null)}
              className="font-bold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            aria-label="Loading dashboard metrics"
          >
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="stat-card skeleton h-36" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card stat-card-featured">
              <div className="flex justify-between items-start gap-3">
                <span className="stat-card-label">Total earned</span>
                <span className="badge badge-yellow text-[10px]">Ledger</span>
              </div>
              <p className="stat-card-value mt-2">{formatCurrency(totalEarnedMinor)}</p>
              <div className="stat-card-delta neutral">
                <span className="metric-dot yellow" /> All-time commissions
              </div>
            </div>
            <div className="stat-card">
              <div className="flex justify-between items-start gap-3">
                <span className="stat-card-label">Ready to withdraw</span>
                <span className="badge badge-green text-[10px]">Available</span>
              </div>
              <p className="stat-card-value mt-2">{formatCurrency(withdrawableMinor)}</p>
              <div className="stat-card-delta up">
                <span className="metric-dot green" /> {formatCurrency(metrics.approved)} approved
              </div>
            </div>
            <div className="stat-card">
              <div className="flex justify-between items-start gap-3">
                <span className="stat-card-label">Live campaigns</span>
                <span className="badge badge-cyan text-[10px]">Sharing</span>
              </div>
              <p className="stat-card-value mt-2">{metrics.activeCampaigns.length}</p>
              <div className="stat-card-delta neutral">
                <span className="metric-dot cyan" /> {campaigns.length} campaign
                {campaigns.length === 1 ? '' : 's'} total
              </div>
            </div>
            <div className="stat-card">
              <div className="flex justify-between items-start gap-3">
                <span className="stat-card-label">Attributed orders</span>
                <span className="badge badge-pink text-[10px]">Sales</span>
              </div>
              <p className="stat-card-value mt-2">{metrics.orders}</p>
              <div className="stat-card-delta neutral">
                <span className="metric-dot pink" /> Excludes reversed orders
              </div>
            </div>
          </div>
        )}

        {/* Promoter Tier Milestone & Perks Progression */}
        <PromoterTierMilestone
          totalSales={metrics.orders}
          totalEarningsMinor={totalEarnedMinor}
        />

        <div className="promoter-overview-grid">
          <section className="surface-card promoter-payout-card">
            <div className="surface-card-body">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Payout snapshot</p>
                  <h2 className="promoter-panel-title">Your next payout</h2>
                  <p className="promoter-panel-copy">
                    Pending and approved commissions are available to request through the earnings
                    ledger.
                  </p>
                </div>
                <span className="promoter-payout-orb" aria-hidden="true">
                  ₹
                </span>
              </div>
              <div className="promoter-payout-amount">
                {loading ? '—' : formatCurrency(withdrawableMinor)}
              </div>
              <div className="promoter-payout-breakdown">
                <span>
                  <strong>{formatCurrency(metrics.pending)}</strong> pending
                </span>
                <span>
                  <strong>{formatCurrency(metrics.approved)}</strong> approved
                </span>
              </div>
              <Link href="/earnings" className="btn-primary mt-5">
                Request payout <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
          <section className="surface-card">
            <div className="surface-card-header">
              <div>
                <p className="eyebrow">Commission pipeline</p>
                <h2 className="surface-card-title mt-1">Where your earnings are</h2>
              </div>
              <Link
                href="/earnings"
                className="text-xs text-yellow hover:text-white font-semibold transition-colors"
              >
                Open ledger →
              </Link>
            </div>
            <div className="surface-card-body commission-pipeline">
              <div className="pipeline-row">
                <div>
                  <span className="metric-dot yellow" /> Pending
                </div>
                <span>{metrics.pendingEntries} entries</span>
                <strong>{formatCurrency(metrics.pending)}</strong>
              </div>
              <div className="pipeline-row">
                <div>
                  <span className="metric-dot green" /> Approved
                </div>
                <span>{metrics.approvedEntries} entries</span>
                <strong>{formatCurrency(metrics.approved)}</strong>
              </div>
              <div className="pipeline-row">
                <div>
                  <span className="metric-dot cyan" /> Paid out
                </div>
                <span>Completed</span>
                <strong>{formatCurrency(metrics.paid)}</strong>
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <section className="surface-card xl:col-span-3">
            <div className="surface-card-header">
              <div>
                <p className="eyebrow">Campaigns</p>
                <h2 className="surface-card-title mt-1">Share-ready referral links</h2>
              </div>
              <Link href="/campaigns" className="btn-secondary text-xs py-2 px-3">
                Manage campaigns
              </Link>
            </div>
            <div className="surface-card-body p-0">
              {loading ? (
                <div className="p-5 space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="skeleton h-20" />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="dashboard-empty-state">
                  <span className="dashboard-empty-icon" aria-hidden="true">
                    ↗
                  </span>
                  <h3>No referral links yet</h3>
                  <p>Create a campaign to get a unique tracking link for an event.</p>
                  <Link href="/campaigns" className="btn-primary mt-4">
                    Create campaign
                  </Link>
                </div>
              ) : (
                <div className="campaign-list">
                  {campaigns.map((campaign) => (
                    <article key={campaign.id} className="campaign-row">
                      <div className="campaign-row-main">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`badge ${campaignStatusClass(campaign.status)} text-[10px]`}
                          >
                            {campaign.status ?? 'active'}
                          </span>
                          <span className="campaign-rate">{formatCommission(campaign)}</span>
                        </div>
                        <h3>{campaign.event?.title ?? campaign.eventTitle ?? 'Affiliate event'}</h3>
                        <p className="campaign-code">
                          REF <strong>{campaign.code}</strong>
                        </p>
                      </div>
                      <div className="campaign-row-actions">
                        <button
                          type="button"
                          onClick={() => setSharingCampaign(campaign)}
                          className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                          title="Open Social Share Kit & QR Code"
                        >
                          <span>⚡</span> Kit & QR
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(campaign)}
                          className="btn-secondary text-xs py-2 px-3"
                        >
                          {copiedCode === campaign.code ? '✓ Copied' : 'Copy link'}
                        </button>
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="campaign-details-link"
                          aria-label={`View ${campaign.code} performance`}
                        >
                          Details →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
          <section className="surface-card xl:col-span-2">
            <div className="surface-card-header">
              <div>
                <p className="eyebrow">Activity</p>
                <h2 className="surface-card-title mt-1">Recent commissions</h2>
              </div>
              <Link
                href="/earnings"
                className="text-xs text-yellow hover:text-white font-semibold transition-colors"
              >
                See all →
              </Link>
            </div>
            <div className="surface-card-body p-0">
              {loading ? (
                <div className="p-5 space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="skeleton h-12" />
                  ))}
                </div>
              ) : metrics.recentCommissions.length === 0 ? (
                <div className="dashboard-empty-state compact">
                  <span className="dashboard-empty-icon" aria-hidden="true">
                    ◎
                  </span>
                  <h3>No commissions recorded</h3>
                  <p>New attributed orders will appear here.</p>
                </div>
              ) : (
                <div className="recent-commission-list">
                  {metrics.recentCommissions.map((commission) => {
                    const amount = commission.commissionEarnedMinor ?? commission.amountMinor ?? 0;
                    const isReversed = ['reversed', 'cancelled', 'rejected'].includes(
                      commission.status?.toLowerCase() ?? '',
                    );
                    return (
                      <div key={commission.id} className="recent-commission-row">
                        <div
                          className={`recent-commission-icon ${isReversed ? 'is-reversed' : ''}`}
                          aria-hidden="true"
                        >
                          {isReversed ? '−' : '+'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p>
                            {commission.event?.title ?? commission.eventTitle ?? 'Affiliate order'}
                          </p>
                          <span>
                            {commission.createdAt
                              ? new Date(commission.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })
                              : 'Recently'}{' '}
                            · {commission.status ?? 'pending'}
                          </span>
                        </div>
                        <strong className={isReversed ? 'text-pink' : ''}>
                          {isReversed && amount > 0 ? '−' : ''}
                          {formatCurrency(Math.abs(amount))}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
        <p className="dashboard-freshness" aria-live="polite">
          {lastUpdated
            ? `Last updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
            : 'Dashboard data updates when available.'}
        </p>

        {/* Marketing Kit & QR Code Modal */}
        {sharingCampaign && (
          <ShareCampaignModal
            campaign={sharingCampaign}
            onClose={() => setSharingCampaign(null)}
          />
        )}
      </div>
    </PromoterLayout>
  );
}
