'use client';

import React from 'react';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  onClear?: () => void;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  shortcut?: string;
  fullWidth?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  loading = false,
  size = 'md',
  shortcut,
  fullWidth = true,
  placeholder = 'Search...',
  className,
  ...rest
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { height: '36px', fontSize: 'var(--text-caption, 12px)', padding: '0 32px 0 32px' };
      case 'lg':
        return { height: '52px', fontSize: 'var(--text-body-large, 16px)', padding: '0 44px 0 44px' };
      case 'md':
      default:
        return { height: '44px', fontSize: 'var(--text-body-small, 14px)', padding: '0 36px 0 38px' };
    }
  };

  const hasValue = Boolean(value && String(value).length > 0);

  return (
    <div style={{ position: 'relative', width: fullWidth ? '100%' : 'auto', display: 'flex', alignItems: 'center' }}>
      {/* Search Icon */}
      <div
        style={{
          position: 'absolute',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          color: 'var(--color-text-muted, #64748B)',
          fontSize: '14px',
        }}
      >
        🔍
      </div>

      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`focus-ring ${className ?? ''}`}
        style={{
          ...getSizeStyles(),
          width: '100%',
          backgroundColor: 'var(--color-bg-surface, #111625)',
          border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
          borderRadius: 'var(--radius-md, 12px)',
          color: 'var(--color-text-primary, #F8FAFC)',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
          outline: 'none',
        }}
        {...rest}
      />

      {/* Right Controls: Clear Button or Loading Spinner or Shortcut Badge */}
      <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {loading ? (
          <div
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid var(--color-brand, #7C3AED)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        ) : hasValue && onClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted, #64748B)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              fontSize: '12px',
            }}
          >
            ✕
          </button>
        ) : shortcut ? (
          <kbd
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono, monospace)',
              backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
              border: '1px solid var(--color-border-strong, rgba(255, 255, 255, 0.16))',
              borderRadius: 'var(--radius-xs, 4px)',
              padding: '2px 6px',
              color: 'var(--color-text-muted, #64748B)',
            }}
          >
            {shortcut}
          </kbd>
        ) : null}
      </div>
    </div>
  );
};
