import React from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  variant?: 'text' | 'rect' | 'circle';
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius,
  variant = 'text',
  className,
  style,
}) => {
  const getRadius = () => {
    if (borderRadius) return borderRadius;
    if (variant === 'circle') return '50%';
    if (variant === 'text') return 'var(--radius-xs, 4px)';
    return 'var(--radius-md, 12px)';
  };

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        width,
        height: variant === 'circle' ? width : height,
        borderRadius: getRadius(),
        background: 'linear-gradient(90deg, var(--color-bg-surface, #111625) 25%, var(--color-bg-surface-elevated, #182035) 50%, var(--color-bg-surface, #111625) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.6s infinite ease-in-out',
        ...style,
      }}
    />
  );
};
