import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, fullWidth, style, id, ...props }, ref) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`;

    return (
      <div style={{ width: fullWidth ? '100%' : undefined, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: 'var(--text-body-small)',
              fontWeight: '500',
              color: error ? 'var(--color-danger)' : 'var(--color-text-secondary)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          style={{
            width: '100%',
            padding: '10px 14px',
            backgroundColor: 'var(--color-surface)',
            border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-body)',
            outline: 'none',
            transition: 'var(--transition-fast)',
            ...style,
          }}
          {...props}
        />
        {error && (
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-danger)' }}>
            {error}
          </span>
        )}
        {hint && !error && (
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)' }}>
            {hint}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
