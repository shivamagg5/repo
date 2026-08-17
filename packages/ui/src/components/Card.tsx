import React from 'react';

export type CardVariant = 'default' | 'elevated' | 'glass' | 'bordered' | 'brand-glow';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

const paddingMap: Record<CardPadding, string> = {
  none: '0',
  sm: 'var(--space-3, 12px)',
  md: 'var(--space-6, 24px)',
  lg: 'var(--space-8, 32px)',
};

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--color-bg-surface, #111625)',
    border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
    boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.5))',
  },
  elevated: {
    backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
    border: '1px solid var(--color-border-strong, rgba(255, 255, 255, 0.16))',
    boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.5))',
  },
  glass: {
    backgroundColor: 'var(--color-bg-glass, rgba(17, 22, 37, 0.75))',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
    boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.5))',
  },
  bordered: {
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border-strong, rgba(255, 255, 255, 0.16))',
    boxShadow: 'none',
  },
  'brand-glow': {
    backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
    border: '1px solid rgba(124, 58, 237, 0.35)',
    boxShadow: 'var(--shadow-brand, 0 4px 24px rgba(124, 58, 237, 0.35))',
  },
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  interactive = false,
  style,
  className,
  onClick,
}) => {
  return (
    <div
      className={`${interactive ? 'hover:scale-[1.01] hover:border-purple-500/40 cursor-pointer' : ''} ${className ?? ''}`}
      onClick={onClick}
      style={{
        borderRadius: 'var(--radius-lg, 16px)',
        padding: paddingMap[padding],
        transition: 'all var(--transition-fast, 120ms ease-out)',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </div>
  );
};
