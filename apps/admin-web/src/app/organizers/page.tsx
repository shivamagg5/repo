'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient } from '../../lib/api';
import type { AdminOrganizerListItemDto } from '@platform/types';

export default function AdminOrganizersPage() {
  const [organizers, setOrganizers] = useState<AdminOrganizerListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'suspended'>('all');

  // Selected organizer & modals
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganizerListItemDto | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // KYB Modal
  const [showKybModal, setShowKybModal] = useState(false);
  const [kybDecision, setKybDecision] = useState<'verified' | 'rejected'>('verified');
  const [kybReason, setKybReason] = useState('');

  // Credits Modal
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditsAmount, setCreditsAmount] = useState('500');
  const [creditsReason, setCreditsReason] = useState('Promotional Bonus');

  // Commission Modal
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState('4.0');

  const fetchOrganizers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getAdminOrganizers<AdminOrganizerListItemDto[]>();
      setOrganizers(res.data ?? []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load organizers directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizers();
  }, [fetchOrganizers]);

  const filteredOrganizers = organizers.filter((org) => {
    if (statusFilter === 'verified' && org.kybStatus !== 'verified') return false;
    if (statusFilter === 'pending' && org.kybStatus !== 'pending') return false;
    if (statusFilter === 'suspended' && org.status !== 'suspended') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        org.name.toLowerCase().includes(q) ||
        (org.legalEntityName || '').toLowerCase().includes(q) ||
        (org.email || '').toLowerCase().includes(q) ||
        (org.phone || '').includes(q) ||
        (org.bankAccount?.pan || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatINR = (minor: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      minor / 100,
    );
  };

  const handleKybSubmit = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      await apiClient.reviewAdminOrganizerKyb(selectedOrg.id, {
        status: kybDecision,
        rejectionReason: kybDecision === 'rejected' ? kybReason.trim() : undefined,
      });
      setShowKybModal(false);
      setSelectedOrg(null);
      setKybReason('');
      await fetchOrganizers();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to update KYB status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusToggle = async (org: AdminOrganizerListItemDto) => {
    const nextStatus = org.status === 'active' ? 'suspended' : 'active';
    const reason = prompt(`Confirm change organizer status to ${nextStatus.toUpperCase()}? Reason:`);
    if (reason === null) return; // user cancelled

    setActionLoading(true);
    try {
      await apiClient.updateAdminOrganizerStatus(org.id, {
        status: nextStatus,
        reason: reason || `Admin updated status to ${nextStatus}`,
      });
      await fetchOrganizers();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to update organizer account status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCommissionSubmit = async () => {
    if (!selectedOrg) return;
    const pct = parseFloat(commissionPercent);
    if (isNaN(pct) || pct < 0 || pct > 50) {
      alert('Commission rate must be between 0% and 50%');
      return;
    }
    const bps = Math.round(pct * 100);
    setActionLoading(true);
    try {
      await apiClient.updateAdminOrganizerCommission(selectedOrg.id, { commissionRateBps: bps });
      setShowCommissionModal(false);
      setSelectedOrg(null);
      await fetchOrganizers();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to update commission rate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreditsSubmit = async () => {
    if (!selectedOrg) return;
    const credits = parseInt(creditsAmount, 10);
    if (isNaN(credits) || credits <= 0) {
      alert('Please enter a positive credit amount');
      return;
    }
    const amountMinor = credits * 100;
    setActionLoading(true);
    try {
      await apiClient.grantAdminMarketingCredits(selectedOrg.id, {
        amountMinor,
        reason: creditsReason.trim() || 'Admin credit grant',
      });
      setShowCreditsModal(false);
      setSelectedOrg(null);
      await fetchOrganizers();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to grant marketing credits');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout
      title="Organizers & KYB Verification Hub"
      subtitle="Ecosystem tenant directory, business validation, marketing wallet control & custom commission overrides"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastUpdated && (
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={fetchOrganizers}
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
            Total Registered: <strong style={{ color: '#fff', marginLeft: '4px' }}>{organizers.length}</strong>
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
              onClick={fetchOrganizers}
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
            {(['all', 'verified', 'pending', 'suspended'] as const).map((tab) => (
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
                {tab === 'all' ? 'All Organizers' : tab === 'pending' ? 'Pending KYB' : tab} (
                {
                  organizers.filter((o) =>
                    tab === 'all'
                      ? true
                      : tab === 'verified'
                        ? o.kybStatus === 'verified'
                        : tab === 'pending'
                          ? o.kybStatus === 'pending'
                          : o.status === 'suspended',
                  ).length
                }
                )
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
              placeholder="Search organizer, brand, email, or PAN..."
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

        {/* ── Organizers Master Table ────────────────────────────────────────── */}
        <div className="surface-card">
          <div className="surface-card-body p-0">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    {['ORGANIZER & ENTITY', 'CONTACT', 'KYB / DOCS', 'COMMISSION', 'AD WALLET', 'EVENTS & GMV', 'ACTIONS'].map(
                      (h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: '12px 14px',
                            textAlign: i === 3 || i === 4 || i === 5 ? 'right' : 'left',
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
                        Loading verified organizer records...
                      </td>
                    </tr>
                  ) : filteredOrganizers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                        No organizer accounts found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrganizers.map((org, i) => (
                      <tr
                        key={org.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        }}
                      >
                        {/* Organizer Name & Legal Entity */}
                        <td style={{ padding: '14px' }}>
                          <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: '13px' }}>
                            {org.name}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                            {org.legalEntityName || 'Entity name pending'}
                          </p>
                          <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                            ID: {org.id}
                          </span>
                        </td>

                        {/* Contact Details */}
                        <td style={{ padding: '14px' }}>
                          <p style={{ color: 'var(--text-2)', margin: 0 }}>{org.email || '—'}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                            {org.phone || '—'}
                          </p>
                        </td>

                        {/* KYB Status & Tax Details */}
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
                                org.kybStatus === 'verified'
                                  ? 'rgba(16,185,129,0.15)'
                                  : org.kybStatus === 'pending'
                                    ? 'rgba(245,158,11,0.15)'
                                    : 'rgba(239,68,68,0.15)',
                              color:
                                org.kybStatus === 'verified'
                                  ? 'var(--green)'
                                  : org.kybStatus === 'pending'
                                    ? 'var(--yellow)'
                                    : 'var(--orange)',
                            }}
                          >
                            ● {org.kybStatus}
                          </span>
                          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>
                            {org.bankAccount?.pan && <span>PAN: {org.bankAccount.pan} · </span>}
                            <span>GST: {org.bankAccount?.gstin ? 'Verified' : 'Unregistered'}</span>
                          </div>
                        </td>

                        {/* Platform Commission Override */}
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: '13px' }}>
                            {org.platformCommissionRate.toFixed(1)}%
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrg(org);
                              setCommissionPercent(org.platformCommissionRate.toFixed(1));
                              setShowCommissionModal(true);
                            }}
                            style={{
                              fontSize: '10px',
                              color: 'var(--pink)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              marginTop: '2px',
                            }}
                          >
                            Edit override
                          </button>
                        </td>

                        {/* Ad / Marketing Wallet */}
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <p style={{ fontWeight: 700, color: '#60a5fa', margin: 0, fontSize: '13px' }}>
                            {org.walletCreditsBalance.toLocaleString()} Cr
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrg(org);
                              setCreditsAmount('500');
                              setShowCreditsModal(true);
                            }}
                            style={{
                              fontSize: '10px',
                              color: '#60a5fa',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              marginTop: '2px',
                            }}
                          >
                            + Grant credits
                          </button>
                        </td>

                        {/* Events & GMV */}
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <p style={{ fontWeight: 700, color: 'var(--green)', margin: 0, fontSize: '13px' }}>
                            {formatINR(org.totalGmvMinor)}
                          </p>
                          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                            {org.eventsCount} Event{org.eventsCount === 1 ? '' : 's'}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrg(org);
                                setKybDecision(org.kybStatus === 'verified' ? 'rejected' : 'verified');
                                setShowKybModal(true);
                              }}
                              style={{
                                padding: '5px 9px',
                                borderRadius: '7px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: 'var(--surface-3)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-2)',
                                cursor: 'pointer',
                              }}
                            >
                              Review KYB
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(org)}
                              style={{
                                padding: '5px 9px',
                                borderRadius: '7px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: org.status === 'active' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                border: `1px solid ${org.status === 'active' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                color: org.status === 'active' ? '#f87171' : 'var(--green)',
                                cursor: 'pointer',
                              }}
                            >
                              {org.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
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
      </div>

      {/* ── KYB Review Modal ─────────────────────────────────────────────────── */}
      {showKybModal && selectedOrg && (
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
              maxWidth: '480px',
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
                KYB Business Verification
              </h3>
              <button
                type="button"
                onClick={() => setShowKybModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#fff' }}>{selectedOrg.name}</p>
                <p style={{ margin: '2px 0 0', color: 'var(--text-3)' }}>{selectedOrg.legalEntityName || 'No legal name specified'}</p>
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-2)' }}>
                  <p style={{ margin: '2px 0' }}>PAN: {selectedOrg.bankAccount?.pan || 'Not provided'}</p>
                  <p style={{ margin: '2px 0' }}>GSTIN: {selectedOrg.bankAccount?.gstin || 'Unregistered'}</p>
                  <p style={{ margin: '2px 0' }}>Account: {selectedOrg.bankAccount?.accountNumber || 'Pending verification'}</p>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
                  Verification Decision
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setKybDecision('verified')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: '1px solid',
                      cursor: 'pointer',
                      background: kybDecision === 'verified' ? 'rgba(16,185,129,0.2)' : 'var(--surface-2)',
                      borderColor: kybDecision === 'verified' ? 'rgba(16,185,129,0.5)' : 'var(--border)',
                      color: kybDecision === 'verified' ? 'var(--green)' : 'var(--text-3)',
                    }}
                  >
                    ✓ Verify Business
                  </button>
                  <button
                    type="button"
                    onClick={() => setKybDecision('rejected')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: '1px solid',
                      cursor: 'pointer',
                      background: kybDecision === 'rejected' ? 'rgba(239,68,68,0.2)' : 'var(--surface-2)',
                      borderColor: kybDecision === 'rejected' ? 'rgba(239,68,68,0.5)' : 'var(--border)',
                      color: kybDecision === 'rejected' ? '#f87171' : 'var(--text-3)',
                    }}
                  >
                    ✕ Reject KYB
                  </button>
                </div>
              </div>

              {kybDecision === 'rejected' && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
                    Rejection Reason
                  </label>
                  <input
                    type="text"
                    value={kybReason}
                    onChange={(e) => setKybReason(e.target.value)}
                    placeholder="e.g. Mismatched PAN card or invalid GSTIN documentation"
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
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowKybModal(false)}
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
                  onClick={handleKybSubmit}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    background: kybDecision === 'verified' ? 'var(--green)' : '#ef4444',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: actionLoading ? 'wait' : 'pointer',
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Confirm Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Commission Override Modal ────────────────────────────────────────── */}
      {showCommissionModal && selectedOrg && (
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
                Custom Commission Override
              </h3>
              <button
                type="button"
                onClick={() => setShowCommissionModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <p style={{ color: 'var(--text-2)', margin: 0 }}>
                Set negotiated platform take rate for <strong>{selectedOrg.name}</strong>. Default ecosystem rate is 10.0% (1,000 bps).
              </p>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
                  Commission Rate (%)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                  <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>%</span>
                  <span style={{ color: 'var(--text-3)', fontSize: '11px' }}>
                    ({Math.round((parseFloat(commissionPercent) || 0) * 100)} bps)
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCommissionModal(false)}
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
                  onClick={handleCommissionSubmit}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    background: 'var(--pink)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: actionLoading ? 'wait' : 'pointer',
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Save Override'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Grant Credits Modal ──────────────────────────────────────────────── */}
      {showCreditsModal && selectedOrg && (
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
                Grant Marketing Credits
              </h3>
              <button
                type="button"
                onClick={() => setShowCreditsModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <p style={{ color: 'var(--text-2)', margin: 0 }}>
                Credit promotional ad balance for <strong>{selectedOrg.name}</strong> (1 credit = ₹1).
              </p>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
                  Credits to Add
                </label>
                <input
                  type="number"
                  min="1"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(e.target.value)}
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
                  Grant Reason / Audit Memo
                </label>
                <input
                  type="text"
                  value={creditsReason}
                  onChange={(e) => setCreditsReason(e.target.value)}
                  placeholder="e.g. Festival Season Partnership Bonus"
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
                  onClick={() => setShowCreditsModal(false)}
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
                  onClick={handleCreditsSubmit}
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
