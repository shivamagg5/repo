import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--color-surface-elevated)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
  },
  success: {
    backgroundColor: 'var(--color-success-subtle)',
    color: 'var(--color-success)',
    border: '1px solid var(--color-success)',
  },
  warning: {
    backgroundColor: 'var(--color-warning-subtle)',
    color: 'var(--color-warning)',
    border: '1px solid var(--color-warning)',
  },
  danger: {
    backgroundColor: 'var(--color-danger-subtle)',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger)',
  },
  info: {
    backgroundColor: 'var(--color-info-subtle)',
    color: 'var(--color-info)',
    border: '1px solid var(--color-info)',
  },
  brand: {
    backgroundColor: 'var(--color-brand-subtle)',
    color: 'var(--color-brand)',
    border: '1px solid var(--color-brand)',
  },
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, style }) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 'var(--text-caption)',
        fontWeight: '600',
        fontFamily: 'var(--font-sans)',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
};
