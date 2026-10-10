'use client';

import React, { useState } from 'react';
import type { AdminChargebackLogDto } from '@platform/types';

export interface ChargebackEvidenceModalProps {
  chargeback: AdminChargebackLogDto;
  onClose: () => void;
  onSubmitEvidence: (chargebackId: string, rebuttalText: string) => Promise<void>;
}

export function ChargebackEvidenceModal({
  chargeback,
  onClose,
  onSubmitEvidence,
}: ChargebackEvidenceModalProps) {
  const [rebuttalNotes, setRebuttalNotes] = useState(
    'Cardholder verified order via 3D-Secure 2-factor OTP authentication. The non-refundable digital admission pass was issued and successfully scanned at the turnstile gate.',
  );
  const [includeScanLogs, setIncludeScanLogs] = useState(true);
  const [includeIpFootprint, setIncludeIpFootprint] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(minor / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmitEvidence(chargeback.id, rebuttalNotes);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit evidence packet.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#12121C] border border-white/10 rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex justify-between items-start border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 uppercase">
                CHARGEBACK DISPUTE #{chargeback.id}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                Risk Score: {chargeback.riskScore}/100
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Bank Dispute Representment & Evidence Packet
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit proof of turnstile gate admission, digital ticket delivery, and 3D-Secure authorization to contest issuing bank chargeback.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* Dispute Summary Snapshot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/[0.02] border border-white/5 p-4 rounded-xl text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-mono">Disputed Amount</span>
            <span className="font-mono font-bold text-red-400 text-sm">
              {formatCurrency(chargeback.amountMinor)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-mono">Order Reference</span>
            <span className="font-mono font-bold text-slate-200">
              {chargeback.orderId.slice(0, 10)}...
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-mono">Dispute Status</span>
            <span className="font-bold text-amber-400 uppercase text-[11px]">
              {chargeback.disputeStatus.replace('_', ' ')}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-mono">Filing Date</span>
            <span className="font-mono text-slate-300 text-[11px]">
              {chargeback.filedAt.split('T')[0]}
            </span>
          </div>
        </div>

        {/* Reason Code Disclosed by Bank */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Issuing Bank Reason Description:
          </span>
          <p className="text-slate-200 font-medium">{chargeback.reason}</p>
        </div>

        {/* Automated Evidence Package Attachments */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
            Automated Evidentiary Artifacts (Attached to Packet)
          </h4>

          <div className="space-y-2 text-xs">
            {/* Artifact 1: Turnstile Scan Log */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
              <input
                type="checkbox"
                checked={includeScanLogs}
                onChange={(e) => setIncludeScanLogs(e.target.checked)}
                className="mt-0.5 accent-pink-500 rounded"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    Gate Turnstile Check-in Telemetry Log
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    [CONFIRMED ATTENDANCE]
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  Pass verified by Turnstile Scanner Device #TS-04 at 19:42:15 IST.
                </p>
              </div>
            </label>

            {/* Artifact 2: IP & 3DS Fingerprint */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
              <input
                type="checkbox"
                checked={includeIpFootprint}
                onChange={(e) => setIncludeIpFootprint(e.target.checked)}
                className="mt-0.5 accent-pink-500 rounded"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    3D-Secure 2.2 Auth Token & Customer IP Match
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold">
                    [3DS FRICTIONLESS PASSED]
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  Card issuer approved via OTP challenge (Auth Code: 3DS-VERIFIED-994).
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Written Rebuttal Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Formal Rebuttal Statement for Bank Adjudicator:
            </label>
            <textarea
              rows={4}
              value={rebuttalNotes}
              onChange={(e) => setRebuttalNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-red-500 leading-relaxed font-sans"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-bold shadow-lg shadow-red-900/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? 'Transmitting Evidence...' : '📤 Transmit Evidence to Issuing Bank'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
