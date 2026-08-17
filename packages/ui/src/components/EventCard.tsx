import React from 'react';
import { Card } from './Card.js';
import { Badge } from './Badge.js';

export interface EventCardProps {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  coverImage?: string | null;
  venueName?: string | null;
  city?: string | null;
  categoryName?: string | null;
  minPriceMinor?: number | null;
  currency?: string;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const EventCard: React.FC<EventCardProps> = ({
  title,
  startsAt,
  coverImage,
  venueName,
  city,
  categoryName,
  minPriceMinor,
  currency = 'INR',
  onClick,
  className,
  style,
}) => {
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatPrice = (amountMinor: number) => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${(amountMinor / 100).toLocaleString()}`;
  };

  return (
    <Card
      variant="default"
      padding="none"
      interactive
      onClick={onClick}
      className={`overflow-hidden flex flex-col h-full group ${className ?? ''}`}
      style={style}
    >
      {/* 16:9 Image Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
          overflow: 'hidden',
        }}
      >
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 300ms ease-out',
            }}
            className="group-hover:scale-105"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.4) 0%, rgba(236, 72, 153, 0.3) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display, Outfit, sans-serif)',
                fontWeight: '700',
                color: '#C4B5FD',
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {categoryName ?? 'Live Experience'}
            </span>
          </div>
        )}

        {/* Category Badge */}
        {categoryName && (
          <span style={{ position: 'absolute', top: '10px', left: '10px' }}>
            <Badge variant="brand" size="sm">
              {categoryName}
            </Badge>
          </span>
        )}

        {/* City Pill */}
        {city && (
          <span
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              backgroundColor: 'rgba(9, 12, 21, 0.75)',
              backdropFilter: 'blur(8px)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm, 8px)',
              fontSize: '11px',
              fontWeight: '600',
              color: '#F8FAFC',
            }}
          >
            📍 {city}
          </span>
        )}
      </div>

      {/* Content Container */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div>
          <p
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--color-brand, #7C3AED)',
              marginBottom: '6px',
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
            }}
          >
            📅 {formatDate(startsAt)}
          </p>

          <h3
            style={{
              fontSize: 'var(--text-h4, 18px)',
              fontWeight: '700',
              fontFamily: 'var(--font-display, Outfit, sans-serif)',
              color: 'var(--color-text-primary, #F8FAFC)',
              lineHeight: '1.3',
              margin: '0 0 8px 0',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </h3>
        </div>

        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <span style={{ color: 'var(--color-text-muted, #64748B)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
            {venueName ? `🏟️ ${venueName}` : 'Online / TBA'}
          </span>

          <span style={{ fontWeight: '700', color: '#F8FAFC' }}>
            {minPriceMinor !== null && minPriceMinor !== undefined ? `From ${formatPrice(minPriceMinor)}` : 'Tickets Live'}
          </span>
        </div>
      </div>
    </Card>
  );
};
