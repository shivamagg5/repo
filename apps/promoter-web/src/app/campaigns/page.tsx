'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PromoterLayout } from '../../components/PromoterLayout';

export default function CampaignsCatalogPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const consumerOrigin = process.env.NEXT_PUBLIC_CONSUMER_WEB_URL ?? 'http://localhost:3000';

  const campaigns = [
    { id: 'camp-1', eventTitle: 'Summer Fest 2026', eventSlug: 'summer-fest-2026', code: 'SUMMER2026', commissionType: 'percentage', commissionValue: 10, clicks: 1240, sales: 182, venue: 'Grand Arena, Amritsar', startsAt: '24 Aug 2026', status: 'active' },
    { id: 'camp-2', eventTitle: 'Neon Night Concert', eventSlug: 'neon-night-concert', code: 'NEON2026', commissionType: 'fixed', commissionValue: 100, clicks: 450, sales: 45, venue: 'Club Vista, Ludhiana', startsAt: '15 Sep 2026', status: 'active' },
  ];

  const handleCopyLink = (code: string, eventSlug: string) => {
    const fullUrl = `${consumerOrigin}/events/${eventSlug}?ref=${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <PromoterLayout title="Affiliate Campaigns Catalog" subtitle="Discover eligible event campaigns, view rates, and copy referral links">
      <div className="space-y-4">
        {/* Search & Filters Header */}
        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-300 text-xs font-semibold border border-violet-500/30">Active Campaigns</button>
            <button className="px-3 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 hover:text-slate-200 text-xs font-medium">All Events</button>
          </div>
          <span className="text-xs text-slate-400 font-mono">Consumer Origin: {consumerOrigin}</span>
        </div>

        {/* Campaign Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((camp) => (
            <div key={camp.id} className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                    {camp.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{camp.startsAt}</span>
                </div>

                <h3 className="font-bold text-slate-100 text-base mb-1">{camp.eventTitle}</h3>
                <p className="text-xs text-slate-400 mb-3">{camp.venue}</p>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Commission Rate</span>
                  <span className="font-bold text-violet-300 font-mono">
                    {camp.commissionType === 'percentage' ? `${camp.commissionValue}% basis rate` : `₹${camp.commissionValue} per ticket`}
                  </span>
                </div>
              </div>

              {/* Referral Tool */}
              <div className="space-y-3 pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-[11px] font-mono text-slate-400 truncate flex-1 px-2">
                    {`${consumerOrigin}/events/${camp.eventSlug}?ref=${camp.code}`}
                  </span>
                  <button
                    onClick={() => handleCopyLink(camp.code, camp.eventSlug)}
                    className="px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all whitespace-nowrap"
                  >
                    {copiedCode === camp.code ? '✓ Copied' : 'Copy Link'}
                  </button>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-mono">Code: <strong className="text-violet-300">{camp.code}</strong></span>
                  <Link href={`/campaigns/${camp.id}`} className="text-xs text-violet-400 hover:text-violet-300 font-medium">
                    View Campaign Details →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PromoterLayout>
  );
}
