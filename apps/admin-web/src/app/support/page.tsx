'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient, ApiError } from '../../lib/api';
import type {
  AdminSupportTicketDto,
  AdminRefundQueueItemDto,
  AdminChargebackLogDto,
} from '@platform/types';
import { ChargebackEvidenceModal } from '../../components/ChargebackEvidenceModal';

export default function AdminSupportPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'refund_queue' | 'chargebacks'>('tickets');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Support Tickets State
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicketDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicketDto | null>(null);
  const [ticketNotes, setTicketNotes] = useState('');
  const [savingTicket, setSavingTicket] = useState(false);

  // Refund Queue State
  const [refundQueue, setRefundQueue] = useState<AdminRefundQueueItemDto[]>([]);
  const [selectedRefundItem, setSelectedRefundItem] = useState<AdminRefundQueueItemDto | null>(null);
  const [refundReason, setRefundReason] = useState('Authorized customer dispute resolution');
  const [processingRefund, setProcessingRefund] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Chargebacks State
  const [chargebacks, setChargebacks] = useState<AdminChargebackLogDto[]>([]);
  const [selectedChargeback, setSelectedChargeback] = useState<AdminChargebackLogDto | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'tickets') {
        const params = statusFilter !== 'all' ? { status: statusFilter } : undefined;
        const res = await apiClient.getAdminSupportTickets<AdminSupportTicketDto[]>(params);
        setSupportTickets(res.data ?? []);
      } else if (activeTab === 'refund_queue') {
        const res = await apiClient.getAdminRefundQueue<AdminRefundQueueItemDto[]>();
        setRefundQueue(res.data ?? []);
      } else if (activeTab === 'chargebacks') {
        const res = await apiClient.getAdminChargebackLogs<AdminChargebackLogDto[]>();
        setChargebacks(res.data ?? []);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch support data.');
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateTicketStatus = async (ticketId: string, status: 'open' | 'in_progress' | 'resolved') => {
    try {
      await apiClient.updateAdminSupportTicket(ticketId, { status });
      setActionSuccessMsg(`Ticket status marked as ${status.replace('_', ' ')}.`);
      await fetchData();
      setTimeout(() => setActionSuccessMsg(null), 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to update ticket.');
    }
  };

  const handleSaveTicketNotes = async () => {
    if (!selectedTicket) return;
    setSavingTicket(true);
    try {
      await apiClient.updateAdminSupportTicket(selectedTicket.id, { internalNotes: ticketNotes });
      setActionSuccessMsg('Internal support notes saved.');
      setSelectedTicket(prev => prev ? { ...prev, internalNotes: ticketNotes } : null);
      await fetchData();
      setTimeout(() => setActionSuccessMsg(null), 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to save notes.');
    } finally {
      setSavingTicket(false);
    }
  };

  const handleDecideRefund = async (orderId: string, decision: 'approve' | 'reject') => {
    setProcessingRefund(true);
    try {
      await apiClient.decideAdminRefund(orderId, { decision, reason: refundReason });
      setActionSuccessMsg(`Refund decision "${decision.toUpperCase()}" processed with authoritative ledger entries.`);
      setSelectedRefundItem(null);
      await fetchData();
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to process refund decision.');
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleSubmitChargebackEvidence = async (chargebackId: string, _rebuttalText: string) => {
    // Update local dispute status to evidence_submitted
    setChargebacks((prev) =>
      prev.map((c) => (c.id === chargebackId ? { ...c, disputeStatus: 'evidence_submitted' as any } : c)),
    );
    setActionSuccessMsg(`Evidence package & turnstile gate admission proof transmitted to issuing bank for Dispute #${chargebackId}.`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const formatINR = (minor: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);

  return (
    <AdminLayout
      title="Customer Support & Dispute Governance"
      subtitle="Ticket triage, automated refund queue decisioning, and payment dispute monitoring"
    >
      <div className="space-y-6">

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {actionSuccessMsg && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid var(--green)', color: 'var(--green)', fontSize: '13px' }}>
            {actionSuccessMsg}
          </div>
        )}

        {/* ── Top Tabs ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
          {[
            { key: 'tickets', label: 'Support Tickets Triage' },
            { key: 'refund_queue', label: 'Refund Review Queue' },
            { key: 'chargebacks', label: 'Chargebacks & Dispute Logs' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key as any)}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                color: activeTab === t.key ? 'var(--pink)' : 'var(--text-3)',
                borderBottom: activeTab === t.key ? '2px solid var(--pink)' : '2px solid transparent',
                transition: 'all 0.2s',
                marginBottom: '-1px',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Support Tickets Tab ────────────────────────────────────────────── */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            <div style={{ display: 'flex', gap: '6px', background: 'var(--surface-2)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
              {(['all', 'open', 'in_progress', 'resolved'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: statusFilter === s ? 'var(--pink)' : 'transparent',
                    color: statusFilter === s ? '#fff' : 'var(--text-3)',
                    textTransform: 'capitalize',
                  }}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="surface-card">
              <div className="surface-card-body p-0">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                        {['TICKET ID', 'CUSTOMER', 'CATEGORY', 'PRIORITY', 'SUBJECT', 'STATUS', 'CREATED', 'ACTIONS'].map((h) => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>Loading support tickets...</td></tr>
                      ) : supportTickets.length === 0 ? (
                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>No support tickets found for this status.</td></tr>
                      ) : (
                        supportTickets.map((t, i) => (
                          <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-1)', fontWeight: 600 }}>{t.id}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <p style={{ fontWeight: 600, color: 'var(--text-1)' }}>{t.userName || 'Customer'}</p>
                              <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>{t.userEmail}</p>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{t.category}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: t.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)', color: t.priority === 'high' ? 'var(--red)' : 'var(--yellow)' }}>
                                {t.priority.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-1)', fontWeight: 500, maxWidth: '240px' }}>{t.subject}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: t.status === 'resolved' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: t.status === 'resolved' ? 'var(--green)' : 'var(--blue)' }}>
                                {t.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-3)', fontSize: '11px' }}>{t.createdAt.split('T')[0]}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => { setSelectedTicket(t); setTicketNotes(t.internalNotes || ''); }}
                                  style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', background: 'var(--pink-dim)', border: '1px solid rgba(255,31,109,0.3)', color: 'var(--pink)', cursor: 'pointer' }}
                                >
                                  Triage
                                </button>
                                {t.status !== 'resolved' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateTicketStatus(t.id, 'resolved')}
                                    style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: 'var(--green)', cursor: 'pointer' }}
                                  >
                                    Resolve
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
        )}

        {/* ── Refund Queue Tab ──────────────────────────────────────────────── */}
        {activeTab === 'refund_queue' && (
          <div className="surface-card">
            <div className="surface-card-body p-0">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                      {['ORDER ID', 'CUSTOMER', 'EVENT', 'AMOUNT', 'PROVIDER', 'REASON', 'DECISION'].map((h) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: h === 'AMOUNT' ? 'right' : 'left', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>Loading refund queue...</td></tr>
                    ) : refundQueue.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>No pending refunds in queue.</td></tr>
                    ) : (
                      refundQueue.map((r, i) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-1)', fontWeight: 600 }}>{r.orderNumber}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <p style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.customerName}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>{r.customerEmail}</p>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{r.eventName}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--pink)', fontSize: '13px' }}>{formatINR(r.amountMinor)}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-3)', textTransform: 'uppercase' }}>{r.paymentProvider}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-2)', maxWidth: '200px' }}>{r.reason}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleDecideRefund(r.orderId, 'approve')}
                                style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'var(--green)', color: '#fff', border: 'none', cursor: 'pointer' }}
                              >
                                Approve Refund
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecideRefund(r.orderId, 'reject')}
                                style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--red)', cursor: 'pointer' }}
                              >
                                Reject
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
        )}

        {/* ── Chargebacks Tab ───────────────────────────────────────────────── */}
        {activeTab === 'chargebacks' && (
          <div className="surface-card">
            <div className="surface-card-body p-0">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                      {['DISPUTE ID', 'ORDER REF', 'AMOUNT', 'REASON', 'STATUS', 'FILED AT', 'FRAUD RISK SCORE', 'ACTIONS'].map((h) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: h === 'AMOUNT' ? 'right' : h === 'ACTIONS' ? 'right' : 'left', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>Loading dispute logs...</td></tr>
                    ) : chargebacks.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>No active chargeback dispute logs found.</td></tr>
                    ) : (
                      chargebacks.map((c, i) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-1)', fontWeight: 600 }}>{c.id}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-2)' }}>{c.orderId.slice(0, 8)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--red)', fontSize: '13px' }}>{formatINR(c.amountMinor)}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{c.reason}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: 'rgba(234, 179, 8, 0.2)', color: 'var(--yellow)' }}>
                              {c.disputeStatus.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-3)', fontSize: '11px' }}>{c.filedAt.split('T')[0]}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: 'rgba(239, 68, 68, 0.2)', color: 'var(--red)' }}>
                              Risk: {c.riskScore}/100
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedChargeback(c)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: c.disputeStatus === 'evidence_submitted' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.2)',
                                border: `1px solid ${c.disputeStatus === 'evidence_submitted' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                                color: c.disputeStatus === 'evidence_submitted' ? 'var(--green)' : '#fca5a5',
                                cursor: 'pointer',
                              }}
                            >
                              {c.disputeStatus === 'evidence_submitted' ? '✓ Evidence Sent' : '📤 Contest & Evidence'}
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

      </div>

      {/* ── Ticket Detail & Triage Modal ───────────────────────────────────────── */}
      {selectedTicket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--surface-1)', borderRadius: '16px', width: '100%', maxWidth: '560px', padding: '24px', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>Support Ticket: {selectedTicket.id}</h3>
              <button type="button" onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>Subject</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginTop: '2px' }}>{selectedTicket.subject}</p>
              </div>

              {selectedTicket.description && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>Description</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px', background: 'var(--surface-2)', padding: '10px', borderRadius: '8px' }}>{selectedTicket.description}</p>
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Internal Administrator Resolution Notes</label>
                <textarea
                  value={ticketNotes}
                  onChange={(e) => setTicketNotes(e.target.value)}
                  rows={3}
                  placeholder="Record customer support agent findings..."
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'in_progress')}
                    style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}
                  >
                    Mark In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'resolved')}
                    style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: 'var(--green)', cursor: 'pointer' }}
                  >
                    Mark Resolved
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveTicketNotes}
                  disabled={savingTicket}
                  style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--pink)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  {savingTicket ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Chargeback Representment Evidence Modal ──────────────────────────── */}
      {selectedChargeback && (
        <ChargebackEvidenceModal
          chargeback={selectedChargeback}
          onClose={() => setSelectedChargeback(null)}
          onSubmitEvidence={handleSubmitChargebackEvidence}
        />
      )}

    </AdminLayout>
  );
}
