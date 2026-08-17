import React from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger' | 'brand';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  brand: {
    bg: 'var(--color-brand-subtle, rgba(124, 58, 237, 0.15))',
    border: 'rgba(124, 58, 237, 0.3)',
    text: '#C4B5FD',
    icon: '✨',
  },
  info: {
    bg: 'var(--color-info-subtle, rgba(59, 130, 246, 0.12))',
    border: 'rgba(59, 130, 246, 0.3)',
    text: '#60A5FA',
    icon: 'ℹ️',
  },
  success: {
    bg: 'var(--color-success-subtle, rgba(16, 185, 129, 0.12))',
    border: 'rgba(16, 185, 129, 0.3)',
    text: '#34D399',
    icon: '✓',
  },
  warning: {
    bg: 'var(--color-warning-subtle, rgba(245, 158, 11, 0.12))',
    border: 'rgba(245, 158, 11, 0.3)',
    text: '#FBBF24',
    icon: '⚠️',
  },
  danger: {
    bg: 'var(--color-danger-subtle, rgba(239, 68, 68, 0.12))',
    border: 'rgba(239, 68, 68, 0.3)',
    text: '#F87171',
    icon: '⛔',
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  icon,
  onClose,
  className,
  style,
}) => {
  const current = variantStyles[variant];

  return (
    <div
      role="alert"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md, 12px)',
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        color: current.text,
        fontSize: 'var(--text-body-small, 14px)',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        lineHeight: 1.5,
        ...style,
      }}
    >
      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{icon ?? current.icon}</span>

      <div style={{ flex: 1 }}>
        {title && <h4 style={{ fontWeight: '700', margin: '0 0 2px 0', fontSize: '14px', color: '#FFFFFF' }}>{title}</h4>}
        <div>{children}</div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: 'currentColor',
            cursor: 'pointer',
            padding: '2px',
            opacity: 0.7,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};
