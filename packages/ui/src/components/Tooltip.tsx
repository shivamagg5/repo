'use client';

import React, { useState } from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className,
}) => {
  const [visible, setVisible] = useState(false);

  const getPositionStyles = (): React.CSSProperties => {
    switch (position) {
      case 'top':
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-6px)' };
      case 'bottom':
        return { top: '100%', left: '50%', transform: 'translateX(-50%) translateY(6px)' };
      case 'left':
        return { right: '100%', top: '50%', transform: 'translateY(-50%) translateX(-6px)' };
      case 'right':
        return { left: '100%', top: '50%', transform: 'translateY(-50%) translateX(6px)' };
    }
  };

  return (
    <div
      className={className}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 'var(--z-tooltip, 600)',
            padding: '4px 8px',
            backgroundColor: '#000000',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: '600',
            borderRadius: 'var(--radius-xs, 4px)',
            whiteSpace: 'nowrap',
            border: '1px solid var(--color-border-strong, rgba(255, 255, 255, 0.16))',
            boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.5))',
            pointerEvents: 'none',
            ...getPositionStyles(),
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};
