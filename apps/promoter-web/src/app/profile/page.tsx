'use client';

import React from 'react';
import { PromoterLayout } from '../../components/PromoterLayout';

export default function PromoterProfilePage() {
  const profile = {
    organizationName: 'Rahul Affiliate Org',
    promoterCode: 'SUMMER2026',
    status: 'active',
    accountOwner: 'Promoter Rahul',
    email: 'promoter@platform.internal',
    payoutMethod: 'Bank Transfer (NEFT/RTGS)',
    maskedAccount: '****1234',
    ifscCode: 'HDFC0000123',
    payoutStatus: 'verified',
  };

  return (
    <PromoterLayout title="Promoter Profile and Payout Settings" subtitle="Promoter organization details and payout configuration">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile Card */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100">{profile.organizationName}</h3>
              <p className="text-xs text-slate-400">Account Owner: {profile.accountOwner}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Code: {profile.promoterCode}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Email Address</span>
              <p className="font-mono text-slate-200">{profile.email}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Organization Status</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                {profile.status}
              </span>
            </div>
          </div>
        </div>

        {/* Masked Payout Destination Card */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-slate-100">Payout Configuration</h3>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ✓ {profile.payoutStatus}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block">Payout Destination</span>
                <p className="font-semibold text-slate-200 mt-0.5">{profile.payoutMethod}</p>
              </div>
              <span className="font-mono font-bold text-violet-300 text-sm">{profile.maskedAccount}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block">IFSC Code</span>
                <p className="font-mono text-slate-200 mt-0.5">{profile.ifscCode}</p>
              </div>
              <span className="text-[10px] text-slate-500">Bank Transfer Verified</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Full bank credentials and API secrets are never exposed in browser storage. Payout settlements are processed automatically according to the platform settlement schedule.
          </p>
        </div>
      </div>
    </PromoterLayout>
  );
}
