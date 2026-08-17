// =============================================================================
// admin-web — Event Review & Moderation Queue
// Authoritative event inspection, approval, rejection, and suspension.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient, ApiError } from '../../lib/api';
import { useAnalytics } from '@platform/auth';

export default function AdminEventReviewPage() {
  const { track } = useAnalytics(apiClient);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review modal state
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'suspend'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getAdminEventReviewQueue<any>();
      const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setEvents(list);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load event review queue.');
      } else {
        setError(err?.message || 'Network error occurred while fetching queue.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setProcessingAction(true);
    setActionError(null);
    try {
      await apiClient.reviewAdminEvent(selectedEvent.id, {
        action: reviewAction,
        notes: reviewNotes.trim() || undefined,
      });

      const eventMap = {
        approve: 'event_approved',
        reject: 'event_rejected',
        suspend: 'event_suspended',
      };
      track(eventMap[reviewAction], undefined, selectedEvent.id);

      setSelectedEvent(null);
      setReviewNotes('');
      await fetchQueue();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setActionError(err.message || `Failed to ${reviewAction} event.`);
      } else {
        setActionError(err?.message || 'Error occurred while submitting review decision.');
      }
    } finally {
      setProcessingAction(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'published':
      case 'live':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'submitted':
      case 'under_review':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'rejected':
      case 'suspended':
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <AdminLayout
      title="Event Moderation & Review Queue"
      subtitle="Examine submitted events, verify compliance, and issue authoritative approval or suspension decisions"
      actions={
        <button
          onClick={fetchQueue}
          title="Refresh Review Backlog"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs transition-colors"
        >
          🔄 Refresh Queue
        </button>
      }
    >
      <div className="space-y-4">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchQueue} className="font-bold underline ml-2">
              Retry
            </button>
          </div>
        )}

        {/* Event List / Backlog */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Events Requiring Governance Decision ({events.length})
            </h3>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
              Retrieving submitted event queue from database...
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Review backlog is clear. No events pending administrative approval.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Event Title</th>
                    <th className="py-2.5 px-3">Organizer</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Starts At</th>
                    <th className="py-2.5 px-3 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-200">{evt.title}</p>
                        <p className="text-[11px] text-slate-400 font-mono">/{evt.slug}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {evt.organization?.name ?? evt.organizationId?.substring(0, 8) ?? 'Organizer'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 capitalize">{evt.category ?? 'Music'}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadge(evt.status)}`}>
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {evt.startsAt ? new Date(evt.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedEvent(evt);
                            setReviewAction('approve');
                            setReviewNotes('');
                            setActionError(null);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 font-semibold text-xs transition-colors"
                        >
                          Review Event →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Review Decision Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Review Event: {selectedEvent.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {selectedEvent.id}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadge(selectedEvent.status)}`}>
                  {selectedEvent.status}
                </span>
              </div>

              {/* Event Metadata Inspection */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-1.5 text-slate-300">
                <p><strong>Description:</strong> {selectedEvent.description || 'No description provided.'}</p>
                <p><strong>Timezone:</strong> {selectedEvent.timezone || 'Asia/Kolkata'}</p>
                <p><strong>Age Restriction:</strong> {selectedEvent.ageRestriction || 'None'}</p>
              </div>

              {actionError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Decision Action *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewAction('approve')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        reviewAction === 'approve'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAction('reject')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        reviewAction === 'reject'
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      ✗ Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAction('suspend')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        reviewAction === 'suspend'
                          ? 'bg-red-600 text-white border-red-500 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      🚫 Suspend
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Review Notes / Compliance Justification</label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Enter notes for organizer or compliance audit trail..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingAction}
                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {processingAction ? 'Submitting...' : `Confirm ${reviewAction.toUpperCase()}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
