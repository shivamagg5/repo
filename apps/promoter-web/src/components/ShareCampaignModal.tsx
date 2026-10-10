'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export interface ShareCampaignModalProps {
  campaign: {
    id: string;
    code: string;
    eventTitle?: string;
    eventSlug?: string;
    eventId?: string;
    event?: { title?: string; slug?: string };
    commissionType?: string;
    commissionValue?: number;
  };
  onClose: () => void;
}

export function ShareCampaignModal({ campaign, onClose }: ShareCampaignModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'general' | 'instagram' | 'whatsapp' | 'campus'>('general');

  const consumerOrigin = process.env.NEXT_PUBLIC_CONSUMER_URL ?? 'http://localhost:3000';
  const eventSlug = campaign.event?.slug ?? campaign.eventSlug ?? campaign.eventId ?? '';
  const eventTitle = campaign.event?.title ?? campaign.eventTitle ?? 'Exclusive Event';

  // Build full tracking link with channel UTM
  const utmSuffix = selectedChannel === 'general'
    ? ''
    : `&utm_source=${selectedChannel}&utm_medium=promoter_referral`;
  const shareUrl = `${consumerOrigin}/events/${eventSlug}?ref=${encodeURIComponent(campaign.code)}${utmSuffix}`;

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate referral QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [shareUrl]);

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `eventhub-qr-${campaign.code}.png`;
    a.click();
  };

  const shareText = `🔥 Hey! Get your passes for ${eventTitle} using my referral code *${campaign.code}*! Book here: ${shareUrl}`;

  const handleCopyCaption = async () => {
    const storyCaption = `🎟️ ${eventTitle.toUpperCase()}\nUse my promo code 👉 "${campaign.code}" for VIP booking & fast-track entry!\n🔗 Link: ${shareUrl}`;
    await navigator.clipboard.writeText(storyCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      `Book your passes for ${eventTitle}! Use promo code ${campaign.code} on @EventHub:`,
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleTelegramShare = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
      `Tickets for ${eventTitle} (Code: ${campaign.code})`,
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#12121C] border border-white/10 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                REF CODE: {campaign.code}
              </span>
              <span className="text-xs text-slate-400 font-medium">Marketing Kit</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">{eventTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Channel Segment Picker (UTM Builder) */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Target Channel / Source Tracking (UTM):
          </label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { id: 'general', label: 'General / Direct' },
              { id: 'instagram', label: 'Instagram / Bio' },
              { id: 'whatsapp', label: 'WhatsApp Groups' },
              { id: 'campus', label: 'Campus / Posters' },
            ].map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSelectedChannel(ch.id as any)}
                className={`p-2 rounded-xl text-center font-medium border transition-all ${
                  selectedChannel === ch.id
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Copy Referral Link Box */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Shareable Tracking URL</label>
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-2.5">
            <span className="text-xs font-mono text-cyan-300 truncate flex-1 px-1">
              {shareUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all shadow"
            >
              {copiedUrl ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* QR Code and Social Sharing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          {/* QR Code Card */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="p-3 bg-white rounded-xl shadow-lg border border-white/20">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${campaign.code}`}
                  className="w-36 h-36 object-contain"
                />
              ) : (
                <div className="w-36 h-36 bg-slate-200 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-500">
                  Generating QR...
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleDownloadQr}
              className="text-xs text-slate-300 hover:text-white font-medium flex items-center gap-1.5 pt-1"
            >
              <span>💾 Download Flyer QR (PNG)</span>
            </button>
          </div>

          {/* Social Share Buttons */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-slate-300">1-Click Instant Share</p>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>💬</span> Share on WhatsApp
            </button>

            <button
              type="button"
              onClick={handleTwitterShare}
              className="w-full py-2 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>𝕏</span> Share on X (Twitter)
            </button>

            <button
              type="button"
              onClick={handleTelegramShare}
              className="w-full py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>✈️</span> Share on Telegram
            </button>

            <button
              type="button"
              onClick={handleCopyCaption}
              className="w-full py-2 px-3 rounded-xl bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/40 text-fuchsia-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>📸</span> {copiedCaption ? '✓ Caption Copied!' : 'Copy Instagram Story Caption'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
