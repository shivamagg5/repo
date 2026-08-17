'use client';

import React, { useEffect } from 'react';
import { Card } from './Card.js';
import { IconButton } from './IconButton.js';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = '540px',
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal, 500)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          animation: 'fadeIn 150ms ease-out',
        }}
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth,
          zIndex: 1,
          animation: 'scaleIn 150ms ease-out',
        }}
      >
        <Card variant="elevated" padding="lg" className={className}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              {title && (
                <h3 id="modal-title" style={{ margin: 0, fontSize: 'var(--text-h3, 18px)', fontWeight: '700', fontFamily: 'var(--font-display, Outfit, sans-serif)', color: '#FFFFFF' }}>
                  {title}
                </h3>
              )}
              {description && (
                <p id="modal-description" style={{ margin: '4px 0 0 0', fontSize: 'var(--text-caption, 12px)', color: 'var(--color-text-secondary, #94A3B8)' }}>
                  {description}
                </p>
              )}
            </div>

            <IconButton
              variant="ghost"
              size="sm"
              label="Close modal"
              icon={<span>✕</span>}
              onClick={onClose}
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: footer ? '20px' : 0 }}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {footer}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
