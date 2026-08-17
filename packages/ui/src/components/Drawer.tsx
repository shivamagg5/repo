'use client';

import React, { useEffect } from 'react';
import { IconButton } from './IconButton.js';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right' | 'bottom';
  width?: string;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'left',
  width = '300px',
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isBottom = position === 'bottom';
  const isRight = position === 'right';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-drawer, 400)',
        display: 'flex',
        justifyContent: isRight ? 'flex-end' : isBottom ? 'flex-end' : 'flex-start',
        alignItems: isBottom ? 'flex-end' : 'stretch',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'fadeIn 150ms ease-out',
        }}
      />

      {/* Drawer Body */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Drawer'}
        className={className}
        style={{
          position: 'relative',
          width: isBottom ? '100%' : width,
          maxHeight: isBottom ? '80vh' : '100vh',
          height: isBottom ? 'auto' : '100vh',
          backgroundColor: 'var(--color-bg-surface, #111625)',
          borderRight: position === 'left' ? '1px solid var(--color-border, rgba(255, 255, 255, 0.08))' : 'none',
          borderLeft: position === 'right' ? '1px solid var(--color-border, rgba(255, 255, 255, 0.08))' : 'none',
          borderTop: isBottom ? '1px solid var(--color-border, rgba(255, 255, 255, 0.08))' : 'none',
          borderTopLeftRadius: isBottom ? 'var(--radius-lg, 16px)' : 0,
          borderTopRightRadius: isBottom ? 'var(--radius-lg, 16px)' : 0,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg, 0 12px 36px rgba(0, 0, 0, 0.65))',
          zIndex: 1,
          animation: isBottom ? 'slideUp 200ms ease-out' : 'slideIn 200ms ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {title ? (
            <h3 style={{ margin: 0, fontSize: 'var(--text-h3, 18px)', fontWeight: '700', fontFamily: 'var(--font-display, Outfit, sans-serif)', color: '#FFFFFF' }}>
              {title}
            </h3>
          ) : <div />}
          <IconButton
            variant="ghost"
            size="sm"
            label="Close drawer"
            icon={<span>✕</span>}
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
