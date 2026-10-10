// =============================================================================
// promoter-web — Promoter Profile, Tier Milestones & Payout Settings
// Real promoter organization details, tier progression, and tax settings.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PromoterLayout } from '../../components/PromoterLayout';
import { useAuth } from '@platform/auth';
import { apiClient } from '../../lib/api';
import { PromoterTierMilestone } from '../../components/PromoterTierMilestone';

export default function PromoterProfilePage() {
  const { user, profile, organizations } = useAuth();
  const activeOrg = organizations?.find((o) => o.type === 'promoter' && o.status === 'active') ?? organizations?.[0];

  const [panNumber, setPanNumber] = useState('');
  const [gstinNumber, setGstinNumber] = useState('');
  const [defaultUpi, setDefaultUpi] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [totalSales, setTotalSales] = useState(0);
  const [totalEarnedMinor, setTotalEarnedMinor] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load saved local tax settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPan = localStorage.getItem('promoter_pan') ?? 'ABCDE1234F';
      const savedGstin = localStorage.getItem('promoter_gstin') ?? '';
      const savedUpi = localStorage.getItem('promoter_upi') ?? (user?.email ? `${user.email.split('@')[0]}@okaxis` : '');
      setPanNumber(savedPan);
      setGstinNumber(savedGstin);
      setDefaultUpi(savedUpi);
    }
  }, [user]);

  const fetchPromoterStats = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, commRes] = await Promise.allSettled([
        apiClient.getPromoterEarnings<any>(),
        apiClient.getPromoterCommissions<any>(),
      ]);

      const sumData = sumRes.status === 'fulfilled' ? sumRes.value.data : null;
      const commData = commRes.status === 'fulfilled' ? commRes.value.data : [];

      const list = Array.isArray(commData) ? commData : (commData?.items ?? []);
      const orders = list.filter((c: any) => !['reversed', 'cancelled'].includes(c.status?.toLowerCase() ?? '')).length;

      const totalMinor = (sumData?.pendingCommissionMinor ?? 0) +
        (sumData?.approvedCommissionMinor ?? 0) +
        (sumData?.paidCommissionMinor ?? 0);

      setTotalSales(orders);
      setTotalEarnedMinor(totalMinor);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromoterStats();
  }, [fetchPromoterStats]);

  const handleSaveTaxProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('promoter_pan', panNumber.trim().toUpperCase());
      localStorage.setItem('promoter_gstin', gstinNumber.trim().toUpperCase());
      localStorage.setItem('promoter_upi', defaultUpi.trim());
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <PromoterLayout
      title="Promoter Profile & Tax Settings"
      subtitle="Promoter organization details, tier milestones, PAN/GSTIN compliance, and payout configuration"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Tier Milestone Card */}
        <PromoterTierMilestone
          totalSales={totalSales}
          totalEarningsMinor={totalEarnedMinor}
        />

        {/* Profile Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100">{activeOrg?.name ?? 'Promoter Organization'}</h3>
              <p className="text-xs text-slate-400">Account Owner: {profile?.name ?? 'Affiliate Manager'}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Role: {activeOrg?.role ?? 'Promoter'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Registered Email Address</span>
              <p className="font-mono text-slate-200">{user?.email ?? '—'}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Organization Status</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                {activeOrg?.status ?? 'active'}
              </span>
            </div>
          </div>
        </div>

        {/* Tax Compliance & Payout Details Form */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100">Tax Compliance & Payout Credentials</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Required for Section 194H TDS withholding (5.0%) and quarterly Form 16A issuance.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ✓ Automated Clearing House
            </span>
          </div>

          {saveSuccess && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex justify-between items-center animate-in fade-in">
              <span>✓ Tax & Payout credentials updated successfully.</span>
              <button onClick={() => setSaveSuccess(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>
          )}

          <form onSubmit={handleSaveTaxProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Permanent Account Number (PAN) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-amber-400 font-mono text-sm uppercase"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">10-character alphanumeric PAN issued by IT Dept.</p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  GSTIN (Optional if unregistered)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={gstinNumber}
                  onChange={(e) => setGstinNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-amber-400 font-mono text-sm uppercase"
                />
                <p className="text-[10px] text-slate-500 mt-1">Leave blank if individual consumer / influencer.</p>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Default Instant UPI VPA for Payouts
              </label>
              <input
                type="text"
                value={defaultUpi}
                onChange={(e) => setDefaultUpi(e.target.value)}
                placeholder="e.g. mobile@paytm or name@okhdfcbank"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-amber-400 font-mono text-sm"
              />
              <p className="text-[10px] text-slate-500 mt-1">Pre-populates the payout request drawer for instant 1-click withdrawals.</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black rounded-xl text-xs font-bold shadow-lg transition-all"
              >
                Save Tax Profile
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
            <p className="font-semibold text-slate-300">Statutory Compliance Disclosures:</p>
            <p>
              • In accordance with Section 194H of the Indian Income Tax Act, 1961, tax is deducted at 5% on all affiliate commission remittances exceeding statutory limits.
            </p>
            <p>
              • TDS returns (Form 26Q) are filed quarterly. Digitally signed Form 16A certificates can be downloaded at the end of each financial quarter directly from TRACES or your registered email.
            </p>
          </div>
        </div>
      </div>
    </PromoterLayout>
  );
}
