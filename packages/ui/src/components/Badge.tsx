import React from 'react';

export type BadgeVariant = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string; dot: string }> = {
  brand: {
    bg: 'var(--color-brand-subtle, rgba(124, 58, 237, 0.15))',
    color: '#C4B5FD',
    border: 'rgba(124, 58, 237, 0.3)',
    dot: '#7C3AED',
  },
  accent: {
    bg: 'var(--color-accent-pink-subtle, rgba(236, 72, 153, 0.15))',
    color: '#F472B6',
    border: 'rgba(236, 72, 153, 0.3)',
    dot: '#EC4899',
  },
  success: {
    bg: 'var(--color-success-subtle, rgba(16, 185, 129, 0.12))',
    color: '#34D399',
    border: 'rgba(16, 185, 129, 0.3)',
    dot: '#10B981',
  },
  warning: {
    bg: 'var(--color-warning-subtle, rgba(245, 158, 11, 0.12))',
    color: '#FBBF24',
    border: 'rgba(245, 158, 11, 0.3)',
    dot: '#F59E0B',
  },
  danger: {
    bg: 'var(--color-danger-subtle, rgba(239, 68, 68, 0.12))',
    color: '#F87171',
    border: 'rgba(239, 68, 68, 0.3)',
    dot: '#EF4444',
  },
  info: {
    bg: 'var(--color-info-subtle, rgba(59, 130, 246, 0.12))',
    color: '#60A5FA',
    border: 'rgba(59, 130, 246, 0.3)',
    dot: '#3B82F6',
  },
  neutral: {
    bg: 'var(--color-bg-surface-elevated, #182035)',
    color: 'var(--color-text-secondary, #94A3B8)',
    border: 'var(--color-border, rgba(255, 255, 255, 0.08))',
    dot: '#94A3B8',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulse = false,
  children,
  className,
  style,
}) => {
  const current = variantStyles[variant];

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        borderRadius: 'var(--radius-pill, 9999px)',
        fontSize: size === 'sm' ? 'var(--text-micro, 10px)' : 'var(--text-caption, 12px)',
        fontWeight: '600',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: size === 'sm' ? '5px' : '6px',
            height: size === 'sm' ? '5px' : '6px',
            borderRadius: '50%',
            backgroundColor: current.dot,
            animation: pulse ? 'pulse 2s infinite' : undefined,
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
