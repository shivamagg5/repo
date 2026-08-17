// =============================================================================
// promoter-web — Affiliate Campaigns Catalog
// Real affiliate campaign discovery, creation, and referral link generation.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PromoterLayout } from '../../components/PromoterLayout';
import { apiClient, ApiError } from '../../lib/api';
import { useAnalytics } from '@platform/auth';

export default function CampaignsCatalogPage() {
  const { track } = useAnalytics(apiClient);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const consumerOrigin = process.env.NEXT_PUBLIC_CONSUMER_URL ?? 'http://localhost:3000';

  // Create Campaign Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventId, setEventId] = useState('');
  const [code, setCode] = useState('');
  const [commissionType, setCommissionType] = useState('percentage');
  const [commissionValue, setCommissionValue] = useState('10');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getPromoterCampaigns<any>();
      const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setCampaigns(list);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load promoter campaigns.');
      } else {
        setError(err?.message || 'Error occurred while loading campaigns.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCopyLink = (code: string, eventSlug: string) => {
    const fullUrl = `${consumerOrigin}/events/${eventSlug}?ref=${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    track('referral_link_copied', { code });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId.trim() || !code.trim()) return;

    setCreating(true);
    setCreateError(null);
    try {
      await apiClient.createPromoterCampaign({
        eventId: eventId.trim(),
        code: code.trim().toUpperCase(),
        commissionType,
        commissionValue: Number(commissionValue),
      });

      setShowCreateModal(false);
      setEventId('');
      setCode('');
      await fetchCampaigns();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setCreateError(err.message || 'Failed to create promoter campaign.');
      } else {
        setCreateError(err?.message || 'Error occurred while saving campaign.');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <PromoterLayout title="Affiliate Campaigns Catalog" subtitle="Discover eligible event campaigns, view rates, and copy referral links">
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300 font-semibold">Active Campaigns ({campaigns.length})</span>
            <span className="text-[11px] text-slate-400 font-mono">Origin: {consumerOrigin}</span>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(true);
              setCreateError(null);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold shadow-md hover:brightness-110"
          >
            + Create Campaign
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchCampaigns} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* Campaign Catalog Grid */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 animate-pulse">Loading campaigns from server...</div>
        ) : campaigns.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs glass-panel p-6 rounded-xl border border-slate-800">
            No affiliate campaigns found. Create your first campaign code above to begin earning commissions.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((camp) => {
              const slug = camp.event?.slug ?? camp.eventSlug ?? camp.eventId;
              return (
                <div key={camp.id} className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                        {camp.status ?? 'active'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {camp.event?.startsAt ? new Date(camp.event.startsAt).toLocaleDateString('en-IN') : '—'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-100 text-base mb-1">{camp.event?.title ?? camp.eventTitle ?? 'Affiliate Event'}</h3>
                    <p className="text-xs text-slate-400 mb-3">{camp.event?.venue?.name ?? 'Venue Partner'}</p>

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
                        {`${consumerOrigin}/events/${slug}?ref=${camp.code}`}
                      </span>
                      <button
                        onClick={() => handleCopyLink(camp.code, slug)}
                        className="px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all whitespace-nowrap"
                      >
                        {copiedCode === camp.code ? '✓ Copied' : 'Copy Link'}
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-mono">Code: <strong className="text-violet-300">{camp.code}</strong></span>
                      <Link href={`/campaigns/${camp.id}`} className="text-xs text-violet-400 hover:text-violet-300 font-medium">
                        View Campaign Performance →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-xl border border-slate-800 max-w-md w-full space-y-4">
              <h3 className="text-base font-bold text-slate-100">Create Affiliate Campaign</h3>

              {createError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Target Event ID *</label>
                  <input
                    type="text"
                    required
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    placeholder="Enter event UUID..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-violet-500 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Referral Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SUMMER2026"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-violet-500 font-mono uppercase text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Commission Type</label>
                    <select
                      value={commissionType}
                      onChange={(e) => setCommissionType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-violet-500 text-sm"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Value</label>
                    <input
                      type="number"
                      min={1}
                      value={commissionValue}
                      onChange={(e) => setCommissionValue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-violet-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !eventId.trim() || !code.trim()}
                    className="px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-500 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Campaign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PromoterLayout>
  );
}
