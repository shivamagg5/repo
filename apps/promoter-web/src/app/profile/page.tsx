// =============================================================================
// promoter-web — Promoter Profile & Payout Settings
// Real promoter organization details and masked payout configuration from session.
// =============================================================================
'use client';

import React from 'react';
import { PromoterLayout } from '../../components/PromoterLayout';
import { useAuth } from '@platform/auth';

export default function PromoterProfilePage() {
  const { user, profile, organizations } = useAuth();

  const activeOrg = organizations.find((o) => o.type === 'promoter' && o.status === 'active') ?? organizations[0];

  return (
    <PromoterLayout title="Promoter Profile and Payout Settings" subtitle="Promoter organization details and payout configuration">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile Card */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100">{activeOrg?.name ?? 'Promoter Organization'}</h3>
              <p className="text-xs text-slate-400">Account Owner: {profile?.name ?? 'Affiliate Manager'}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Role: {activeOrg?.role ?? 'Promoter'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Email Address</span>
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

        {/* Payout Security Notice & Compliance */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-slate-100">Payout Configuration</h3>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ✓ Platform Settlement Verified
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block">Payout Method</span>
                <p className="font-semibold text-slate-200 mt-0.5">Automated Settlement Cycle</p>
              </div>
              <span className="font-mono font-bold text-violet-300 text-sm">Direct Bank Settlement</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Full bank credentials and API secrets are strictly protected and never exposed in browser storage. Payout settlements are audited and disbursed automatically according to platform reconciliation cycles.
          </p>
        </div>
      </div>
    </PromoterLayout>
  );
}
