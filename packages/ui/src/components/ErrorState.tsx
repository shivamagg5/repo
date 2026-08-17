'use client';

import React from 'react';
import { Button } from './Button.js';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: string;
  onRetry?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this data. Please try again.',
  error,
  onRetry,
  action,
  className,
}) => {
  return (
    <div
      className={className}
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--color-bg-surface, #111625)',
        borderRadius: 'var(--radius-xl, 24px)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.5))',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          margin: '0 auto 16px auto',
          color: 'var(--color-danger, #EF4444)',
        }}
      >
        ⚠️
      </div>

      <h3
        style={{
          margin: '0 0 8px 0',
          fontSize: 'var(--text-h3, 18px)',
          fontWeight: '700',
          fontFamily: 'var(--font-display, Outfit, sans-serif)',
          color: '#FFFFFF',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: '0 0 20px 0',
          fontSize: 'var(--text-body-small, 14px)',
          color: 'var(--color-text-secondary, #94A3B8)',
          lineHeight: '1.5',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        }}
      >
        {error || message}
      </p>

      {action ? (
        action
      ) : onRetry ? (
        <Button variant="secondary" size="md" onClick={onRetry}>
          Try Again
        </Button>
      ) : null}
    </div>
  );
};
