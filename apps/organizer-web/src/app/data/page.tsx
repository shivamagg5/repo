'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { apiClient, ApiError } from '../../lib/api';
import { getSupabaseClient } from '../../lib/supabase';
import type {
  OrganizerAttendeeDto,
  OrganizerScanMetricsDto,
} from '@platform/types';

type DataTab = 'customers' | 'promoters' | 'qrdata';

const GENRES = ['Music', 'Comedy', 'Tech', 'Dance', 'Art', 'Sports', 'Food & Drink'];

export default function DataPage() {
  const [activeTab, setActiveTab] = useState<DataTab>('customers');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [search, setSearch] = useState('');
  const [firstTxnDate, setFirstTxnDate] = useState('');
  const [lastTxnDate, setLastTxnDate] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState<'lastTxn' | 'totalSpend' | 'totalTxns'>('lastTxn');

  // Live Data Stores
  const [attendees, setAttendees] = useState<OrganizerAttendeeDto[]>([]);
  const [promoters, setPromoters] = useState<Array<{ id: string; name: string; ticketsSold: number; salesMinor: number }>>([]);
  const [scanMetrics, setScanMetrics] = useState<OrganizerScanMetricsDto | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { sortBy };
      if (search.trim()) params['search'] = search.trim();
      if (firstTxnDate) params['firstTxnDate'] = firstTxnDate;
      if (lastTxnDate) params['lastTxnDate'] = lastTxnDate;
      if (selectedGenre) params['genre'] = selectedGenre;

      const res = await apiClient.getOrganizerAttendees<OrganizerAttendeeDto[]>(params);
      setAttendees(res.data ?? []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch attendee audience directory.');
      }
    } finally {
      setLoading(false);
    }
  }, [search, firstTxnDate, lastTxnDate, selectedGenre, sortBy]);

  const fetchPromoters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getOrganizerPromoterPerformance<any[]>();
      setPromoters(res.data ?? []);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchScanMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getOrganizerScanMetrics<OrganizerScanMetricsDto>();
      setScanMetrics(res.data ?? null);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'customers') {
      fetchAttendees();
    } else if (activeTab === 'promoters') {
      fetchPromoters();
    } else if (activeTab === 'qrdata') {
      fetchScanMetrics();
    }
  }, [activeTab, fetchAttendees, fetchPromoters, fetchScanMetrics]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        const demoRole = localStorage.getItem('eventplatform_demo_role');
        if (demoRole) {
          token = `dev-token-${demoRole}`;
        }
      }
      if (!token) {
        try {
          const client = getSupabaseClient();
          const { data } = await client.auth.getSession();
          token = data.session?.access_token ?? null;
        } catch {
          token = null;
        }
      }

      const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/organizer/data/export`, { headers });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendees_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  };

  const tabs: Array<{ key: DataTab; label: string }> = [
    { key: 'customers', label: 'Audience Directory' },
    { key: 'promoters', label: 'Promoter Performance' },
    { key: 'qrdata',   label: 'Scan & QR Analytics' },
  ];

  const fmt = (minor: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);

  return (
    <DashboardLayout title="Data" subtitle="Audience directory, promoter sales attribution & live check-in analytics">
      <div className="space-y-6">

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* ── Top Action & Tab Row ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', padding: '4px', background: 'var(--surface-2)', borderRadius: '12px', width: 'fit-content' }}>
            {tabs.map(t => (
              <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '8px 20px', borderRadius: '9px', fontSize: '13px', fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: activeTab === t.key ? 'var(--pink)' : 'transparent',
                  color: activeTab === t.key ? '#fff' : 'var(--text-3)',
                  boxShadow: activeTab === t.key ? '0 2px 12px rgba(255,31,109,0.35)' : 'none',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '9px 18px', borderRadius: '9px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)',
              transition: 'all 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {exporting ? 'Exporting CSV...' : 'Export Audience CSV'}
          </button>
        </div>

        {/* ── Customers Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'customers' && (
          <div className="surface-card">
            <div className="surface-card-body space-y-5">
              {/* Search & Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, email, or phone..."
                    style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: '12px', width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px' }}>
                  <input type="date" value={firstTxnDate} onChange={e => setFirstTxnDate(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-2)', fontSize: '11px' }} />
                  <span style={{ color: 'var(--text-3)', fontSize: '11px' }}>→</span>
                  <input type="date" value={lastTxnDate} onChange={e => setLastTxnDate(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-2)', fontSize: '11px' }} />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={selectedGenre} onChange={e => setSelectedGenre(e.target.value)}
                    style={{ flex: 1, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px', color: 'var(--text-2)', fontSize: '12px', outline: 'none' }}>
                    <option value="">All Categories</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <button type="button" onClick={() => fetchAttendees()}
                    style={{ padding: '8px 20px', background: 'var(--pink)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                    Filter
                  </button>
                </div>
              </div>

              {/* Sort Radio */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12px', color: 'var(--text-2)' }}>
                <span style={{ fontWeight: 600 }}>Sort By</span>
                {([['lastTxn', 'Last Transaction'], ['totalSpend', 'Lifetime Spend'], ['totalTxns', 'Total Orders']] as const).map(([val, label]) => (
                  <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="radio" name="sortBy" value={val} checked={sortBy === val} onChange={() => setSortBy(val)}
                      style={{ accentColor: 'var(--pink)', width: '14px', height: '14px' }} />
                    {label}
                  </label>
                ))}
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['NAME', 'EMAIL', 'CONTACT', 'ORDERS', 'TOTAL SPEND', 'LAST ORDER', 'TICKETS BOUGHT'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: h.includes('SPEND') || h.includes('ORDERS') ? 'right' : 'left', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>Loading attendees directory...</td></tr>
                    ) : attendees.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)', fontSize: '13px' }}>No Attendees Found for the selected filters</td></tr>
                    ) : (
                      attendees.map((c, i) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td style={{ padding: '12px', color: 'var(--text-1)', fontWeight: 600 }}>{c.name}</td>
                          <td style={{ padding: '12px', color: 'var(--text-2)' }}>{c.email ?? 'N/A'}</td>
                          <td style={{ padding: '12px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{c.phone ?? 'N/A'}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: 'var(--pink)', fontWeight: 700 }}>{c.totalOrders}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: 'var(--green)', fontWeight: 700 }}>{fmt(c.totalSpendMinor)}</td>
                          <td style={{ padding: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{c.lastOrderAt ? c.lastOrderAt.split('T')[0] : 'N/A'}</td>
                          <td style={{ padding: '12px', color: 'var(--text-2)' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'var(--surface-3)', fontSize: '11px', fontWeight: 600 }}>
                              {c.tickets.length} tickets
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
        )}

        {/* ── Promoters Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'promoters' && (
          <div className="surface-card">
            <div className="surface-card-body">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['PROMOTER NAME', 'CODE', 'TICKETS ATTRIBUTED', 'TOTAL SALES ATTRIBUTED'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: h.includes('SALES') || h.includes('TICKETS') ? 'right' : 'left', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>Loading promoters...</td></tr>
                    ) : promoters.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)', fontSize: '13px' }}>No promoter performance data found yet. Create a promo code campaign to start tracking.</td></tr>
                    ) : (
                      promoters.map((p, i) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '12px 14px', color: 'var(--text-1)', fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: '12px 14px', color: 'var(--pink)', fontFamily: 'monospace', fontWeight: 700 }}>{p.id.slice(0, 8).toUpperCase()}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--pink)', fontWeight: 700 }}>{p.ticketsSold.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--green)', fontWeight: 700 }}>{fmt(p.salesMinor)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── QR Data Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'qrdata' && (
          <div className="surface-card">
            <div className="surface-card-body space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div style={{ background: 'var(--surface-3)', borderRadius: '10px', padding: '16px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Tickets Issued</p>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-1)', marginTop: '4px' }}>{scanMetrics?.totalTicketsIssued ?? 0}</p>
                </div>
                <div style={{ background: 'var(--surface-3)', borderRadius: '10px', padding: '16px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Checked In</p>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--green)', marginTop: '4px' }}>{scanMetrics?.totalCheckedIn ?? 0}</p>
                </div>
                <div style={{ background: 'var(--surface-3)', borderRadius: '10px', padding: '16px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Check-in Rate</p>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--pink)', marginTop: '4px' }}>{scanMetrics?.checkinPercentage ?? 0}%</p>
                </div>
              </div>

              {/* Gate Breakdowns */}
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '12px' }}>Gate Check-in Distribution</p>
                {(!scanMetrics?.gatesBreakdown || scanMetrics.gatesBreakdown.length === 0) ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>No gate scan breakdowns recorded yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {scanMetrics.gatesBreakdown.map((g) => (
                      <div key={g.gateId} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>{g.gateName}</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--pink)', marginTop: '4px' }}>{g.scansCount} scans</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
