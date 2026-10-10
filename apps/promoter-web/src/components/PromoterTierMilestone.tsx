'use client';

import React, { useState } from 'react';

export type PromoterTierLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface TierConfig {
  id: PromoterTierLevel;
  name: string;
  badgeLabel: string;
  minSales: number;
  minEarningsMinor: number;
  bonusCommissionPct: number;
  colorHex: string;
  glowColor: string;
  gradient: string;
  icon: string;
  perks: string[];
}

export const PROMOTER_TIERS: TierConfig[] = [
  {
    id: 'bronze',
    name: 'Bronze Promoter',
    badgeLabel: 'BRONZE TIER',
    minSales: 0,
    minEarningsMinor: 0,
    bonusCommissionPct: 0.0,
    colorHex: '#CD7F32',
    glowColor: 'rgba(205, 127, 50, 0.3)',
    gradient: 'linear-gradient(135deg, #A0522D, #CD7F32, #D2691E)',
    icon: '🥉',
    perks: [
      'Standard 8.0% Base Commission Rate',
      'Instant referral link & UTM click tracking',
      'Real-time order attribution webhooks',
      'Monthly payout settlement cycle',
    ],
  },
  {
    id: 'silver',
    name: 'Silver Affiliate',
    badgeLabel: 'SILVER TIER',
    minSales: 25,
    minEarningsMinor: 2500000, // ₹25,000
    bonusCommissionPct: 1.5,
    colorHex: '#C0C0C0',
    glowColor: 'rgba(192, 192, 192, 0.35)',
    gradient: 'linear-gradient(135deg, #718096, #CBD5E1, #94A3B8)',
    icon: '🥈',
    perks: [
      '+1.5% Bonus Commission Rate (9.5% effective)',
      'Custom vanity referral link alias',
      'Weekly priority payout processing',
      'Promoter leaderboard badge & profile verified check',
      'VIP guestlist allotment (2 tickets/event)',
    ],
  },
  {
    id: 'gold',
    name: 'Gold Ambassador',
    badgeLabel: 'GOLD TIER',
    minSales: 100,
    minEarningsMinor: 10000000, // ₹1,00,000
    bonusCommissionPct: 3.0,
    colorHex: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.4)',
    gradient: 'linear-gradient(135deg, #B45309, #F59E0B, #FDE68A)',
    icon: '🥇',
    perks: [
      '+3.0% Bonus Commission Rate (11.0% effective)',
      'Instant on-demand UPI payout release (0 wait)',
      'Complimentary Backstage & Artist Lounge Passes',
      'Priority organizer direct messaging hotline',
      'Expanded guestlist allotment (5 tickets/event)',
    ],
  },
  {
    id: 'platinum',
    name: 'Platinum Headliner',
    badgeLabel: 'PLATINUM VIP',
    minSales: 500,
    minEarningsMinor: 50000000, // ₹5,00,000
    bonusCommissionPct: 5.0,
    colorHex: '#00F0FF',
    glowColor: 'rgba(0, 240, 255, 0.5)',
    gradient: 'linear-gradient(135deg, #00F0FF, #A855F7, #FF2E93)',
    icon: '💎',
    perks: [
      '+5.0% Bonus Commission Rate (13.0% effective max)',
      '0% Payout settlement fee & instant RTGS/IMPS',
      'Dedicated 1:1 EventHub talent growth manager',
      'Custom branded co-host landing page',
      'VIP Turnstile scanner pass & unlimited guestlist approvals',
    ],
  },
];

export function getTierForMetrics(totalSales: number, totalEarningsMinor: number): {
  currentTier: TierConfig;
  nextTier: TierConfig | null;
  progressPct: number;
  salesToNext: number;
  earningsToNextMinor: number;
} {
  let currentTierIndex = 0;
  for (let i = PROMOTER_TIERS.length - 1; i >= 0; i--) {
    const t = PROMOTER_TIERS[i]!;
    if (totalSales >= t.minSales || totalEarningsMinor >= t.minEarningsMinor) {
      currentTierIndex = i;
      break;
    }
  }

  const currentTier = PROMOTER_TIERS[currentTierIndex]!;
  const nextTier = currentTierIndex < PROMOTER_TIERS.length - 1
    ? PROMOTER_TIERS[currentTierIndex + 1]!
    : null;

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      progressPct: 100,
      salesToNext: 0,
      earningsToNextMinor: 0,
    };
  }

  const salesSpan = nextTier.minSales - currentTier.minSales;
  const salesCompleted = Math.max(0, totalSales - currentTier.minSales);
  const rawProgress = salesSpan > 0 ? (salesCompleted / salesSpan) * 100 : 0;
  const progressPct = Math.min(100, Math.max(0, Math.round(rawProgress)));

  return {
    currentTier,
    nextTier,
    progressPct,
    salesToNext: Math.max(0, nextTier.minSales - totalSales),
    earningsToNextMinor: Math.max(0, nextTier.minEarningsMinor - totalEarningsMinor),
  };
}

export interface PromoterTierMilestoneProps {
  totalSales: number;
  totalEarningsMinor: number;
  className?: string;
  showDetailsButton?: boolean;
}

export function PromoterTierMilestone({
  totalSales,
  totalEarningsMinor,
  className = '',
  showDetailsButton = true,
}: PromoterTierMilestoneProps) {
  const [showModal, setShowModal] = useState(false);

  const { currentTier, nextTier, progressPct, salesToNext } = getTierForMetrics(
    totalSales,
    totalEarningsMinor,
  );

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${className}`}
        style={{
          background: 'linear-gradient(180deg, rgba(24, 24, 38, 0.95) 0%, rgba(13, 13, 20, 0.95) 100%)',
          borderColor: currentTier.colorHex + '40',
          boxShadow: `0 8px 32px -8px ${currentTier.glowColor}`,
        }}
      >
        {/* Ambient Top Glow Line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: currentTier.gradient }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Tier Icon Orb */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-lg border"
              style={{
                background: currentTier.gradient,
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              {currentTier.icon}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border"
                  style={{
                    backgroundColor: currentTier.colorHex + '20',
                    color: currentTier.colorHex,
                    borderColor: currentTier.colorHex + '50',
                  }}
                >
                  {currentTier.badgeLabel}
                </span>

                {currentTier.bonusCommissionPct > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    +{currentTier.bonusCommissionPct}% Commission Boost Active
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
                {currentTier.name}
              </h3>
            </div>
          </div>

          {showDetailsButton && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 transition-colors flex items-center gap-1.5"
            >
              <span>Milestone Perks</span>
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>

        {/* Progression Bar to Next Tier */}
        {nextTier ? (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">
                Next Tier: <strong className="text-white">{nextTier.name}</strong> ({nextTier.icon})
              </span>
              <span className="font-mono font-bold text-white">
                {salesToNext} more order{salesToNext === 1 ? '' : 's'} needed ({progressPct}%)
              </span>
            </div>

            {/* Progress track */}
            <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden relative border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPct}%`,
                  background: currentTier.gradient,
                }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Current: {totalSales} orders</span>
              <span className="text-emerald-400 font-medium">
                Unlocks +{nextTier.bonusCommissionPct}% rate & instant payouts
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-xs text-cyan-300">
            <span>👑</span>
            <span>Maximum Tier Achieved! You enjoy top-tier commission rates and VIP privileges.</span>
          </div>
        )}
      </div>

      {/* Milestone Perks Explorer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#12121C] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] font-mono tracking-widest uppercase text-amber-400 font-bold">
                  ★ Promoter Growth Ladder
                </p>
                <h2 className="text-xl font-bold text-white mt-1">Tier Milestones & Exclusive Perks</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Sell more event tickets to automatically level up and unlock higher commission rates, instant payouts, and backstage passes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Current Status Callout */}
            <div
              className="p-4 rounded-xl border flex items-center justify-between"
              style={{
                backgroundColor: currentTier.colorHex + '15',
                borderColor: currentTier.colorHex + '40',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currentTier.icon}</span>
                <div>
                  <p className="text-[11px] text-slate-400">Your Current Level</p>
                  <p className="text-sm font-bold text-white">{currentTier.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400">Total Attributed Orders</p>
                <p className="text-sm font-mono font-bold text-white">{totalSales}</p>
              </div>
            </div>

            {/* All Tiers List */}
            <div className="space-y-4">
              {PROMOTER_TIERS.map((tier) => {
                const isCurrent = tier.id === currentTier.id;
                const isUnlocked = totalSales >= tier.minSales;

                return (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? 'border-white/30 bg-white/5 shadow-md'
                        : isUnlocked
                        ? 'border-white/10 bg-white/[0.02]'
                        : 'border-white/5 bg-black/20 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tier.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{tier.name}</h4>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                                Active Tier
                              </span>
                            )}
                            {isUnlocked && !isCurrent && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                                ✓ Unlocked
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {tier.minSales === 0 ? 'Starting tier for all promoters' : `Requires ${tier.minSales}+ orders or ₹${(tier.minEarningsMinor / 100).toLocaleString('en-IN')} GMV`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold"
                          style={{
                            backgroundColor: tier.colorHex + '20',
                            color: tier.colorHex,
                          }}
                        >
                          {tier.bonusCommissionPct > 0 ? `+${tier.bonusCommissionPct}% Bonus` : 'Base Rate'}
                        </span>
                      </div>
                    </div>

                    {/* Perks Bullet Points */}
                    <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tier.perks.map((perk, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className={isUnlocked ? 'text-emerald-400' : 'text-slate-500'}>
                            {isUnlocked ? '✓' : '•'}
                          </span>
                          <span>{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
