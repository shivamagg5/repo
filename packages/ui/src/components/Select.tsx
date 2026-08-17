'use client';

import React, { useState } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  hint,
  size = 'md',
  fullWidth = false,
  id,
  className,
  disabled,
  ...rest
}) => {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { height: '36px', fontSize: 'var(--text-caption, 12px)', padding: '0 32px 0 10px' };
      case 'lg':
        return { height: '52px', fontSize: 'var(--text-body-large, 16px)', padding: '0 40px 0 16px' };
      case 'md':
      default:
        return { height: '44px', fontSize: 'var(--text-body-small, 14px)', padding: '0 36px 0 12px' };
    }
  };

  return (
    <div style={{ width: fullWidth ? '100%' : 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: 'var(--text-caption, 12px)',
            fontWeight: '600',
            color: error ? 'var(--color-danger, #EF4444)' : 'var(--color-text-secondary, #94A3B8)',
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
        <select
          id={selectId}
          disabled={disabled}
          className={`focus-ring ${className ?? ''}`}
          style={{
            ...getSizeStyles(),
            width: '100%',
            appearance: 'none',
            WebkitAppearance: 'none',
            backgroundColor: 'var(--color-bg-surface, #111625)',
            border: error
              ? '1px solid var(--color-danger, #EF4444)'
              : '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
            borderRadius: 'var(--radius-sm, 8px)',
            color: 'var(--color-text-primary, #F8FAFC)',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            outline: 'none',
          }}
          {...rest}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              style={{ backgroundColor: 'var(--color-bg-surface-elevated, #182035)', color: '#FFFFFF' }}
            >
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom Chevron Icon */}
        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--color-text-muted, #64748B)',
            fontSize: '10px',
          }}
        >
          ▼
        </div>
      </div>

      {error ? (
        <span style={{ fontSize: '11px', color: 'var(--color-danger, #EF4444)', fontWeight: '500' }}>
          {error}
        </span>
      ) : hint ? (
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)' }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
};
