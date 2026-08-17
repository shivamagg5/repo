import React from 'react';
import { Card } from './Card.js';

export interface StatCardProps {
  label: string;
  value: string | number;
  delta?: {
    value: string;
    isPositive?: boolean;
    period?: string;
  };
  icon?: React.ReactNode;
  caption?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  icon,
  caption,
  className,
  style,
}) => {
  return (
    <Card variant="default" padding="md" className={className} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span
          style={{
            fontSize: 'var(--text-body-small, 14px)',
            fontWeight: '500',
            color: 'var(--color-text-secondary, #94A3B8)',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
          }}
        >
          {label}
        </span>
        {icon && (
          <div
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-md, 12px)',
              backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
              color: 'var(--color-brand, #7C3AED)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: delta || caption ? '6px' : '0' }}>
        <span
          style={{
            fontSize: 'var(--text-h2, 32px)',
            fontWeight: '700',
            fontFamily: 'var(--font-display, Outfit, sans-serif)',
            color: 'var(--color-text-primary, #F8FAFC)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {value}
        </span>

        {delta && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: 'var(--text-caption, 12px)',
              fontWeight: '600',
              padding: '2px 6px',
              borderRadius: 'var(--radius-pill, 9999px)',
              backgroundColor: delta.isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: delta.isPositive ? '#34D399' : '#F87171',
            }}
          >
            {delta.isPositive ? '↑' : '↓'} {delta.value}
          </span>
        )}
      </div>

      {(caption || delta?.period) && (
        <p
          style={{
            fontSize: 'var(--text-caption, 12px)',
            color: 'var(--color-text-muted, #64748B)',
            margin: 0,
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
          }}
        >
          {caption ?? (delta?.period ? `vs. ${delta.period}` : '')}
        </p>
      )}
    </Card>
  );
};
