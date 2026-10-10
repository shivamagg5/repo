'use client';

import React, { useState } from 'react';

interface ShareEventButtonProps {
  title: string;
  url?: string;
}

export function ShareEventButton({ title, url }: ShareEventButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Check out ${title} on PULSR!`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border)] hover:border-purple-500/50 text-xs font-semibold text-gray-200 transition-colors"
      aria-label="Share Event"
    >
      <span>{copied ? '✅' : '🔗'}</span>
      <span>{copied ? 'Link Copied!' : 'Share Event'}</span>
    </button>
  );
}
