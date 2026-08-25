// =============================================================================
// promoter-web — Promoter Overview Dashboard
// Real affiliate referral tracking, campaigns, and earnings from backend APIs.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PromoterLayout } from '../components/PromoterLayout';
import { apiClient, ApiError } from '../lib/api';

export default function PromoterOverviewPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Environment-configured consumer origin
  const consumerOrigin = process.env.NEXT_PUBLIC_CONSUMER_URL ?? 'http://localhost:3000';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, eRes] = await Promise.allSettled([
        apiClient.getPromoterCampaigns<any>(),
        apiClient.getPromoterEarnings<any>(),
      ]);

      const cData = cRes.status === 'fulfilled' ? cRes.value.data : [];
      const eData = eRes.status === 'fulfilled' ? eRes.value.data : [];

      setCampaigns(Array.isArray(cData) ? cData : (cData?.items ?? []));
      setEarnings(Array.isArray(eData) ? eData : (eData?.items ?? []));
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load promoter dashboard.');
      } else {
        setError(err?.message || 'Error occurred while loading affiliate data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived financial metrics from authoritative backend earnings
  const totalEarnedMinor = earnings
    .filter((e) => e.status !== 'reversed')
    .reduce((sum, e) => sum + (e.commissionEarnedMinor ?? e.amountMinor ?? 0), 0);

  const pendingPayoutMinor = earnings
    .filter((e) => e.status === 'pending' || e.status === 'approved')
    .reduce((sum, e) => sum + (e.commissionEarnedMinor ?? e.amountMinor ?? 0), 0);

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);
  };

  const handleCopyLink = (code: string, eventSlug: string) => {
    const fullUrl = `${consumerOrigin}/events/${eventSlug}?ref=${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <PromoterLayout title="Promoter Dashboard" subtitle="Real-time affiliate referral tracking, sales, and commission overview">
      <div className="space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchData} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* KPI Stat Cards */}
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
                <span className="stat-card-label">Total Earned</span>
                <span className="badge badge-orange text-[10px]">Net Ledger</span>
              </div>
              <p className="stat-card-value text-white mt-1">{formatCurrency(totalEarnedMinor)}</p>
              <div className="stat-card-delta up">
                <span className="metric-dot orange" />
                Pending: {formatCurrency(pendingPayoutMinor)}
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Active Campaigns</span>
                <span className="badge badge-pink text-[10px]">Live</span>
              </div>
              <p className="stat-card-value text-white mt-1">{campaigns.length}</p>
              <div className="stat-card-delta neutral">
                <span className="metric-dot pink" />
                Commission links active
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Pending Payout</span>
                <span className="badge badge-yellow text-[10px]">Settling</span>
              </div>
              <p className="stat-card-value text-white mt-1">{formatCurrency(pendingPayoutMinor)}</p>
              <div className="stat-card-delta neutral">
                <span className="metric-dot yellow" />
                Next settlement cycle
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <span className="stat-card-label">Referral Orders</span>
                <span className="badge badge-cyan text-[10px]">Conversion</span>
              </div>
              <p className="stat-card-value text-white mt-1">{earnings.length}</p>
              <div className="stat-card-delta up">
                <span className="metric-dot cyan" />
                Direct attributed sales
              </div>
            </div>
          </div>
        )}

        {/* Active Campaigns List */}
        <div className="surface-card">
          <div className="surface-card-header">
            <h3 className="surface-card-title flex items-center gap-2">
              <span className="metric-dot orange" />
              Active Referral Campaigns ({campaigns.length})
            </h3>
            <Link href="/campaigns" className="text-xs text-orange hover:text-pink font-semibold transition-colors">
              Manage Campaigns →
            </Link>
          </div>

          <div className="surface-card-body p-0">
            {campaigns.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-mono">
                No active affiliate campaigns. Contact an organizer to receive referral links.
              </div>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Campaign & Event</th>
                    <th>Referral Code</th>
                    <th>Commission Rate</th>
                    <th>Share Link</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((camp) => (
                    <tr key={camp.id}>
                      <td className="font-semibold text-slate-100">
                        {camp.eventTitle ?? camp.title ?? 'Featured Event'}
                      </td>
                      <td>
                        <span className="badge badge-orange font-mono text-xs">
                          {camp.code}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-slate-300">
                        {camp.commissionRate ? `${camp.commissionRate}%` : '5% Base'}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(camp.code, camp.eventSlug ?? camp.eventId ?? 'event')}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          {copiedCode === camp.code ? '✓ Link Copied' : '🔗 Copy Share Link'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PromoterLayout>
  );
}
