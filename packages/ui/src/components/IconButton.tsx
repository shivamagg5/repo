import React from 'react';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  label: string; // Accessible label for screen readers
  icon: React.ReactNode;
  loading?: boolean;
}

const variantStyles: Record<IconButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-brand, #7C3AED)',
    color: '#FFFFFF',
    border: '1px solid transparent',
  },
  secondary: {
    backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
    color: 'var(--color-text-primary, #F8FAFC)',
    border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary, #94A3B8)',
    border: '1px solid transparent',
  },
  danger: {
    backgroundColor: 'var(--color-danger, #EF4444)',
    color: '#FFFFFF',
    border: '1px solid transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    color: 'var(--color-brand, #7C3AED)',
    border: '1px solid var(--color-brand, #7C3AED)',
  },
};

const sizeStyles: Record<IconButtonSize, React.CSSProperties> = {
  sm: { width: '32px', height: '32px', borderRadius: 'var(--radius-sm, 8px)' },
  md: { width: '44px', height: '44px', borderRadius: 'var(--radius-md, 12px)' }, // 44px WCAG touch target
  lg: { width: '52px', height: '52px', borderRadius: 'var(--radius-lg, 16px)' },
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      label,
      icon,
      loading = false,
      disabled,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        disabled={disabled || loading}
        className={`focus-ring ${className ?? ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : loading ? 0.75 : 1,
          transition: 'var(--transition-fast, 120ms ease-out)',
          flexShrink: 0,
          userSelect: 'none',
          ...variantStyles[variant],
          ...sizeStyles[size],
          ...style,
        }}
        {...props}
      >
        {loading ? (
          <span
            style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.75s linear infinite',
            }}
            aria-hidden="true"
          />
        ) : (
          icon
        )}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
