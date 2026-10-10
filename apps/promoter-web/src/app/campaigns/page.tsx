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
import { ShareCampaignModal } from '../../components/ShareCampaignModal';

export default function CampaignsCatalogPage() {
  const { track } = useAnalytics(apiClient);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [sharingCampaign, setSharingCampaign] = useState<any | null>(null);
  const consumerOrigin = process.env.NEXT_PUBLIC_CONSUMER_URL ?? 'http://localhost:3000';

  // Create Campaign Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventId, setEventId] = useState('');
  const [code, setCode] = useState('');
  const [commissionType, setCommissionType] = useState('percentage');
  const [commissionValue, setCommissionValue] = useState('10');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Eligible Events for campaign creation
  const [eligibleEvents, setEligibleEvents] = useState<any[]>([]);
  const [loadingEligibleEvents, setLoadingEligibleEvents] = useState(false);

  // Guestlist Modal State
  const [showGuestlistModal, setShowGuestlistModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [entryType, setEntryType] = useState('guestlist');
  const [allowedCount, setAllowedCount] = useState('1');
  const [curfewTime, setCurfewTime] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [submittingGuestlist, setSubmittingGuestlist] = useState(false);
  const [guestlistSuccess, setGuestlistSuccess] = useState<string | null>(null);
  const [guestlistError, setGuestlistError] = useState<string | null>(null);

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

  const fetchEligibleEvents = useCallback(async () => {
    setLoadingEligibleEvents(true);
    try {
      const res = await apiClient.getPromoterEligibleEvents<any[]>();
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.items ?? [];
      setEligibleEvents(list);
    } catch {
      setEligibleEvents([]);
    } finally {
      setLoadingEligibleEvents(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchEligibleEvents();
  }, [fetchCampaigns, fetchEligibleEvents]);

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

  const handleSubmitGuestlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !selectedEventId) return;

    setSubmittingGuestlist(true);
    setGuestlistError(null);
    try {
      await apiClient.post('/promoter/guestlists', {
        eventId: selectedEventId,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim() || undefined,
        entryType,
        allowedCount: parseInt(allowedCount, 10) || 1,
        curfewTime: curfewTime ? new Date(curfewTime).toISOString() : undefined,
        tableNumber: tableNumber.trim() || undefined,
      });

      setGuestlistSuccess(`VIP Guestlist pass for ${guestName.trim()} (${allowedCount} pax) created successfully.`);
      setShowGuestlistModal(false);
      setGuestName('');
      setGuestPhone('');
      setTableNumber('');
    } catch (err: any) {
      setGuestlistError(err?.message || 'Failed to submit guestlist pass.');
    } finally {
      setSubmittingGuestlist(false);
    }
  };

  return (
    <PromoterLayout title="Affiliate Campaigns & Guestlists" subtitle="Discover eligible event campaigns, generate referral links, and submit VIP guestlists">
      <div className="space-y-4">
        {/* Guestlist Success Alert */}
        {guestlistSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex justify-between items-center">
            <span>✓ {guestlistSuccess}</span>
            <button onClick={() => setGuestlistSuccess(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>
        )}

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

                    <h3 className="text-base font-bold text-white mb-1">{camp.event?.title ?? camp.eventTitle ?? 'Affiliate Event'}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                      <span>Commission:</span>
                      <strong className="text-violet-300 font-mono">
                        {camp.commissionType === 'percentage' ? `${camp.commissionValue}%` : `₹${camp.commissionValue / 100}`}
                      </strong>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">Referral Code:</span>
                        <span className="font-mono font-bold text-white text-xs px-2 py-0.5 bg-slate-800 rounded">{camp.code}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopyLink(camp.code, slug)}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all text-center"
                        >
                          {copiedCode === camp.code ? '✓ Link Copied' : '🔗 Copy URL'}
                        </button>
                        <button
                          onClick={() => setSharingCampaign(camp)}
                          className="px-2.5 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
                          title="QR Code & Social Share Kit"
                        >
                          <span>⚡</span> Kit & QR
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEventId(camp.eventId);
                            setShowGuestlistModal(true);
                            setGuestlistError(null);
                          }}
                          className="px-2.5 py-1.5 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/40 text-fuchsia-300 text-xs font-semibold rounded-lg transition-all"
                        >
                          + Guestlist
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-[11px]">
                    <Link href={`/campaigns/${camp.id}`} className="text-violet-400 hover:text-violet-300 font-semibold">
                      View Live Performance →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Guestlist Modal */}
        {showGuestlistModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🎟️</span> Add VIP Guestlist Entry
                </h3>
                <button onClick={() => setShowGuestlistModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
              </div>

              {guestlistError && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs">
                  {guestlistError}
                </div>
              )}

              <form onSubmit={handleSubmitGuestlist} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Primary Guest Name *</label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Rahul Kapoor"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Pass Type</label>
                    <select
                      value={entryType}
                      onChange={(e) => setEntryType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                    >
                      <option value="guestlist">VIP Guestlist</option>
                      <option value="couple">Couple Pass</option>
                      <option value="female">Female Guest</option>
                      <option value="vip_table">VIP Table Guest</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Admitted Pax (Count)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={allowedCount}
                      onChange={(e) => setAllowedCount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Table Number (Optional)</label>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="e.g. VIP-03"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 uppercase font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Curfew Door Cut-off (Optional)</label>
                  <input
                    type="datetime-local"
                    value={curfewTime}
                    onChange={(e) => setCurfewTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Pass becomes invalid at gate scanner after curfew cutoff.</p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowGuestlistModal(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingGuestlist}
                    className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-fuchsia-900/30"
                  >
                    {submittingGuestlist ? 'Submitting...' : 'Issue Guest Pass'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🚀</span> Create Promoter Campaign
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
              </div>

              {createError && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Select Event *</label>
                  {loadingEligibleEvents ? (
                    <div className="text-xs text-slate-400 py-2">Loading eligible affiliate events...</div>
                  ) : eligibleEvents.length === 0 ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs">
                      No events currently open for affiliate campaigns.
                    </div>
                  ) : (
                    <select
                      required
                      value={eventId}
                      onChange={(e) => setEventId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-violet-500 text-sm"
                    >
                      <option value="">Select an event</option>
                      {eligibleEvents.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.title} {evt.city ? `(${evt.city})` : evt.organizerName ? `(${evt.organizerName})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
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
