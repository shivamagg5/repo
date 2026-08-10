import React from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius = 'var(--radius-sm)',
  style,
}) => (
  <div
    aria-hidden="true"
    style={{
      width,
      height,
      borderRadius,
      background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-elevated) 50%, var(--color-surface) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.5s infinite',
      ...style,
    }}
  />
);
