import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  elevated?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

const paddingMap = {
  none: '0',
  sm: 'var(--space-4)',
  md: 'var(--space-6)',
  lg: 'var(--space-8)',
};

export const Card: React.FC<CardProps> = ({
  children,
  elevated = false,
  padding = 'md',
  style,
  className,
  onClick,
}) => {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        backgroundColor: elevated ? 'var(--color-surface-elevated)' : 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: paddingMap[padding],
        boxShadow: elevated ? 'var(--shadow-md)' : 'none',
        cursor: onClick ? 'pointer' : undefined,
        transition: onClick ? 'var(--transition-fast)' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
