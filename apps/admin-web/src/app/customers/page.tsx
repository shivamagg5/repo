'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient, ApiError } from '../../lib/api';
import type { AdminCustomerListItemDto, AdminCustomerDetailDto } from '@platform/types';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomerListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'vip' | 'regular' | 'suspended'>('all');

  // Customer 360° Profile Modal
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomerDetailDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Ticket Modal states
  const [reissuingTicketId, setReissuingTicketId] = useState<string | null>(null);
  const [reissueReason, setReissueReason] = useState('Customer mobile corrupted / QR regeneration');
  const [transferTicketId, setTransferTicketId] = useState<string | null>(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferReason, setTransferReason] = useState('Authorized administrative transfer');
  const [ticketActionMsg, setTicketActionMsg] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (searchQuery.trim()) params['search'] = searchQuery.trim();
      if (tierFilter !== 'all') params['tier'] = tierFilter;

      const res = await apiClient.getAdminCustomers<{ data: AdminCustomerListItemDto[] }>(params);
      setCustomers(res.data?.data ?? []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load customer directory.');
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, tierFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openCustomerProfile = async (customer: AdminCustomerListItemDto) => {
    setLoadingDetail(true);
    setActionSuccessMsg(null);
    try {
      const res = await apiClient.getAdminCustomerProfile<AdminCustomerDetailDto>(customer.id);
      setSelectedCustomer(res.data);
      setEditNotes(res.data.adminNotes || '');
    } catch {
      setSelectedCustomer({
        ...customer,
        pastEventsAttended: [],
      });
      setEditNotes(customer.adminNotes || '');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return;
    setSavingNotes(true);
    try {
      await apiClient.updateAdminCustomerNotes(selectedCustomer.id, editNotes);
      setActionSuccessMsg('Admin customer notes saved successfully.');
      setSelectedCustomer(prev => prev ? { ...prev, adminNotes: editNotes } : null);
      await fetchCustomers();
      setTimeout(() => setActionSuccessMsg(null), 2500);
    } catch (err: any) {
      setActionSuccessMsg(err?.message || 'Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleReissueTicket = async (ticketId: string) => {
    setTicketActionMsg(null);
    try {
      const res = await apiClient.reissueAdminCustomerTicket<{ qrToken: string; ticketNumber: string }>(ticketId, reissueReason);
      setTicketActionMsg(`Ticket ${res.data?.ticketNumber ?? ticketId} reissued with fresh offline ECDSA token.`);
      setReissuingTicketId(null);
      if (selectedCustomer) {
        openCustomerProfile(selectedCustomer);
      }
      setTimeout(() => setTicketActionMsg(null), 3000);
    } catch (err: any) {
      setTicketActionMsg(err?.message || 'Failed to reissue ticket.');
    }
  };

  const handleTransferTicket = async (ticketId: string) => {
    if (!transferEmail.trim()) return;
    setTicketActionMsg(null);
    try {
      await apiClient.transferAdminCustomerTicket(ticketId, transferEmail.trim(), transferReason);
      setTicketActionMsg(`Ticket transferred to ${transferEmail}.`);
      setTransferTicketId(null);
      setTransferEmail('');
      if (selectedCustomer) {
        openCustomerProfile(selectedCustomer);
      }
      setTimeout(() => setTicketActionMsg(null), 3000);
    } catch (err: any) {
      setTicketActionMsg(err?.message || 'Failed to transfer ticket.');
    }
  };

  const fmt = (minor: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);

  return (
    <AdminLayout
      title="Customer Directory & 360° Profile"
      subtitle="Universal user lookup, order history, VIP spenders & ticket support tooling"
    >
      <div className="space-y-6">

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {ticketActionMsg && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid var(--green)', color: 'var(--green)', fontSize: '13px' }}>
            {ticketActionMsg}
          </div>
        )}

        {/* ── Filter / Search Bar ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
            <input
              type="text"
              placeholder="Search by customer name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-xs text-white placeholder-[var(--text-3)] focus:border-[var(--pink)] focus:outline-none"
            />
          </div>

          {/* Tier Pills */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--surface-2)', padding: '4px', borderRadius: '10px' }}>
            {(['all', 'vip', 'regular', 'suspended'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: tierFilter === t ? 'var(--pink)' : 'transparent',
                  color: tierFilter === t ? '#fff' : 'var(--text-3)',
                  textTransform: 'capitalize',
                }}
              >
                {t === 'all' ? 'All Customers' : t === 'vip' ? 'VIP Spenders' : t === 'regular' ? 'Regular Buyers' : 'Suspended'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Customers Directory Table ───────────────────────────────────────── */}
        <div className="surface-card">
          <div className="surface-card-body p-0">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    {['CUSTOMER', 'TIER & STATUS', 'CONTACT', 'ORDERS / TICKETS', 'LIFETIME SPEND', 'REGISTERED', 'ACTIONS'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 16px',
                          textAlign: h.includes('SPEND') || h.includes('ORDERS') ? 'right' : 'left',
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
                        Loading customer directory...
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                        No customers match the current filter query.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c, i) => (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <p style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '13px' }}>{c.name}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>{c.email || 'No email'}</p>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                background: c.tier === 'VIP Spender' ? 'rgba(255, 31, 109, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                color: c.tier === 'VIP Spender' ? 'var(--pink)' : 'var(--blue)',
                              }}
                            >
                              {c.tier}
                            </span>
                            {c.status === 'suspended' && (
                              <span style={{ padding: '3px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, background: 'rgba(239, 68, 68, 0.2)', color: 'var(--red)' }}>
                                SUSPENDED
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px', color: 'var(--text-2)', fontFamily: 'monospace' }}>
                          {c.phone || '—'}
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <p style={{ fontWeight: 700, color: 'var(--text-1)' }}>{c.totalOrdersCount} orders</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>{c.totalTicketsBought} tickets</p>
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--green)', fontSize: '13px' }}>
                          {fmt(c.lifetimeValueMinor)}
                        </td>

                        <td style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: '11px' }}>
                          {c.registeredAt}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <button
                            type="button"
                            onClick={() => openCustomerProfile(c)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '7px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: 'var(--pink-dim)',
                              border: '1px solid rgba(255,31,109,0.3)',
                              color: 'var(--pink)',
                              cursor: 'pointer',
                            }}
                          >
                            360° Profile
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

      {/* ── Customer 360° Profile Modal ────────────────────────────────────────── */}
      {selectedCustomer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--surface-1)', borderRadius: '16px', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-1)' }}>{selectedCustomer.name} (360° Customer Profile)</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>Customer ID: {selectedCustomer.id}</p>
              </div>
              <button type="button" onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {actionSuccessMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--green)', fontSize: '12px' }}>
                  {actionSuccessMsg}
                </div>
              )}

              {/* Metrics Header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: '10px' }}>
                  <p style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Lifetime Value</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--green)', marginTop: '4px' }}>{fmt(selectedCustomer.lifetimeValueMinor)}</p>
                </div>
                <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: '10px' }}>
                  <p style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Total Tickets</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--pink)', marginTop: '4px' }}>{selectedCustomer.totalTicketsBought}</p>
                </div>
                <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: '10px' }}>
                  <p style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Customer Tier</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginTop: '6px' }}>{selectedCustomer.tier}</p>
                </div>
              </div>

              {/* Event Attendance History & Ticket Actions */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '12px' }}>Event Attendance & Ticket Re-issuance</h4>
                {(!selectedCustomer.pastEventsAttended || selectedCustomer.pastEventsAttended.length === 0) ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>No tickets or event history recorded for this customer.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedCustomer.pastEventsAttended.map((t) => (
                      <div key={t.ticketId || t.orderId} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '13px' }}>{t.eventName}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>{t.tierName} • {t.venueName} • {t.eventDate}</p>
                          <p style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600, marginTop: '2px' }}>Paid: {fmt(t.amountPaidMinor)} (Order: {t.orderId})</p>
                        </div>
                        {t.ticketId && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setReissuingTicketId(t.ticketId!)}
                              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'var(--pink-dim)', border: '1px solid rgba(255,31,109,0.3)', color: 'var(--pink)', cursor: 'pointer' }}
                            >
                              Reissue QR
                            </button>
                            <button
                              type="button"
                              onClick={() => { setTransferTicketId(t.ticketId!); setTransferEmail(''); }}
                              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}
                            >
                              Transfer
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin Internal Notes */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>Internal Administrator Notes</h4>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Record customer preferences, support flags, or special VIP notes..."
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--pink)', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Reissue Ticket Modal ──────────────────────────────────────────────── */}
      {reissuingTicketId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--surface-1)', borderRadius: '14px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '12px' }}>Reissue Ticket Cryptographic Pass</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '14px' }}>
              This will regenerate an offline NIST P-256 ECDSA signed QR token with ticket ID <span style={{ color: 'var(--pink)', fontFamily: 'monospace' }}>{reissuingTicketId}</span>.
            </p>
            <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Reissuance Reason *</label>
            <input
              value={reissueReason}
              onChange={(e) => setReissueReason(e.target.value)}
              style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setReissuingTicketId(null)} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={() => handleReissueTicket(reissuingTicketId)} style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--pink)', color: '#fff', border: 'none', cursor: 'pointer' }}>Reissue Pass</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer Ticket Modal ─────────────────────────────────────────────── */}
      {transferTicketId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--surface-1)', borderRadius: '14px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '12px' }}>Transfer Ticket to Another Customer</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '14px' }}>
              Enter the recipient customer&apos;s registered email address.
            </p>
            <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Target Customer Email *</label>
            <input
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
              placeholder="e.g. friend@example.com"
              type="email"
              style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
            />
            <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Transfer Reason</label>
            <input
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setTransferTicketId(null)} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={() => handleTransferTicket(transferTicketId)} disabled={!transferEmail.trim()} style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: transferEmail.trim() ? 'var(--pink)' : 'var(--surface-3)', color: '#fff', border: 'none', cursor: transferEmail.trim() ? 'pointer' : 'not-allowed' }}>Transfer Ticket</button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
