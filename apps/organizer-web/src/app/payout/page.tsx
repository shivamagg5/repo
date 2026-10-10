'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { apiClient, ApiError } from '../../lib/api';
import type { PaymentProfileDto } from '@platform/types';

interface EventPayout {
  id: string;
  dateTime: string;
  eventName: string;
  amountMinor: number;
  payoutProfile: string;
  status: 'paid' | 'pending' | 'processing' | 'on_hold';
}

const STATES = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'West Bengal', 'Telangana', 'Goa'];

const statusColors: Record<string, string> = {
  paid:       'var(--green)',
  pending:    'var(--yellow)',
  processing: 'var(--cyan)',
  on_hold:    'var(--orange)',
};

export default function PayoutPage() {
  const [profiles, setProfiles] = useState<PaymentProfileDto[]>([]);
  const [payouts, setPayouts] = useState<EventPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddProfile, setShowAddProfile] = useState(false);
  const [showGSTUndertaking, setShowGSTUndertaking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    accountName: '', nickname: '', businessAddress: '',
    city: '', pincode: '', country: 'India', state: '',
    bankAccountNumber: '', ifsc: '', pan: '',
    gstRegistered: '' as 'yes' | 'no' | '',
    gstin: '',
  });

  const setField = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profRes, payRes] = await Promise.allSettled([
        apiClient.getOrganizerPaymentProfiles<PaymentProfileDto[]>(),
        apiClient.getOrganizerEventPayouts<EventPayout[]>(),
      ]);

      if (profRes.status === 'fulfilled' && profRes.value.data) {
        setProfiles(profRes.value.data);
      }
      if (payRes.status === 'fulfilled' && payRes.value.data) {
        setPayouts(payRes.value.data);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load payout details.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = () => {
    if (!form.accountName || !form.bankAccountNumber || !form.pan || !form.ifsc || !form.gstRegistered) {
      setFormMessage('Please fill all mandatory fields (Account Name, Bank Account Number, IFSC, PAN, and GST status).');
      return;
    }
    if (form.gstRegistered === 'no') {
      setShowGSTUndertaking(true);
      return;
    }
    commitProfile();
  };

  const commitProfile = async () => {
    setSubmitting(true);
    setFormMessage(null);
    try {
      await apiClient.createOrganizerPaymentProfile({
        accountName: form.accountName.trim(),
        nickname: form.nickname.trim() || undefined,
        businessAddress: form.businessAddress.trim() || undefined,
        city: form.city.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        country: form.country || 'India',
        state: form.state || undefined,
        accountNumber: form.bankAccountNumber.trim(),
        ifsc: form.ifsc.trim().toUpperCase(),
        pan: form.pan.trim().toUpperCase(),
        gstRegistered: form.gstRegistered === 'yes',
        gstin: form.gstin.trim() || undefined,
      });

      setShowAddProfile(false);
      setShowGSTUndertaking(false);
      setForm({ accountName: '', nickname: '', businessAddress: '', city: '', pincode: '', country: 'India', state: '', bankAccountNumber: '', ifsc: '', pan: '', gstRegistered: '', gstin: '' });
      await fetchData();
    } catch (err: any) {
      setFormMessage(err?.message || 'Failed to save payment profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (minor: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);

  return (
    <DashboardLayout title="Payout" subtitle="Manage bank accounts, receive verified event payouts">
      <div className="space-y-6">

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* ── Payment Profiles ──────────────────────────────────────────────── */}
        <div className="surface-card">
          <div className="surface-card-header">
            <div>
              <h3 className="surface-card-title" style={{ fontSize: '18px' }}>Payment Profiles</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Add account profiles with bank information to receive automated event settlements.</p>
            </div>
            <button type="button" onClick={() => { setShowAddProfile(true); setFormMessage(null); }}
              style={{ padding: '9px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, border: '1px solid var(--pink)', background: 'var(--pink-dim)', color: 'var(--pink)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--pink)', e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--pink-dim)', e.currentTarget.style.color = 'var(--pink)')}>
              + Add Profile
            </button>
          </div>
          <div className="surface-card-body">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['ACCOUNT NAME', 'NICKNAME', 'ACCOUNT NUMBER', 'IFSC CODE', 'PAN CARD', 'GST REGISTERED'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>Loading verified payment profiles...</td></tr>
                  ) : profiles.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)', fontSize: '13px' }}>
                        No payment profiles yet. Click "+ Add Profile" to add your bank details.
                      </td>
                    </tr>
                  ) : (
                    profiles.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '12px 14px', color: 'var(--text-1)', fontWeight: 600 }}>{p.accountName}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-2)' }}>{p.nickname || '—'}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-2)', fontFamily: 'monospace' }}>{p.maskedAccountNumber}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-2)', fontFamily: 'monospace' }}>{p.ifsc}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-2)', fontFamily: 'monospace' }}>{p.panCard}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', background: p.gstRegistered ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)', color: p.gstRegistered ? 'var(--green)' : 'var(--yellow)', fontSize: '11px', fontWeight: 600 }}>
                            {p.gstRegistered ? `Yes (${p.gstin || 'Active'})` : 'Exempt / Undertaking'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Events Payout Breakdown ───────────────────────────────────────── */}
        <div className="surface-card">
          <div className="surface-card-header">
            <div>
              <h3 className="surface-card-title" style={{ fontSize: '18px' }}>Event Settlement Statements</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Double-entry ledger verified settlement statements for all event ticket revenue.</p>
            </div>
          </div>
          <div className="surface-card-body">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['DATE & TIME', 'EVENT NAME', 'NET SETTLEMENT', 'PAYOUT PROFILE', 'STATUS'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === 'NET SETTLEMENT' ? 'right' : 'left', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>Loading settlements...</td></tr>
                  ) : payouts.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>No event settlements processed yet.</td></tr>
                  ) : (
                    payouts.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '12px 14px', color: 'var(--text-3)', fontFamily: 'monospace', fontSize: '11px' }}>{p.dateTime}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-1)', fontWeight: 600 }}>{p.eventName}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--green)', fontWeight: 700 }}>{fmt(p.amountMinor)}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-2)' }}>{p.payoutProfile}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: `${statusColors[p.status] || 'var(--cyan)'}22`, color: statusColors[p.status] || 'var(--cyan)', border: `1px solid ${statusColors[p.status] || 'var(--cyan)'}44` }}>
                            {p.status}
                          </span>
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

      {/* ── Add Payment Profile Modal ──────────────────────────────────────────── */}
      {showAddProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--surface-1)', borderRadius: '16px', width: '100%', maxWidth: '580px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ position: 'sticky', top: 0, background: 'var(--surface-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)', zIndex: 1 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>Add Payment Profile</h3>
              <button type="button" onClick={() => setShowAddProfile(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '24px', border: '1px solid var(--pink)', margin: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formMessage && (
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--red)', fontSize: '12px' }}>
                  {formMessage}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--pink)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Company/Firm/Individual Name *</label>
                  <input value={form.accountName} onChange={e => setField('accountName', e.target.value)} placeholder="Legal Name"
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--pink)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Profile Nickname</label>
                  <input value={form.nickname} onChange={e => setField('nickname', e.target.value)} placeholder="e.g. Main HDFC Current"
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--pink)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Business Address</label>
                <textarea value={form.businessAddress} onChange={e => setField('businessAddress', e.target.value)} rows={2} placeholder="Street / Premises address"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--pink)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>City</label>
                  <input value={form.city} onChange={e => setField('city', e.target.value)}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--pink)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Pincode</label>
                  <input value={form.pincode} onChange={e => setField('pincode', e.target.value)}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--pink)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Country</label>
                  <select value={form.country} onChange={e => setField('country', e.target.value)}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}>
                    <option>India</option><option>USA</option><option>UK</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--pink)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>State</label>
                  <select value={form.state} onChange={e => setField('state', e.target.value)}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: form.state ? 'var(--text-1)' : 'var(--text-3)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="">Select State</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Bank details */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--pink)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Bank Account Number *</label>
                  <input value={form.bankAccountNumber} onChange={e => setField('bankAccountNumber', e.target.value)} type="password" autoComplete="off" placeholder="Bank Account Number"
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--pink)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Bank IFSC Code *</label>
                  <input value={form.ifsc} onChange={e => setField('ifsc', e.target.value)} placeholder="e.g. HDFC0000123"
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: '11px', color: 'var(--pink)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>PAN Number *</label>
                  <input value={form.pan} onChange={e => setField('pan', e.target.value)} placeholder="e.g. ABCDE1234F"
                    style={{ width: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }} />
                </div>
              </div>

              {/* GST */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--pink)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Are you GST registered? *</label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {(['yes', 'no'] as const).map(v => (
                      <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-2)', cursor: 'pointer', textTransform: 'capitalize' }}>
                        <input type="radio" name="gstReg" checked={form.gstRegistered === v} onChange={() => setField('gstRegistered', v)} style={{ accentColor: 'var(--pink)' }} />
                        {v === 'yes' ? 'Yes' : 'No (Turnover < ₹20L)'}
                      </label>
                    ))}
                  </div>
                </div>
                {form.gstRegistered === 'yes' && (
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--pink)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>GSTIN *</label>
                    <input value={form.gstin} onChange={e => setField('gstin', e.target.value)} placeholder="e.g. 27AAAAA0000A1Z5"
                      style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }} />
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '0 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowAddProfile(false)}
                style={{ padding: '10px 22px', borderRadius: '9px', fontSize: '13px', fontWeight: 600, background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={submitting}
                style={{ padding: '10px 28px', borderRadius: '9px', fontSize: '13px', fontWeight: 700, background: 'var(--pink)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {submitting ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GST Undertaking Modal ──────────────────────────────────────────────── */}
      {showGSTUndertaking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--surface-1)', borderRadius: '16px', width: '100%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-1)' }}>GST Undertaking & Declaration</h3>
            </div>
            <div style={{ padding: '24px 28px', border: '1px solid var(--pink)', margin: '20px', borderRadius: '12px', fontSize: '12px', color: 'var(--pink)', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '14px' }}>I/We, Organizer, do confirm and acknowledge that I am/We are a supplier providing services through an e-commerce platform as per Section 24(IX) of the Central Goods and Services Tax, 2017, under the prevalent GST regime (&quot;GST Laws&quot;) and confirm that I/We are not registered under the GST Act, since our annual turnover is below the threshold limit of Rs. 20 Lakhs (supplier supply only services).</p>
              <p style={{ marginBottom: '14px' }}>I/We confirm that any applicable taxes collected on the Tickets booked through this platform is our liability and the same shall be duly discharged by us.</p>
              <p style={{ marginBottom: '14px' }}>I/We acknowledge that information furnished above are true to the best of my/our knowledge and that we shall be bound by the acts of duly constituted attorney.</p>
              <ul style={{ paddingLeft: '20px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Breach, violation or non-compliance of any of the provisions contained in this declaration.</li>
                <li>Any act of omission or commission pursuant to which the representations given become untrue.</li>
                <li>Violation of any applicable law including GST laws.</li>
                <li>Non-compliance with GST laws.</li>
                <li>Any investigations, inquiries, summons or inspections conducted by any authority.</li>
              </ul>
            </div>
            <div style={{ padding: '0 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowGSTUndertaking(false)}
                style={{ padding: '10px 22px', borderRadius: '9px', fontSize: '13px', fontWeight: 600, background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={commitProfile} disabled={submitting}
                style={{ padding: '10px 28px', borderRadius: '9px', fontSize: '13px', fontWeight: 700, background: 'var(--pink)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {submitting ? 'Saving Profile...' : 'I Agree & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
