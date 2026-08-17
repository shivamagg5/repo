import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'brand-glow';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-brand, #7C3AED)',
    color: '#FFFFFF',
    border: '1px solid transparent',
    boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
  },
  'brand-glow': {
    backgroundColor: 'var(--color-brand, #7C3AED)',
    color: '#FFFFFF',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: 'var(--shadow-brand, 0 4px 20px rgba(124, 58, 237, 0.35))',
  },
  secondary: {
    backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
    color: 'var(--color-text-primary, #F8FAFC)',
    border: '1px solid var(--color-border-strong, rgba(255, 255, 255, 0.16))',
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
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
  },
  outline: {
    backgroundColor: 'transparent',
    color: 'var(--color-brand, #7C3AED)',
    border: '1px solid var(--color-brand, #7C3AED)',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    fontSize: 'var(--text-body-small, 14px)',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm, 8px)',
    minHeight: '32px',
  },
  md: {
    fontSize: 'var(--text-body, 16px)',
    padding: '10px 20px',
    borderRadius: 'var(--radius-md, 12px)',
    minHeight: '44px', // WCAG 2.2 touch target
  },
  lg: {
    fontSize: 'var(--text-body-large, 18px)',
    padding: '14px 28px',
    borderRadius: 'var(--radius-lg, 16px)',
    minHeight: '52px',
  },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const baseStyles: React.CSSProperties = {
      display: fullWidth ? 'flex' : 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      fontWeight: '600',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : loading ? 0.75 : 1,
      transition: 'var(--transition-fast, 120ms ease-out)',
      width: fullWidth ? '100%' : undefined,
      userSelect: 'none',
      whiteSpace: 'nowrap',
      outline: 'none',
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...style,
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={`focus-ring ${className ?? ''}`}
        style={baseStyles}
        {...props}
      >
        {loading ? (
          <span
            style={{
              display: 'inline-block',
              width: size === 'sm' ? 14 : 16,
              height: size === 'sm' ? 14 : 16,
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.75s linear infinite',
            }}
            aria-hidden="true"
          />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!loading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
