import React from 'react';
import { Card } from './Card.js';

export interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  sublabel?: string;
  qrSvgElement?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  label = 'Official Entry Credential',
  sublabel = 'Increase screen brightness for gate scanners',
  qrSvgElement,
  className,
  style,
}) => {
  return (
    <Card
      variant="elevated"
      padding="md"
      className={`text-center ${className ?? ''}`}
      style={{ maxWidth: '360px', margin: '0 auto', ...style }}
    >
      <p style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC', margin: '0 0 16px 0' }}>
        {label}
      </p>

      {/* High-Contrast White Background Box for Optic Camera Validation */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '20px',
          borderRadius: 'var(--radius-lg, 16px)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          marginBottom: '16px',
        }}
      >
        {qrSvgElement}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '12px',
          color: 'var(--color-text-muted, #64748B)',
        }}
      >
        <span>☀️</span>
        <span>{sublabel}</span>
      </div>
    </Card>
  );
};
