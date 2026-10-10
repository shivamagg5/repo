'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient } from '../../lib/api';
import type { AdminPromoterListItemDto } from '@platform/types';

export default function AdminPromotersPage() {
  const [promoters, setPromoters] = useState<AdminPromoterListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'flagged' | 'suspended'>('all');

  // Payout processing modal
  const [selectedPromoter, setSelectedPromoter] = useState<AdminPromoterListItemDto | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPromoters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getAdminPromoters<AdminPromoterListItemDto[]>();
      setPromoters(res.data ?? []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load promoter network');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromoters();
  }, [fetchPromoters]);

  const filteredPromoters = promoters.filter((p) => {
    if (statusFilter === 'active' && p.status !== 'active') return false;
    if (statusFilter === 'flagged' && p.status !== 'flagged') return false;
    if (statusFilter === 'suspended' && p.status !== 'suspended') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.referralCode || '').toLowerCase().includes(q) ||
        p.linkedOrganizer.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatINR = (minor: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      minor / 100,
    );
  };

  const handleProcessPayout = async (payoutId: string) => {
    if (!confirm('Confirm disbursement of this promoter payout?')) return;
    setActionLoading(true);
    try {
      const idempotencyKey = `PAYOUT-IDEM-${payoutId}-${Date.now()}`;
      await apiClient.processAdminPromoterPayout(payoutId, { idempotencyKey });
      setShowPayoutModal(false);
      setSelectedPromoter(null);
      await fetchPromoters();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to process promoter payout');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayout = async (payoutId: string) => {
    const reason = prompt('Enter rejection reason for this payout request:');
    if (reason === null) return;
    setActionLoading(true);
    try {
      await apiClient.rejectAdminPromoterPayout(payoutId, reason.trim() || 'Audit failed');
      setShowPayoutModal(false);
      setSelectedPromoter(null);
      await fetchPromoters();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to reject promoter payout');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout
      title="Promoter & Affiliate Referral Network"
      subtitle="Ecosystem affiliate links, influencer conversion tracking, anti-fraud audits & commission settlements"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastUpdated && (
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={fetchPromoters}
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
          <span style={{ fontSize: '12px', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
            Total Promoters: <strong style={{ color: '#fff', marginLeft: '4px' }}>{promoters.length}</strong>
          </span>
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
              onClick={fetchPromoters}
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

        {/* ── Search & Filter Bar ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['all', 'active', 'flagged', 'suspended'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid',
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: statusFilter === tab ? 'var(--pink-dim)' : 'var(--surface-2)',
                  borderColor: statusFilter === tab ? 'var(--pink)' : 'var(--border)',
                  color: statusFilter === tab ? 'var(--pink)' : 'var(--text-3)',
                }}
              >
                {tab === 'all' ? 'All Promoters' : tab === 'flagged' ? 'Flagged (Anti-Fraud)' : tab} (
                {promoters.filter((p) => (tab === 'all' ? true : p.status === tab)).length})
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--surface-3)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 14px',
              width: '320px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search promoter, referral code, or organizer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-1)',
                fontSize: '12px',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* ── Promoters Table ────────────────────────────────────────────────── */}
        <div className="surface-card">
          <div className="surface-card-body p-0">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    {['PROMOTER', 'REFERRAL CODE & LINK', 'LINKED ORGANIZER', 'CLICKS / SALES', 'TOTAL SALES (GMV)', 'UNPAID COMMISSION', 'ACTIONS'].map(
                      (h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: '12px 14px',
                            textAlign: i >= 3 && i <= 5 ? 'right' : 'left',
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            color: 'var(--text-3)',
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                        Loading affiliate promoters directory...
                      </td>
                    </tr>
                  ) : filteredPromoters.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                        No promoter records found.
                      </td>
                    </tr>
                  ) : (
                    filteredPromoters.map((p, i) => (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        }}
                      >
                        {/* Promoter Name & Contact */}
                        <td style={{ padding: '14px' }}>
                          <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: '13px' }}>
                            {p.name}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '2px 0 0' }}>{p.email}</p>
                          <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                            ID: {p.id}
                          </span>
                        </td>

                        {/* Referral Code & Tag */}
                        <td style={{ padding: '14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'var(--surface-3)',
                              border: '1px solid var(--border)',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              color: 'var(--pink)',
                              fontSize: '11px',
                            }}
                          >
                            {p.referralCode || `REF-${p.id.slice(0, 6)}`}
                          </span>
                          <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>
                            Rate: {p.commissionRate.toFixed(1)}%
                          </span>
                        </td>

                        {/* Linked Organizer */}
                        <td style={{ padding: '14px', color: 'var(--text-2)', fontWeight: 600 }}>
                          {p.linkedOrganizer}
                        </td>

                        {/* Clicks & Conversions */}
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: '13px' }}>
                            {p.ticketsSold.toLocaleString()} tickets
                          </p>
                          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                            {p.totalClicks.toLocaleString()} link clicks
                          </span>
                        </td>

                        {/* Total GMV Generated */}
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <p style={{ fontWeight: 700, color: 'var(--green)', margin: 0, fontSize: '13px' }}>
                            {formatINR(p.grossSalesMinor)}
                          </p>
                          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                            Earned: {formatINR(p.commissionEarnedMinor)}
                          </span>
                        </td>

                        {/* Unpaid Commission Balance */}
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <p
                            style={{
                              fontWeight: 800,
                              color: p.unpaidCommissionMinor > 0 ? '#60a5fa' : 'var(--text-3)',
                              margin: 0,
                              fontSize: '13px',
                            }}
                          >
                            {formatINR(p.unpaidCommissionMinor)}
                          </p>
                          {p.pendingPayouts && p.pendingPayouts.length > 0 ? (
                            <span style={{ fontSize: '10px', color: 'var(--yellow)', fontWeight: 700 }}>
                              {p.pendingPayouts.length} payout request(s)
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>No open requests</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPromoter(p);
                              setShowPayoutModal(true);
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '7px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background:
                                p.pendingPayouts && p.pendingPayouts.length > 0
                                  ? 'var(--pink)'
                                  : 'var(--surface-3)',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {p.pendingPayouts && p.pendingPayouts.length > 0
                              ? 'Review Payout'
                              : 'Payout History'}
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
      </div>

      {/* ── Promoter Payout Processing Modal ─────────────────────────────────── */}
      {showPayoutModal && selectedPromoter && (
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
              maxWidth: '540px',
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
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Promoter Payout Settlement
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                  {selectedPromoter.name} ({selectedPromoter.referralCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPayoutModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Total Commission Earned</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--green)' }}>
                    {formatINR(selectedPromoter.commissionEarnedMinor)}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Unpaid Available Balance</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#60a5fa' }}>
                    {formatINR(selectedPromoter.unpaidCommissionMinor)}
                  </p>
                </div>
              </div>

              <div>
                <p style={{ fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Pending Payout Requests</p>
                {!selectedPromoter.pendingPayouts || selectedPromoter.pendingPayouts.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)', background: 'var(--surface-2)', borderRadius: '8px' }}>
                    No pending payout requests submitted by this promoter.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedPromoter.pendingPayouts.map((req) => (
                      <div
                        key={req.id}
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: '#fff' }}>
                            {formatINR(req.amountMinor)}
                          </p>
                          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                            Requested: {new Date(req.createdAt).toLocaleDateString()} · Status: {req.status}
                          </span>
                          {req.destinationReference && (
                            <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--text-2)' }}>
                              Destination: {req.destinationReference}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleRejectPayout(req.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: 'rgba(239,68,68,0.15)',
                              border: '1px solid rgba(239,68,68,0.3)',
                              color: '#f87171',
                              cursor: 'pointer',
                            }}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleProcessPayout(req.id)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: 'var(--green)',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {actionLoading ? 'Processing...' : 'Disburse'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
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
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
