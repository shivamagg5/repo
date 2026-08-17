import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, fullWidth = true, leftIcon, rightElement, style, className, id, disabled, ...props }, ref) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div style={{ width: fullWidth ? '100%' : undefined, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: 'var(--text-body-small, 14px)',
              fontWeight: '500',
              color: error ? 'var(--color-danger, #EF4444)' : 'var(--color-text-secondary, #94A3B8)',
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{label}</span>
            {props.required && <span style={{ color: 'var(--color-brand, #7C3AED)', fontSize: '12px' }}>*</span>}
          </label>
        )}

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
          {leftIcon && (
            <span
              style={{
                position: 'absolute',
                left: '14px',
                color: error ? 'var(--color-danger, #EF4444)' : 'var(--color-text-muted, #64748B)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={`focus-ring ${className ?? ''}`}
            style={{
              width: '100%',
              paddingTop: '10px',
              paddingBottom: '10px',
              paddingLeft: leftIcon ? '42px' : '14px',
              paddingRight: rightElement ? '42px' : '14px',
              minHeight: '44px', // WCAG 2.2 touch target
              backgroundColor: 'var(--color-bg-surface, #111625)',
              border: `1px solid ${error ? 'var(--color-danger, #EF4444)' : 'var(--color-border-strong, rgba(255, 255, 255, 0.16))'}`,
              borderRadius: 'var(--radius-md, 12px)',
              color: 'var(--color-text-primary, #F8FAFC)',
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
              fontSize: 'var(--text-body, 16px)',
              outline: 'none',
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'text',
              transition: 'border-color var(--transition-fast, 120ms ease-out), box-shadow var(--transition-fast, 120ms ease-out)',
              ...style,
            }}
            {...props}
          />

          {rightElement && (
            <span
              style={{
                position: 'absolute',
                right: '12px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {rightElement}
            </span>
          )}
        </div>

        {error && (
          <span
            id={`${inputId}-error`}
            role="alert"
            style={{ fontSize: 'var(--text-caption, 12px)', color: 'var(--color-danger, #EF4444)', fontWeight: '500' }}
          >
            {error}
          </span>
        )}

        {hint && !error && (
          <span
            id={`${inputId}-hint`}
            style={{ fontSize: 'var(--text-caption, 12px)', color: 'var(--color-text-muted, #64748B)' }}
          >
            {hint}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
