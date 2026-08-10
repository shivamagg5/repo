import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    border: 'none',
  },
  secondary: {
    backgroundColor: 'var(--color-surface-elevated)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--color-text-primary)',
    border: 'none',
  },
  danger: {
    backgroundColor: 'var(--color-danger)',
    color: '#fff',
    border: 'none',
  },
  outline: {
    backgroundColor: 'transparent',
    color: 'var(--color-brand)',
    border: '1px solid var(--color-brand)',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { fontSize: 'var(--text-body-small)', padding: '6px 12px', borderRadius: 'var(--radius-sm)' },
  md: { fontSize: 'var(--text-body)', padding: '10px 20px', borderRadius: 'var(--radius-md)' },
  lg: { fontSize: 'var(--text-body-large)', padding: '14px 28px', borderRadius: 'var(--radius-lg)' },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      children,
      disabled,
      style,
      ...props
    },
    ref,
  ) => {
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontFamily: 'var(--font-sans)',
      fontWeight: '600',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.6 : 1,
      transition: 'var(--transition-fast)',
      width: fullWidth ? '100%' : undefined,
      userSelect: 'none',
      whiteSpace: 'nowrap',
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...style,
    };

    return (
      <button ref={ref} disabled={disabled || loading} style={baseStyles} {...props}>
        {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

// Inline spinner for button loading state
function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      style={{ animation: 'spin 0.75s linear infinite' }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
