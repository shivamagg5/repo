// =============================================================================
// promoter-web — Campaign Performance & Detail
// Displays real affiliate performance metrics, attributed orders, and referral tools.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PromoterLayout } from '../../../components/PromoterLayout';
import { apiClient, ApiError } from '../../../lib/api';

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = (params?.id as string) ?? '';
  const [copied, setCopied] = useState(false);
  const consumerOrigin = process.env.NEXT_PUBLIC_CONSUMER_URL ?? 'http://localhost:3000';

  const [campaign, setCampaign] = useState<any | null>(null);
  const [performance, setPerformance] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaignData = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const [campRes, perfRes] = await Promise.allSettled([
        apiClient.getPromoterCampaignById<any>(campaignId),
        apiClient.getPromoterCampaignPerformance<any>(campaignId),
      ]);

      const campData = campRes.status === 'fulfilled' ? campRes.value.data : null;
      const perfData = perfRes.status === 'fulfilled' ? perfRes.value.data : null;

      setCampaign(campData);
      setPerformance(perfData);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load campaign performance.');
      } else {
        setError(err?.message || 'Error occurred while loading campaign details.');
      }
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);
  };

  const handleCopy = () => {
    const slug = campaign?.event?.slug ?? campaign?.eventSlug ?? campaign?.eventId ?? '';
    const code = campaign?.code ?? '';
    const fullUrl = `${consumerOrigin}/events/${slug}?ref=${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalEarnedMinor = performance?.commissionEarnedMinor ?? performance?.earnedMinor ?? 0;
  const totalSalesCount = performance?.conversions ?? performance?.salesCount ?? 0;
  const totalClicksCount = performance?.clicks ?? 0;

  return (
    <PromoterLayout
      title={campaign?.event?.title ?? campaign?.eventTitle ?? 'Affiliate Campaign'}
      subtitle={`Affiliate Campaign Details · Code: ${campaign?.code ?? '—'}`}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <Link href="/campaigns" className="text-xs text-slate-400 hover:text-slate-200 font-medium">
            ← Back to Campaigns Catalog
          </Link>
          <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
            {campaign?.status ?? 'active'}
          </span>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchCampaignData} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* Top Campaign Metrics */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Earned Commissions</span>
              <p className="text-2xl font-bold text-slate-100 mt-1 font-mono">{formatCurrency(totalEarnedMinor)}</p>
              <p className="text-[11px] text-violet-300 mt-1">
                {campaign?.commissionType === 'percentage' ? `${campaign?.commissionValue}% basis rate` : `₹${campaign?.commissionValue} fixed rate`}
              </p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Attributed Orders</span>
              <p className="text-2xl font-bold text-slate-100 mt-1 font-mono">{totalSalesCount}</p>
              <p className="text-[11px] text-slate-500 mt-1">1:1 Unique Attributed Orders</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Tracked Link Clicks</span>
              <p className="text-2xl font-bold text-slate-100 mt-1 font-mono">{totalClicksCount.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-500 mt-1">Direct attribution referral clicks</p>
            </div>
          </div>
        )}

        {/* Campaign Share Tools */}
        {campaign && (
          <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-100">Referral Share Tools</h3>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <label className="text-xs text-slate-400 block font-medium">Your Environment-Configured Referral URL</label>
              <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-xs font-mono text-violet-300 truncate flex-1 px-2">
                  {`${consumerOrigin}/events/${campaign.event?.slug ?? campaign.eventSlug ?? campaign.eventId}?ref=${campaign.code}`}
                </span>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold shadow-md hover:brightness-110"
                >
                  {copied ? '✓ Copied Link' : 'Copy Link'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Share this link across social media or marketing channels. Purchases completed within the attribution session are credited 1:1 to your promoter organization.
              </p>
            </div>
          </div>
        )}
      </div>
    </PromoterLayout>
  );
}
