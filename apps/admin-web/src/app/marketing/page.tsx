'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient } from '../../lib/api';
import type { AdminMarketingWalletDto, AdminBroadcastCampaignDto } from '@platform/types';

export default function AdminMarketingPage() {
  const [activeTab, setActiveTab] = useState<'wallets' | 'campaigns'>('wallets');
  const [wallets, setWallets] = useState<AdminMarketingWalletDto[]>([]);
  const [campaigns, setCampaigns] = useState<AdminBroadcastCampaignDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Grant Credits Modal
  const [selectedWallet, setSelectedWallet] = useState<AdminMarketingWalletDto | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantAmount, setGrantAmount] = useState('1000');
  const [grantReason, setGrantReason] = useState('Onboarding Welcome Bonus');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [walletRes, campaignRes] = await Promise.all([
        apiClient.getAdminMarketingWallets<AdminMarketingWalletDto[]>(),
        apiClient.getAdminMarketingCampaigns<AdminBroadcastCampaignDto[]>(),
      ]);
      setWallets(walletRes.data ?? []);
      setCampaigns(campaignRes.data ?? []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load marketing balances & campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalCirculation = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalPurchases = wallets.reduce((sum, w) => sum + w.totalPurchased, 0);
  const totalPromotional = wallets.reduce((sum, w) => sum + w.totalPromotionalGranted, 0);

  const handleGrantCredits = async () => {
    if (!selectedWallet) return;
    const credits = parseInt(grantAmount, 10);
    if (isNaN(credits) || credits <= 0) {
      alert('Please enter a valid positive credit amount');
      return;
    }
    const amountMinor = credits * 100;
    setActionLoading(true);
    try {
      await apiClient.grantAdminMarketingCredits(selectedWallet.id, {
        amountMinor,
        reason: grantReason.trim() || 'Admin promotional grant',
      });
      setShowGrantModal(false);
      setSelectedWallet(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to grant promotional credits');
    } finally {
      setActionLoading(false);
    }
  };

  const handleModerateCampaign = async (campaignId: string, action: 'approve' | 'reject') => {
    const reason = prompt(`Enter moderation reason for ${action.toUpperCase()}:`);
    if (reason === null) return;

    setActionLoading(true);
    try {
      await apiClient.moderateAdminMarketingCampaign(campaignId, {
        action,
        reason: reason || undefined,
      });
      await fetchData();
    } catch (err: any) {
      alert(err?.message ?? `Failed to ${action} campaign`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout
      title="Marketing & Organizer Ad Wallets"
      subtitle="Ecosystem wallet ledger, credit purchases, promotional grants & broadcast campaign moderation"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastUpdated && (
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'var(--surface-3)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              cursor: 'pointer',
            }}
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '12px 16px',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchData}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: 'none',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>Active Credits in Circulation</span>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#60a5fa', margin: '6px 0 0' }}>
              {totalCirculation.toLocaleString()} Cr
            </p>
            <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>₹1.00 equivalent value per credit</span>
          </div>
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>Total Credits Purchased</span>
            <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--green)', margin: '6px 0 0' }}>
              {totalPurchases.toLocaleString()} Cr
            </p>
            <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Direct organizer top-ups</span>
          </div>
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>Promotional Grants Issued</span>
            <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--pink)', margin: '6px 0 0' }}>
              {totalPromotional.toLocaleString()} Cr
            </p>
            <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Platform subsidies & partnership bonuses</span>
          </div>
        </div>

        {/* ── Tabs Navigation ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('wallets')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              background: activeTab === 'wallets' ? 'var(--pink-dim)' : 'transparent',
              border: `1px solid ${activeTab === 'wallets' ? 'var(--pink)' : 'transparent'}`,
              color: activeTab === 'wallets' ? 'var(--pink)' : 'var(--text-3)',
              cursor: 'pointer',
            }}
          >
            Organizer Ad Wallets ({wallets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('campaigns')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              background: activeTab === 'campaigns' ? 'var(--pink-dim)' : 'transparent',
              border: `1px solid ${activeTab === 'campaigns' ? 'var(--pink)' : 'transparent'}`,
              color: activeTab === 'campaigns' ? 'var(--pink)' : 'var(--text-3)',
              cursor: 'pointer',
            }}
          >
            Broadcast Campaigns & Moderation ({campaigns.length})
          </button>
        </div>

        {/* ── Wallets Tab ────────────────────────────────────────────────────── */}
        {activeTab === 'wallets' && (
          <div className="surface-card">
            <div className="surface-card-body p-0">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                      {['ORGANIZER', 'AVAILABLE BALANCE', 'PURCHASED', 'PROMO GRANTED', 'SPENT', 'CAMPAIGNS', 'ACTIONS'].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: '12px 14px',
                            textAlign: i >= 1 && i <= 5 ? 'right' : 'left',
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            color: 'var(--text-3)',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                          Loading marketing wallet balances...
                        </td>
                      </tr>
                    ) : wallets.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                          No organizer wallets found.
                        </td>
                      </tr>
                    ) : (
                      wallets.map((w, i) => (
                        <tr
                          key={w.id}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                          }}
                        >
                          <td style={{ padding: '14px' }}>
                            <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: '13px' }}>
                              {w.organizerName}
                            </p>
                            <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                              ID: {w.id}
                            </span>
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            <p style={{ fontWeight: 800, color: '#60a5fa', margin: 0, fontSize: '14px' }}>
                              {w.balance.toLocaleString()} Cr
                            </p>
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right', color: 'var(--text-2)' }}>
                            {w.totalPurchased.toLocaleString()} Cr
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right', color: 'var(--pink)' }}>
                            {w.totalPromotionalGranted.toLocaleString()} Cr
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right', color: 'var(--text-3)' }}>
                            {w.totalSpent.toLocaleString()} Cr
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right', color: 'var(--text-2)' }}>
                            {w.campaignsCount}
                          </td>
                          <td style={{ padding: '14px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWallet(w);
                                setGrantAmount('1000');
                                setShowGrantModal(true);
                              }}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              + Issue Credits
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Broadcast Campaigns Tab ────────────────────────────────────────── */}
        {activeTab === 'campaigns' && (
          <div className="surface-card">
            <div className="surface-card-body p-0">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                      {['CAMPAIGN / CONTENT', 'ORGANIZER & EVENT', 'TYPE', 'AUDIENCE', 'COST', 'STATUS', 'MODERATION'].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: '12px 14px',
                            textAlign: i === 3 || i === 4 ? 'right' : 'left',
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            color: 'var(--text-3)',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                          Loading broadcast campaigns...
                        </td>
                      </tr>
                    ) : campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                          No broadcast campaigns found.
                        </td>
                      </tr>
                    ) : (
                      campaigns.map((c, i) => (
                        <tr
                          key={c.id}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                          }}
                        >
                          <td style={{ padding: '14px', maxWidth: '300px' }}>
                            <p style={{ margin: 0, color: 'var(--text-1)', fontWeight: 600 }}>{c.content}</p>
                            <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                              Delivered: {c.deliveredAt ? new Date(c.deliveredAt).toLocaleString('en-IN') : 'Scheduled'}
                            </span>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-1)' }}>{c.organizerName}</p>
                            <p style={{ margin: '2px 0 0', color: 'var(--text-3)', fontSize: '11px' }}>{c.eventName}</p>
                          </td>
                          <td style={{ padding: '14px', color: 'var(--text-2)' }}>{c.type}</td>
                          <td style={{ padding: '14px', textAlign: 'right', fontWeight: 600 }}>
                            {c.targetAudienceCount.toLocaleString()}
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right', color: '#60a5fa', fontWeight: 700 }}>
                            {c.creditsCost.toLocaleString()} Cr
                          </td>
                          <td style={{ padding: '14px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '100px',
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background:
                                  c.status === 'delivered'
                                    ? 'rgba(16,185,129,0.15)'
                                    : c.status === 'processing' || c.status === 'scheduled'
                                      ? 'rgba(59,130,246,0.15)'
                                      : 'rgba(239,68,68,0.15)',
                                color:
                                  c.status === 'delivered'
                                    ? 'var(--green)'
                                    : c.status === 'processing' || c.status === 'scheduled'
                                      ? '#60a5fa'
                                      : '#f87171',
                              }}
                            >
                              ● {c.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {c.status === 'flagged_content' ? (
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => handleModerateCampaign(c.id, 'approve')}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: 'rgba(16,185,129,0.15)',
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    color: 'var(--green)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Clear / Approve
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => handleModerateCampaign(c.id, 'reject')}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: 'rgba(239,68,68,0.15)',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Flag / Halt
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Grant Credits Modal ──────────────────────────────────────────────── */}
      {showGrantModal && selectedWallet && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                Issue Promotional Credits
              </h3>
              <button
                type="button"
                onClick={() => setShowGrantModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <p style={{ color: 'var(--text-2)', margin: 0 }}>
                Grant platform subsidized marketing credits to <strong>{selectedWallet.organizerName}</strong>.
              </p>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
                  Credits Amount
                </label>
                <input
                  type="number"
                  min="1"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#60a5fa',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
                  Grant Reason / Policy Note
                </label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g. Festival Season Partnership Subsidy"
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'none',
                    border: '1px solid var(--border)',
                    color: 'var(--text-3)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleGrantCredits}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: actionLoading ? 'wait' : 'pointer',
                  }}
                >
                  {actionLoading ? 'Granting...' : 'Grant Credits'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
