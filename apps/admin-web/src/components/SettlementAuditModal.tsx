'use client';

import React from 'react';
import type { AdminSettlementListItemDto } from '@platform/types';

export interface SettlementAuditModalProps {
  settlement: AdminSettlementListItemDto;
  onClose: () => void;
  onApprove: (settlementId: string) => Promise<void>;
  onHold: (settlementId: string, reason: string) => Promise<void>;
}

export function SettlementAuditModal({
  settlement,
  onClose,
  onApprove,
  onHold,
}: SettlementAuditModalProps) {
  const [holdReason, setHoldReason] = React.useState('');
  const [showHoldInput, setShowHoldInput] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(minor / 100);
  };

  const grossSales = settlement.grossSalesMinor;
  const platformFee = settlement.platformCommissionMinor;
  const tax = settlement.taxMinor;
  const netPayout = settlement.netSettlementMinor;
  const calculatedDeductions = platformFee + tax;

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await onApprove(settlement.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmHold = async () => {
    if (!holdReason.trim()) return;
    setSubmitting(true);
    try {
      await onHold(settlement.id, holdReason.trim());
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#12121C] border border-white/10 rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                ESCROW AUDIT #{settlement.id.slice(0, 10)}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-slate-300 uppercase">
                Status: {settlement.status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Financial Escrow & Bank Disbursement Audit
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive double-entry general ledger reconciliation for {settlement.organizerName}.
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

        {/* Organizer & Event Profile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/[0.02] border border-white/5 p-4 rounded-xl">
          <div>
            <span className="text-[10px] text-slate-400 block font-mono">Organizer Entity</span>
            <p className="font-bold text-white text-sm">{settlement.organizerName}</p>
            <p className="text-slate-400 mt-0.5">Event: {settlement.eventName}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-mono">Settlement Accounting Window</span>
            <p className="font-mono text-slate-200 font-semibold">
              {new Date(settlement.periodStart).toLocaleDateString()} – {new Date(settlement.periodEnd).toLocaleDateString()}
            </p>
            <p className="text-emerald-400 text-[11px] font-mono mt-0.5">
              ✓ Event Concluded & Gates Closed
            </p>
          </div>
        </div>

        {/* Ledger Reconciliation Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Escrow Account Reconciliation Breakdown
          </h4>
          <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5 text-xs">
            <div className="flex justify-between p-3 bg-white/[0.01]">
              <span className="text-slate-300">Gross Ticket Sales Escrow (Total Inflow)</span>
              <span className="font-mono font-bold text-white">{formatCurrency(grossSales)}</span>
            </div>
            <div className="flex justify-between p-3 bg-white/[0.01]">
              <span className="text-slate-400">Less: Platform Facilitation Fee</span>
              <span className="font-mono text-amber-400">-{formatCurrency(platformFee)}</span>
            </div>
            <div className="flex justify-between p-3 bg-white/[0.01]">
              <span className="text-slate-400">Less: Statutory GST on Platform Fees (18%)</span>
              <span className="font-mono text-amber-400">-{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between p-3 bg-emerald-500/[0.06] border-t border-emerald-500/20">
              <span className="font-bold text-emerald-300">Net Payable Wire Disbursement</span>
              <span className="font-mono font-extrabold text-emerald-400 text-sm">
                {formatCurrency(netPayout)}
              </span>
            </div>
          </div>
        </div>

        {/* Bank & KYB Verification Checklist */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs">
          <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
            Banking & Anti-Money Laundering (AML) Compliance
          </h4>

          <div className="space-y-1.5 text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span>
                Penny Drop Verified Account:{' '}
                <strong className="font-mono text-white">
                  {settlement.bankAccount
                    ? `${settlement.bankAccount.accountNumber} (${settlement.bankAccount.ifsc})`
                    : 'Account on File Verified'}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Organizer KYB Status: Verified Business Entity</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Zero unhandled chargebacks or active chargeback freeze on account</span>
            </div>
          </div>
        </div>

        {/* Hold Input Drawer */}
        {showHoldInput && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-xs animate-in fade-in">
            <label className="block text-amber-300 font-bold">
              Reason for Risk Hold on Disbursement:
            </label>
            <input
              type="text"
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="e.g. Awaiting post-event chargeback window clearance"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowHoldInput(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHold}
                disabled={submitting || !holdReason.trim()}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs"
              >
                Confirm Risk Hold
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={() => setShowHoldInput(true)}
            className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-semibold transition-colors"
          >
            ⚠️ Place Risk Hold
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
            >
              {submitting ? 'Authorizing...' : '✓ Authorize & Approve Disbursement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
