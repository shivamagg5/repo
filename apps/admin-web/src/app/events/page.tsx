'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient } from '../../lib/api';
import type { AdminEventListItemDto } from '@platform/types';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEventListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'published' | 'featured' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<string | null>(null);

  // Moderation modal state
  const [selectedEvent, setSelectedEvent] = useState<AdminEventListItemDto | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'suspend'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getAdminEvents<AdminEventListItemDto[]>();
      setEvents(res.data ?? []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load platform events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter((e) => {
    if (statusFilter === 'submitted' && e.status !== 'submitted' && e.status !== 'under_review') return false;
    if (statusFilter === 'published' && e.status !== 'published' && e.status !== 'live') return false;
    if (statusFilter === 'featured' && !e.isFeaturedOnHomepage) return false;
    if (statusFilter === 'suspended' && e.status !== 'suspended' && e.status !== 'rejected') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (e.title || '').toLowerCase().includes(q) ||
        (e.organizerName || '').toLowerCase().includes(q) ||
        (e.venueName || '').toLowerCase().includes(q) ||
        (e.city || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatINR = (minor: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      minor / 100,
    );
  };

  const handleToggleFeatured = async (evt: AdminEventListItemDto) => {
    const nextState = !evt.isFeaturedOnHomepage;
    setTogglingFeaturedId(evt.id);
    try {
      await apiClient.toggleAdminEventFeatured(evt.id, nextState);
      setEvents((prev) =>
        prev.map((item) => (item.id === evt.id ? { ...item, isFeaturedOnHomepage: nextState } : item)),
      );
    } catch (err: any) {
      alert(err?.message ?? 'Failed to toggle homepage featured status');
    } finally {
      setTogglingFeaturedId(null);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedEvent) return;
    setSubmittingReview(true);
    try {
      await apiClient.reviewAdminEvent(selectedEvent.id, {
        action: reviewAction === 'approve' ? 'approve' : 'reject',
        notes: reviewNotes.trim() || undefined,
      });
      setShowReviewModal(false);
      setSelectedEvent(null);
      setReviewNotes('');
      await fetchEvents();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to execute moderation decision');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <AdminLayout
      title="Event Governance & Moderation Sentinel"
      subtitle="Ecosystem event catalog, public listing approvals, homepage carousel featuring & emergency sales controls"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastUpdated && (
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={fetchEvents}
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
            In Review Queue:{' '}
            <strong style={{ color: 'var(--pink)', marginLeft: '4px' }}>
              {events.filter((e) => e.status === 'submitted' || e.status === 'under_review').length}
            </strong>
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
              onClick={fetchEvents}
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
            {(['all', 'submitted', 'published', 'featured', 'suspended'] as const).map((tab) => (
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
                  ? 'All Events'
                  : tab === 'submitted'
                    ? 'Pending Review'
                    : tab === 'featured'
                      ? 'Featured Hero'
                      : tab}{' '}
                (
                {
                  events.filter((e) =>
                    tab === 'all'
                      ? true
                      : tab === 'submitted'
                        ? e.status === 'submitted' || e.status === 'under_review'
                        : tab === 'published'
                          ? e.status === 'published' || e.status === 'live'
                          : tab === 'featured'
                            ? e.isFeaturedOnHomepage
                            : e.status === 'suspended' || e.status === 'rejected',
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
              placeholder="Search event title, organizer, or venue..."
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

        {/* ── Events Governance Table ────────────────────────────────────────── */}
        <div className="surface-card">
          <div className="surface-card-body p-0">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    {['EVENT & DETAILS', 'ORGANIZER', 'VENUE & DATE', 'CAPACITY / TICKETS', 'GROSS REVENUE', 'FEATURED HERO', 'STATUS & CONTROLS'].map(
                      (h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: '12px 14px',
                            textAlign: i >= 3 && i <= 4 ? 'right' : 'left',
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
                        Loading real-time event catalog from API...
                      </td>
                    </tr>
                  ) : filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                        No events found matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((evt, i) => (
                      <tr
                        key={evt.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        }}
                      >
                        {/* Event Title */}
                        <td style={{ padding: '14px' }}>
                          <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: '13px' }}>
                            {evt.title}
                          </p>
                          <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                            ID: {evt.id}
                          </span>
                        </td>

                        {/* Organizer */}
                        <td style={{ padding: '14px', color: 'var(--text-2)', fontWeight: 600 }}>
                          {evt.organizerName}
                        </td>

                        {/* Venue & Date */}
                        <td style={{ padding: '14px' }}>
                          <p style={{ color: 'var(--text-1)', margin: 0 }}>{evt.venueName}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                            {evt.city ? `${evt.city} · ` : ''}
                            {evt.startsAt ? new Date(evt.startsAt).toLocaleString('en-IN') : 'Date TBA'}
                          </p>
                        </td>

                        {/* Capacity / Tickets */}
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: '13px' }}>
                            {evt.ticketsSold ?? 0} / {(evt.capacity ?? 0) > 0 ? evt.capacity : 'N/A'}
                          </p>
                          <div
                            className="w-full bg-surface-3 rounded-full h-1 mt-1.5 overflow-hidden"
                            style={{ width: '100px', marginLeft: 'auto' }}
                          >
                            <div
                              className="bg-pink h-1 rounded-full"
                              style={{
                                width: `${evt.capacity ? Math.min(100, ((evt.ticketsSold ?? 0) / evt.capacity) * 100) : 0}%`,
                              }}
                            />
                          </div>
                        </td>

                        {/* Gross Revenue */}
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <p style={{ fontWeight: 700, color: 'var(--green)', margin: 0, fontSize: '13px' }}>
                            {formatINR(evt.grossSalesMinor ?? 0)}
                          </p>
                          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                            {(evt.ticketTiers?.length ?? 0)} Tiers Configured
                          </span>
                        </td>

                        {/* Homepage Carousel Feature Toggle */}
                        <td style={{ padding: '14px' }}>
                          <button
                            type="button"
                            disabled={togglingFeaturedId === evt.id}
                            onClick={() => handleToggleFeatured(evt)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '100px',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: togglingFeaturedId === evt.id ? 'wait' : 'pointer',
                              background: evt.isFeaturedOnHomepage ? 'rgba(255,31,109,0.2)' : 'var(--surface-3)',
                              color: evt.isFeaturedOnHomepage ? 'var(--pink)' : 'var(--text-3)',
                              border: `1px solid ${evt.isFeaturedOnHomepage ? 'rgba(255,31,109,0.4)' : 'var(--border)'}`,
                            }}
                          >
                            {togglingFeaturedId === evt.id
                              ? 'Saving...'
                              : evt.isFeaturedOnHomepage
                                ? '★ Featured on Hero'
                                : '☆ Standard'}
                          </button>
                        </td>

                        {/* Status & Actions */}
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '100px',
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background:
                                  evt.status === 'published' || evt.status === 'live'
                                    ? 'rgba(16,185,129,0.15)'
                                    : evt.status === 'submitted' || evt.status === 'under_review'
                                      ? 'rgba(245,158,11,0.15)'
                                      : 'rgba(239,68,68,0.15)',
                                color:
                                  evt.status === 'published' || evt.status === 'live'
                                    ? 'var(--green)'
                                    : evt.status === 'submitted' || evt.status === 'under_review'
                                      ? 'var(--yellow)'
                                      : 'var(--orange)',
                              }}
                            >
                              ● {evt.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEvent(evt);
                                setShowReviewModal(true);
                              }}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '7px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: 'var(--surface-3)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-2)',
                                cursor: 'pointer',
                              }}
                            >
                              Inspect / Moderate
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

      {/* ── Event Inspection & Moderation Modal ───────────────────────────────── */}
      {showReviewModal && selectedEvent && (
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
              maxWidth: '560px',
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
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Event Review & Moderation Panel
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                  {selectedEvent.title} · Organized by {selectedEvent.organizerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-3)',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                fontSize: '12px',
              }}
            >
              {/* Event Metadata Breakdown */}
              <div
                style={{
                  background: 'var(--surface-2)',
                  padding: '14px',
                  borderRadius: '10px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>Venue Location</span>
                  <p style={{ color: 'var(--text-1)', fontWeight: 600, margin: '2px 0 0' }}>
                    {selectedEvent.venueName}, {selectedEvent.city}
                  </p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>Event Date & Time</span>
                  <p style={{ color: 'var(--text-1)', fontWeight: 600, margin: '2px 0 0' }}>
                    {selectedEvent.startsAt ? new Date(selectedEvent.startsAt).toLocaleString('en-IN') : 'TBA'}
                  </p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>Total Capacity</span>
                  <p style={{ color: 'var(--text-1)', fontWeight: 600, margin: '2px 0 0' }}>
                    {(selectedEvent.capacity ?? 0).toLocaleString('en-IN')} Seats / Passes
                  </p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>Current Listing Status</span>
                  <p style={{ color: 'var(--pink)', fontWeight: 700, margin: '2px 0 0', textTransform: 'uppercase' }}>
                    {selectedEvent.status}
                  </p>
                </div>
              </div>

              {/* Ticket Tiers Breakdown */}
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>Configured Ticket Tiers</p>
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                  {(selectedEvent.ticketTiers ?? []).length === 0 ? (
                    <div
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: 'var(--text-3)',
                        background: 'var(--surface-2)',
                      }}
                    >
                      No ticket tiers configured.
                    </div>
                  ) : (
                    (selectedEvent.ticketTiers ?? []).map((t, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderBottom:
                            idx < (selectedEvent.ticketTiers?.length ?? 0) - 1 ? '1px solid var(--border)' : 'none',
                          background: 'var(--surface-2)',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{t.name}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: '6px' }}>
                            ({t.capacity} cap)
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--green)' }}>{formatINR(t.priceMinor)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Moderation Decision */}
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Moderator Action Decision
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['approve', 'reject', 'suspend'] as const).map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setReviewAction(act)}
                      style={{
                        flex: 1,
                        padding: '9px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: '1px solid',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        background:
                          reviewAction === act
                            ? act === 'approve'
                              ? 'rgba(16,185,129,0.2)'
                              : act === 'reject'
                                ? 'rgba(239,68,68,0.2)'
                                : 'rgba(245,158,11,0.2)'
                            : 'var(--surface-2)',
                        borderColor:
                          reviewAction === act
                            ? act === 'approve'
                              ? 'rgba(16,185,129,0.4)'
                              : act === 'reject'
                                ? 'rgba(239,68,68,0.4)'
                                : 'rgba(245,158,11,0.4)'
                            : 'var(--border)',
                        color:
                          reviewAction === act
                            ? act === 'approve'
                              ? 'var(--green)'
                              : act === 'reject'
                                ? 'var(--orange)'
                                : 'var(--yellow)'
                            : 'var(--text-3)',
                      }}
                    >
                      {act === 'approve' ? '✓ Approve Listing' : act === 'reject' ? '✕ Reject' : '⏸ Pause Sales'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Feedback / Audit Note to Organizer
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Approved for national listing. Added to homepage carousel."
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    background: 'none',
                    border: '1px solid var(--border)',
                    color: 'var(--text-3)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={handleReviewSubmit}
                  style={{
                    padding: '8px 22px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: 'var(--pink)',
                    color: '#fff',
                    border: 'none',
                    cursor: submittingReview ? 'wait' : 'pointer',
                  }}
                >
                  {submittingReview ? 'Executing...' : 'Execute Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
