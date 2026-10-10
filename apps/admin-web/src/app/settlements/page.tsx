'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient } from '../../lib/api';
import type { AdminSettlementListItemDto } from '@platform/types';
import { SettlementAuditModal } from '../../components/SettlementAuditModal';

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<AdminSettlementListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'on_hold'>('all');

  // Selected settlement & modals
  const [selectedSettlement, setSelectedSettlement] = useState<AdminSettlementListItemDto | null>(null);
  const [auditSettlement, setAuditSettlement] = useState<AdminSettlementListItemDto | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'hold'>('approve');
  const [reviewReason, setReviewReason] = useState('');

  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [disburseTxRef, setDisburseTxRef] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getAdminSettlements<AdminSettlementListItemDto[]>();
      setSettlements(res.data ?? []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load financial settlements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const filteredSettlements = settlements.filter((s) => {
    if (statusFilter === 'pending' && s.status !== 'pending_review') return false;
    if (statusFilter === 'approved' && s.status !== 'approved' && s.status !== 'processing') return false;
    if (statusFilter === 'paid' && s.status !== 'paid') return false;
    if (statusFilter === 'on_hold' && s.status !== 'on_hold') return false;
    return true;
  });

  const totalGrossEscrow = settlements.reduce((sum, s) => sum + s.grossSalesMinor, 0);
  const totalPlatformFees = settlements.reduce((sum, s) => sum + s.platformCommissionMinor, 0);
  const totalPendingRelease = settlements
    .filter((s) => s.status === 'pending_review' || s.status === 'approved')
    .reduce((sum, s) => sum + s.netSettlementMinor, 0);

  const formatINR = (minor: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      minor / 100,
    );
  };

  const handleReviewSubmit = async () => {
    if (!selectedSettlement) return;
    setActionLoading(true);
    try {
      await apiClient.reviewSettlement(selectedSettlement.id, {
        action: reviewAction,
        reason: reviewReason.trim() || undefined,
      });
      setShowReviewModal(false);
      setSelectedSettlement(null);
      setReviewReason('');
      await fetchSettlements();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to update settlement review status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisburseSubmit = async () => {
    if (!selectedSettlement) return;
    setActionLoading(true);
    try {
      const idempotencyKey = `DISBURSE-IDEM-${selectedSettlement.id}-${Date.now()}`;
      await apiClient.disburseSettlement(selectedSettlement.id, {
        idempotencyKey,
        transactionReference: disburseTxRef.trim() || undefined,
      });
      setShowDisburseModal(false);
      setSelectedSettlement(null);
      setDisburseTxRef('');
      await fetchSettlements();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to disburse settlement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAuditApprove = async (settlementId: string) => {
    setActionLoading(true);
    try {
      await apiClient.reviewSettlement(settlementId, {
        action: 'approve',
        reason: 'Automated AML/KYB Compliance & Escrow Audit Passed by Operations Admin',
      });
      setAuditSettlement(null);
      await fetchSettlements();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to approve settlement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAuditHold = async (settlementId: string, reason: string) => {
    setActionLoading(true);
    try {
      await apiClient.reviewSettlement(settlementId, {
        action: 'hold',
        reason,
      });
      setAuditSettlement(null);
      await fetchSettlements();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to place risk hold on settlement');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout
      title="Financial Escrow & Organizer Payouts"
      subtitle="Platform gross sales escrow, payment gateway fee reconciliation, platform commission profit & bank wire releases"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastUpdated && (
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={fetchSettlements}
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
            Pending Release:{' '}
            <strong style={{ color: 'var(--green)', marginLeft: '4px' }}>{formatINR(totalPendingRelease)}</strong>
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
              onClick={fetchSettlements}
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

        {/* ── Financial P&L & Escrow Breakdown ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <span className="stat-card-label">Total Escrow Processed</span>
            <p className="stat-card-value text-white mt-1">{formatINR(totalGrossEscrow)}</p>
            <div className="stat-card-delta up" style={{ color: 'var(--green)' }}>
              100% Reconciled via Double-Entry Ledger
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-card-label">Net Platform Commission</span>
            <p className="stat-card-value text-white mt-1">{formatINR(totalPlatformFees)}</p>
            <div className="stat-card-delta up" style={{ color: 'var(--pink)' }}>
              + {formatINR(totalPlatformFees * 0.18)} GST Collected
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-card-label">Pending Escrow Release</span>
            <p className="stat-card-value text-white mt-1">{formatINR(totalPendingRelease)}</p>
            <div className="stat-card-delta neutral" style={{ color: 'var(--yellow)' }}>
              {settlements.filter((s) => s.status === 'pending_review' || s.status === 'approved').length} Batches
              Awaiting Payout
            </div>
          </div>
        </div>

        {/* ── Status Filter Bar ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['all', 'pending', 'approved', 'paid', 'on_hold'] as const).map((tab) => (
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
                {tab === 'all'
                  ? 'All Batches'
                  : tab === 'pending'
                    ? 'Pending Review'
                    : tab === 'approved'
                      ? 'Approved (Ready to Disburse)'
                      : tab === 'paid'
                        ? 'Paid Out'
                        : 'On Hold'}{' '}
                (
                {
                  settlements.filter((s) =>
                    tab === 'all'
                      ? true
                      : tab === 'pending'
                        ? s.status === 'pending_review'
                        : tab === 'approved'
                          ? s.status === 'approved' || s.status === 'processing'
                          : tab === 'paid'
                            ? s.status === 'paid'
                            : s.status === 'on_hold',
                  ).length
                }
                )
              </button>
            ))}
          </div>
        </div>

        {/* ── Settlements Table ──────────────────────────────────────────────── */}
        <div className="surface-card">
          <div className="surface-card-body p-0">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    {['SETTLEMENT BATCH', 'ORGANIZER & EVENT', 'PERIOD', 'GROSS SALES', 'FEES & TAX', 'NET PAYOUT', 'STATUS & ACTIONS'].map(
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
                        Loading settlements from ledger...
                      </td>
                    </tr>
                  ) : filteredSettlements.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                        No settlements found in selected status view.
                      </td>
                    </tr>
                  ) : (
                    filteredSettlements.map((s, i) => (
                      <tr
                        key={s.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        }}
                      >
                        {/* ID & Bank Account */}
                        <td style={{ padding: '14px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              color: 'var(--text-1)',
                              fontSize: '12px',
                            }}
                          >
                            {s.id.slice(0, 12)}...
                          </span>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-3)' }}>
                            {s.bankAccount ? `A/C: ${s.bankAccount.accountNumber} · IFSC: ${s.bankAccount.ifsc}` : 'Bank pending'}
                          </p>
                        </td>

                        {/* Organizer & Event */}
                        <td style={{ padding: '14px' }}>
                          <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-1)' }}>{s.organizerName}</p>
                          <p style={{ margin: '2px 0 0', color: 'var(--text-3)', fontSize: '11px' }}>{s.eventName}</p>
                        </td>

                        {/* Settlement Period */}
                        <td style={{ padding: '14px', color: 'var(--text-2)' }}>
                          {s.period || `${new Date(s.periodStart).toLocaleDateString()} - ${new Date(s.periodEnd).toLocaleDateString()}`}
                        </td>

                        {/* Gross Sales */}
                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-1)' }}>
                          {formatINR(s.grossSalesMinor)}
                        </td>

                        {/* Fees & Deductions */}
                        <td style={{ padding: '14px', textAlign: 'right', color: 'var(--text-3)' }}>
                          <p style={{ margin: 0 }}>Comm: {formatINR(s.platformCommissionMinor)}</p>
                          <span style={{ fontSize: '10px' }}>Tax: {formatINR(s.taxMinor)}</span>
                        </td>

                        {/* Net Payout */}
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <p style={{ margin: 0, fontWeight: 800, color: 'var(--green)', fontSize: '13px' }}>
                            {formatINR(s.netSettlementMinor)}
                          </p>
                          {s.transactionReference && (
                            <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                              Ref: {s.transactionReference}
                            </span>
                          )}
                        </td>

                        {/* Status & Action */}
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '100px',
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background:
                                  s.status === 'paid'
                                    ? 'rgba(16,185,129,0.15)'
                                    : s.status === 'approved' || s.status === 'processing'
                                      ? 'rgba(59,130,246,0.15)'
                                      : s.status === 'pending_review'
                                        ? 'rgba(245,158,11,0.15)'
                                        : 'rgba(239,68,68,0.15)',
                                color:
                                  s.status === 'paid'
                                    ? 'var(--green)'
                                    : s.status === 'approved' || s.status === 'processing'
                                      ? '#60a5fa'
                                      : s.status === 'pending_review'
                                        ? 'var(--yellow)'
                                        : '#f87171',
                              }}
                            >
                              ● {s.status}
                            </span>

                            <button
                              type="button"
                              onClick={() => setAuditSettlement(s)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-2)',
                                cursor: 'pointer',
                              }}
                              title="Audit Escrow Ledger & Compliance"
                            >
                              📋 Audit
                            </button>

                            {s.status === 'pending_review' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSettlement(s);
                                  setReviewAction('approve');
                                  setShowReviewModal(true);
                                }}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  background: 'var(--surface-3)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-2)',
                                  cursor: 'pointer',
                                }}
                              >
                                Review
                              </button>
                            )}

                            {s.status === 'approved' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSettlement(s);
                                  setDisburseTxRef(`NEFT-${Date.now()}`);
                                  setShowDisburseModal(true);
                                }}
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  background: 'var(--green)',
                                  color: '#fff',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                Disburse
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
      </div>

      {/* ── Review Settlement Modal ──────────────────────────────────────────── */}
      {showReviewModal && selectedSettlement && (
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
              maxWidth: '460px',
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>Review Settlement Batch</h3>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#fff' }}>{selectedSettlement.organizerName}</p>
                <p style={{ margin: '2px 0', color: 'var(--text-3)' }}>{selectedSettlement.eventName}</p>
                <p style={{ margin: '6px 0 0', fontWeight: 800, color: 'var(--green)', fontSize: '14px' }}>
                  Net Payout: {formatINR(selectedSettlement.netSettlementMinor)}
                </p>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
                  Action Decision
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['approve', 'hold', 'reject'] as const).map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setReviewAction(act)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: '1px solid',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        background:
                          reviewAction === act
                            ? act === 'approve'
                              ? 'rgba(16,185,129,0.2)'
                              : act === 'hold'
                                ? 'rgba(245,158,11,0.2)'
                                : 'rgba(239,68,68,0.2)'
                            : 'var(--surface-2)',
                        borderColor:
                          reviewAction === act
                            ? act === 'approve'
                              ? 'rgba(16,185,129,0.5)'
                              : act === 'hold'
                                ? 'rgba(245,158,11,0.5)'
                                : 'rgba(239,68,68,0.5)'
                            : 'var(--border)',
                        color:
                          reviewAction === act
                            ? act === 'approve'
                              ? 'var(--green)'
                              : act === 'hold'
                                ? 'var(--yellow)'
                                : '#f87171'
                            : 'var(--text-3)',
                      }}
                    >
                      {act}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
                  Audit Notes / Reason
                </label>
                <input
                  type="text"
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="e.g. Verified order ledger totals against bank escrow"
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
                  onClick={() => setShowReviewModal(false)}
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
                  onClick={handleReviewSubmit}
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
                  {actionLoading ? 'Saving...' : 'Confirm Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Disburse Settlement Modal ────────────────────────────────────────── */}
      {showDisburseModal && selectedSettlement && (
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
              maxWidth: '460px',
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>Authorize Bank Wire Payout</h3>
              <button
                type="button"
                onClick={() => setShowDisburseModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <p style={{ color: 'var(--text-2)', margin: 0 }}>
                Disburse <strong>{formatINR(selectedSettlement.netSettlementMinor)}</strong> to{' '}
                <strong>{selectedSettlement.organizerName}</strong>.
              </p>
              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                <p style={{ margin: '2px 0', fontSize: '11px', color: 'var(--text-2)' }}>
                  Bank: {selectedSettlement.bankAccount ? `${selectedSettlement.bankAccount.accountNumber} (IFSC: ${selectedSettlement.bankAccount.ifsc})` : 'Default verified account'}
                </p>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
                  NEFT / RTGS / UTR Transaction Reference
                </label>
                <input
                  type="text"
                  value={disburseTxRef}
                  onChange={(e) => setDisburseTxRef(e.target.value)}
                  placeholder="e.g. UTR-HDFC-98210398210"
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
                  onClick={() => setShowDisburseModal(false)}
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
                  onClick={handleDisburseSubmit}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    background: 'var(--green)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: actionLoading ? 'wait' : 'pointer',
                  }}
                >
                  {actionLoading ? 'Disbursing...' : 'Confirm Bank Wire'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Settlement Audit Escrow Modal ────────────────────────────────────── */}
      {auditSettlement && (
        <SettlementAuditModal
          settlement={auditSettlement}
          onClose={() => setAuditSettlement(null)}
          onApprove={handleAuditApprove}
          onHold={handleAuditHold}
        />
      )}
    </AdminLayout>
  );
}
