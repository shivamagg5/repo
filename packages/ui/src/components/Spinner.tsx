import React from 'react';

export interface SpinnerProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 24,
  color = 'var(--color-brand, #7C3AED)',
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.5}
    strokeLinecap="round"
    aria-label="Loading"
    role="status"
    className={className}
    style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0, ...style }}
  >
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);
