import React from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, icon }) => (
  <div
    role="status"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-16)',
      textAlign: 'center',
      gap: 'var(--space-4)',
    }}
  >
    {icon && (
      <div style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
        {icon}
      </div>
    )}
    <h3 style={{ fontSize: 'var(--text-h3)', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0 }}>
      {title}
    </h3>
    {description && (
      <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', margin: 0, maxWidth: '400px' }}>
        {description}
      </p>
    )}
    {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
  </div>
);

export interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  action,
}) => (
  <EmptyState title={title} description={description} action={action} />
);
