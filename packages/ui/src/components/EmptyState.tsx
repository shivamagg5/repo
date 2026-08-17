import React from 'react';
import { Button } from './Button.js';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  className,
  style,
}) => (
  <div
    role="status"
    className={className}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      maxWidth: '460px',
      margin: '0 auto',
      ...style,
    }}
  >
    {icon ? (
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-xl, 24px)',
          backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
          border: '1px solid var(--color-border-strong, rgba(255, 255, 255, 0.16))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-brand, #7C3AED)',
          marginBottom: '16px',
          fontSize: '24px',
        }}
      >
        {icon}
      </div>
    ) : (
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-xl, 24px)',
          backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
          border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted, #64748B)',
          marginBottom: '16px',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
    )}

    <h3
      style={{
        fontSize: 'var(--text-h3, 24px)',
        fontWeight: '700',
        fontFamily: 'var(--font-display, Outfit, sans-serif)',
        color: 'var(--color-text-primary, #F8FAFC)',
        margin: '0 0 8px 0',
      }}
    >
      {title}
    </h3>

    {description && (
      <p
        style={{
          fontSize: 'var(--text-body-small, 14px)',
          color: 'var(--color-text-secondary, #94A3B8)',
          lineHeight: '1.5',
          margin: '0 0 20px 0',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        }}
      >
        {description}
      </p>
    )}

    {action && <div>{action}</div>}
  </div>
);

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'An unexpected error occurred while loading this section. Please try again.',
  onRetry,
  action,
  className,
  style,
}) => (
  <div
    role="alert"
    className={className}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      maxWidth: '460px',
      margin: '0 auto',
      ...style,
    }}
  >
    <div
      style={{
        width: '56px',
        height: '56px',
        borderRadius: 'var(--radius-xl, 24px)',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F87171',
        marginBottom: '16px',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>

    <h3
      style={{
        fontSize: 'var(--text-h3, 24px)',
        fontWeight: '700',
        fontFamily: 'var(--font-display, Outfit, sans-serif)',
        color: 'var(--color-text-primary, #F8FAFC)',
        margin: '0 0 8px 0',
      }}
    >
      {title}
    </h3>

    <p
      style={{
        fontSize: 'var(--text-body-small, 14px)',
        color: 'var(--color-text-secondary, #94A3B8)',
        lineHeight: '1.5',
        margin: '0 0 20px 0',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      {description}
    </p>

    {onRetry ? (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try Again ↻
      </Button>
    ) : (
      action
    )}
  </div>
);
