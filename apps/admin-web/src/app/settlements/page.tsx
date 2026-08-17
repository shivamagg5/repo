// =============================================================================
// admin-web — Settlements & Payout Governance
// Generate and review organizer settlements with dual-approval / segregation of duties.
// =============================================================================
'use client';

import React, { useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient, ApiError } from '../../lib/api';

export default function AdminSettlementsPage() {
  // Generate Settlement Form State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [orgId, setOrgId] = useState('');
  const [periodStart, setPeriodStart] = useState('2026-08-01T00:00:00Z');
  const [periodEnd, setPeriodEnd] = useState('2026-08-14T23:59:59Z');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);

  // Review Settlement Form State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [settlementId, setSettlementId] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId.trim()) return;

    setGenerating(true);
    setGenerateError(null);
    setGenerateSuccess(null);
    try {
      const res = await apiClient.generateSettlement<any>({
        organizationId: orgId.trim(),
        periodStart,
        periodEnd,
      });

      setGenerateSuccess(`Settlement generated successfully. Settlement ID: ${res.data?.id ?? 'Created'}`);
      setOrgId('');
      setTimeout(() => {
        setShowGenerateModal(false);
        setGenerateSuccess(null);
      }, 2000);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setGenerateError(err.message || 'Failed to generate settlement.');
      } else {
        setGenerateError(err?.message || 'Error occurred while generating settlement.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementId.trim()) return;

    setReviewing(true);
    setReviewError(null);
    setReviewSuccess(null);
    try {
      await apiClient.reviewSettlement(settlementId.trim(), {
        action: reviewAction,
        notes: reviewNotes.trim() || undefined,
      });

      setReviewSuccess(`Settlement ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setSettlementId('');
      setTimeout(() => {
        setShowReviewModal(false);
        setReviewSuccess(null);
      }, 2000);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setReviewError(err.message || 'Failed to review settlement (e.g. Segregation of Duties violation).');
      } else {
        setReviewError(err?.message || 'Error occurred while reviewing settlement.');
      }
    } finally {
      setReviewing(false);
    }
  };

  return (
    <AdminLayout
      title="Settlements & Payout Governance"
      subtitle="Generate organizer payout statements and execute segregation-of-duties review approvals"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowReviewModal(true);
              setReviewError(null);
              setReviewSuccess(null);
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-colors"
          >
            ⚖️ Review Settlement
          </button>
          <button
            onClick={() => {
              setShowGenerateModal(true);
              setGenerateError(null);
              setGenerateSuccess(null);
            }}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors shadow-lg shadow-red-950/40"
          >
            + Generate Settlement
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Governance Rules Banner */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            Financial Governance & Dual-Control Policies
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            • <strong>Segregation of Duties:</strong> The administrator who generates a settlement cannot approve or authorize payout for the same record.<br />
            • <strong>Authoritative Hold Reconciliation:</strong> Settlements account for active refunds, chargebacks, and reserve holds before payout calculation.
          </p>
        </div>

        {/* Generate Settlement Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-slate-100">Generate Organizer Settlement</h3>
              <p className="text-xs text-slate-400">Calculate net revenue and generate settlement statement for the accounting period.</p>

              {generateError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
                  {generateError}
                </div>
              )}
              {generateSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                  {generateSuccess}
                </div>
              )}

              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Organization ID *</label>
                  <input
                    type="text"
                    required
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    placeholder="Enter organizer organization UUID..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Period Start</label>
                  <input
                    type="text"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Period End</label>
                  <input
                    type="text"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating || !orgId.trim()}
                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {generating ? 'Generating...' : 'Generate Settlement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Review Settlement Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-slate-100">Review & Authorize Settlement</h3>
              <p className="text-xs text-slate-400">Perform dual-control compliance check to approve or reject payout statement.</p>

              {reviewError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
                  {reviewError}
                </div>
              )}
              {reviewSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                  {reviewSuccess}
                </div>
              )}

              <form onSubmit={handleReview} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Settlement ID *</label>
                  <input
                    type="text"
                    required
                    value={settlementId}
                    onChange={(e) => setSettlementId(e.target.value)}
                    placeholder="Enter settlement record UUID..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Action</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewAction('approve')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        reviewAction === 'approve'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      ✓ Approve Payout
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAction('reject')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        reviewAction === 'reject'
                          ? 'bg-red-600 text-white border-red-500 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Compliance Notes</label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Provide notes for audit trail..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewing || !settlementId.trim()}
                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {reviewing ? 'Submitting...' : 'Confirm Decision'}
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
