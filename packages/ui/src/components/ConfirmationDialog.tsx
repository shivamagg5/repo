'use client';

import React, { useState } from 'react';
import { Modal } from './Modal.js';
import { Button } from './Button.js';
import { Input } from './Input.js';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  confirmKeyword?: string;
  loading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'danger',
  confirmKeyword,
  loading = false,
}) => {
  const [keywordInput, setKeywordInput] = useState('');

  const isKeywordValid = confirmKeyword ? keywordInput.trim() === confirmKeyword : true;

  const handleConfirm = () => {
    if (!isKeywordValid) return;
    onConfirm();
  };

  const handleClose = () => {
    setKeywordInput('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
          <Button variant="secondary" size="md" onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="md"
            onClick={handleConfirm}
            disabled={!isKeywordValid || loading}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {confirmKeyword && (
        <div style={{ marginTop: '16px' }}>
          <p style={{ fontSize: 'var(--text-body-small, 14px)', color: 'var(--color-text-secondary, #94A3B8)', marginBottom: '8px' }}>
            Please type <strong style={{ color: '#FFFFFF' }}>{confirmKeyword}</strong> to confirm:
          </p>
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder={confirmKeyword}
            fullWidth
            autoFocus
          />
        </div>
      )}
    </Modal>
  );
};
