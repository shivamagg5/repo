'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PromoterLayout } from '../../../components/PromoterLayout';

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = (params?.id as string) ?? 'camp-1';
  const [copied, setCopied] = useState(false);
  const consumerOrigin = process.env.NEXT_PUBLIC_CONSUMER_WEB_URL ?? 'http://localhost:3000';

  const campaign = {
    id: campaignId,
    eventTitle: 'Summer Fest 2026',
    eventSlug: 'summer-fest-2026',
    code: 'SUMMER2026',
    commissionType: 'percentage',
    commissionValue: 10,
    clicks: 1240,
    sales: 182,
    earnedMinor: 4825000, // ₹48,250
    venue: 'Grand Arena, Amritsar',
    startsAt: '24 Aug 2026, 7:00 PM',
    status: 'active',
  };

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);
  };

  const handleCopy = () => {
    const fullUrl = `${consumerOrigin}/events/${campaign.eventSlug}?ref=${campaign.code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PromoterLayout title={campaign.eventTitle} subtitle={`Affiliate Campaign Details · Code: ${campaign.code}`}>
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <Link href="/campaigns" className="text-xs text-slate-400 hover:text-slate-200 font-medium">
            ← Back to Campaigns Catalog
          </Link>
          <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
            {campaign.status}
          </span>
        </div>

        {/* Top Campaign Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Earned Commissions</span>
            <p className="text-2xl font-bold text-slate-100 mt-1">{formatCurrency(campaign.earnedMinor)}</p>
            <p className="text-[11px] text-violet-300 mt-1">10% basis rate</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Attributed Orders</span>
            <p className="text-2xl font-bold text-slate-100 mt-1">{campaign.sales}</p>
            <p className="text-[11px] text-slate-500 mt-1">1:1 Unique Orders</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Total Clicks</span>
            <p className="text-2xl font-bold text-slate-100 mt-1">{campaign.clicks.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-slate-500 mt-1">Tracked click events</p>
          </div>
        </div>

        {/* Campaign Share Tools */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-100">Referral Share Tools</h3>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <label className="text-xs text-slate-400 block font-medium">Your Environment-Configured Referral URL</label>
            <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-xs font-mono text-violet-300 truncate flex-1 px-2">
                {`${consumerOrigin}/events/${campaign.eventSlug}?ref=${campaign.code}`}
              </span>
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold shadow-md hover:brightness-110"
              >
                {copied ? '✓ Copied Link' : 'Copy Link'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Share this link across social media or direct messages. Purchases made via this link within the attribution window are linked 1:1 to your referral code.
            </p>
          </div>
        </div>
      </div>
    </PromoterLayout>
  );
}
