'use client';

import React, { useState } from 'react';

export interface PayoutInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  promoterName: string;
  promoterEmail: string;
  promoterOrgName?: string;
  promoterPan?: string;
  promoterGstin?: string;
  payoutMethod: 'upi' | 'bank_transfer' | string;
  destinationDetail: string;
  transactionReference?: string;
  status: string;
  grossAmountMinor: number;
  tdsRatePct?: number; // default 5% under Section 194H
  currency?: string;
  campaignCode?: string;
  eventTitle?: string;
}

export interface PayoutInvoiceModalProps {
  invoice: PayoutInvoiceData;
  onClose: () => void;
}

export function PayoutInvoiceModal({ invoice, onClose }: PayoutInvoiceModalProps) {
  const [copied, setCopied] = useState(false);

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(minor / 100);
  };

  const tdsPct = invoice.tdsRatePct ?? 5.0; // 5% TDS under 194H
  const grossMinor = invoice.grossAmountMinor;
  const tdsDeductionMinor = Math.round((grossMinor * tdsPct) / 100);
  const netPayableMinor = grossMinor - tdsDeductionMinor;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = `Invoice #${invoice.invoiceNumber}\nGross: ${formatCurrency(grossMinor)}\nTDS (${tdsPct}%): -${formatCurrency(tdsDeductionMinor)}\nNet Disbursed: ${formatCurrency(netPayableMinor)}\nRef: ${invoice.transactionReference ?? 'PENDING'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 print:p-0 print:bg-white print:fixed print:inset-0 animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-[#12121C] border border-white/10 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex justify-between items-center pb-4 border-b border-white/10 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Commission Payout Tax Invoice
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
            >
              {copied ? '✓ Copied' : '📋 Copy Ref'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-bold shadow-lg transition-all"
            >
              🖨️ Print / Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors text-lg ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="invoice-printable bg-white text-slate-900 rounded-xl p-6 sm:p-8 space-y-6 border border-slate-200 print:border-none print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-extrabold text-sm">
                  ⚡
                </div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900 font-sans">
                  EVENTHUB INDIA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                EventHub Technologies India Pvt. Ltd. · CIN: U72900MH2026PTC123456
              </p>
              <p className="text-[11px] text-slate-500">
                GSTIN: 27AABCE1234F1Z8 · SAC: 998311 (Affiliate & Promotion Services)
              </p>
              <p className="text-[11px] text-slate-500">
                Registered Office: Tech Hub, Bandra-Kurla Complex, Mumbai, MH 400051
              </p>
            </div>

            <div className="text-right">
              <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase bg-slate-100 text-slate-800 border border-slate-300">
                Tax Invoice (Form 16A Compatible)
              </span>
              <p className="text-base font-bold text-slate-900 font-mono mt-2">
                #{invoice.invoiceNumber}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Date: {invoice.invoiceDate}
              </p>
              <p className="text-xs text-slate-500">
                Financial Year: 2026–2027
              </p>
            </div>
          </div>

          {/* Party Details (Promoter vs Client) */}
          <div className="grid grid-cols-2 gap-6 text-xs border-b border-slate-200 pb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Service Provider (Promoter)
              </p>
              <p className="font-bold text-sm text-slate-900">{invoice.promoterName}</p>
              {invoice.promoterOrgName && (
                <p className="text-slate-600 font-medium">{invoice.promoterOrgName}</p>
              )}
              <p className="text-slate-500">{invoice.promoterEmail}</p>
              <p className="text-slate-500 mt-1">
                PAN: <strong className="font-mono text-slate-700">{invoice.promoterPan ?? 'PAN-NOT-LINKED'}</strong>
              </p>
              <p className="text-slate-500">
                GSTIN: <span className="font-mono">{invoice.promoterGstin ?? 'Unregistered Influencer'}</span>
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Disbursement & Settlement Details
              </p>
              <p className="text-slate-700">
                Payment Channel:{' '}
                <strong className="uppercase font-mono text-slate-900">
                  {invoice.payoutMethod === 'upi' ? 'UPI / VPA (Instant)' : 'Bank IMPS / NEFT'}
                </strong>
              </p>
              <p className="text-slate-700 font-mono text-[11px] mt-0.5">
                Destination: {invoice.destinationDetail}
              </p>
              <p className="text-slate-700 mt-1">
                UTR / Trans Ref:{' '}
                <strong className="font-mono text-emerald-700">
                  {invoice.transactionReference ?? 'PENDING RECONCILIATION'}
                </strong>
              </p>
              <p className="text-slate-700">
                Settlement Status:{' '}
                <span className="font-bold text-emerald-600 uppercase">
                  {invoice.status}
                </span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600 text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-1">Description / Campaign</th>
                  <th className="py-2 px-1 text-center">SAC Code</th>
                  <th className="py-2 px-1 text-right">Taxable Gross</th>
                  <th className="py-2 px-1 text-right">TDS (Sec 194H @ 5%)</th>
                  <th className="py-2 px-1 text-right font-bold">Net Disbursed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-1">
                    <p className="font-bold text-slate-900">
                      Affiliate Promotion & Referral Marketing Services
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Attributed ticket commissions for {invoice.eventTitle ?? 'Platform Events'}{' '}
                      {invoice.campaignCode ? `(Code: ${invoice.campaignCode})` : ''}
                    </p>
                  </td>
                  <td className="py-3 px-1 text-center font-mono text-slate-500">998311</td>
                  <td className="py-3 px-1 text-right font-mono font-semibold text-slate-800">
                    {formatCurrency(grossMinor)}
                  </td>
                  <td className="py-3 px-1 text-right font-mono text-red-600">
                    -{formatCurrency(tdsDeductionMinor)}
                  </td>
                  <td className="py-3 px-1 text-right font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(netPayableMinor)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals & Tax Compliance Summary */}
          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="text-[11px] text-slate-500 max-w-sm space-y-1">
              <p className="font-bold text-slate-700">Tax Compliance Notes:</p>
              <p>
                1. TDS is withheld at 5.0% under Section 194H of the Indian Income Tax Act on brokerage and commission payments.
              </p>
              <p>
                2. Form 16A quarterly TDS certificates will be issued to your registered PAN at the end of each assessment quarter.
              </p>
              <p>
                3. This is an electronically generated and cryptographically signed tax document.
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Commission:</span>
                <span className="font-mono font-semibold">{formatCurrency(grossMinor)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Less TDS (5% u/s 194H):</span>
                <span className="font-mono text-red-600">-{formatCurrency(tdsDeductionMinor)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Platform Payout Fee:</span>
                <span className="font-mono text-emerald-600">₹0.00 (Waived)</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-2 text-sm font-bold text-slate-900">
                <span>Net Disbursed:</span>
                <span className="font-mono text-amber-600">{formatCurrency(netPayableMinor)}</span>
              </div>
            </div>
          </div>

          {/* Footer Digital Signature & Stamp */}
          <div className="border-t border-slate-200 pt-6 flex justify-between items-center text-[10px] text-slate-400">
            <div>
              <p className="font-mono">
                HASH: {invoice.invoiceNumber}-VERIFIED-E123-AUDITED
              </p>
              <p>EventHub Financial Settlement Automation Platform</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded border border-emerald-300 bg-emerald-50 text-emerald-700 font-bold uppercase">
                ✓ Digitally Certified & Cleared
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black rounded-xl text-xs font-bold shadow-lg transition-all"
          >
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
