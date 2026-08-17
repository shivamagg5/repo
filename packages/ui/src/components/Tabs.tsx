'use client';

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeId,
  onChange,
  variant = 'pills',
  className,
}) => {
  return (
    <div
      role="tablist"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: variant === 'pills' ? '8px' : '24px',
        borderBottom: variant === 'underline' ? '1px solid var(--color-border, rgba(255, 255, 255, 0.08))' : 'none',
        padding: variant === 'pills' ? '4px' : '0',
        backgroundColor: variant === 'pills' ? 'var(--color-bg-surface, #111625)' : 'transparent',
        borderRadius: variant === 'pills' ? 'var(--radius-md, 12px)' : '0',
        width: 'fit-content',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className="focus-ring"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: variant === 'pills' ? '8px 16px' : '12px 4px',
              border: 'none',
              borderRadius: variant === 'pills' ? 'var(--radius-sm, 8px)' : '0',
              backgroundColor: variant === 'pills' && isActive ? 'var(--color-brand, #7C3AED)' : 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--color-text-secondary, #94A3B8)',
              fontWeight: isActive ? '700' : '500',
              fontSize: 'var(--text-body-small, 14px)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all var(--transition-fast, 120ms ease-out)',
              borderBottom: variant === 'underline' && isActive ? '2px solid var(--color-brand, #7C3AED)' : 'none',
              marginBottom: variant === 'underline' ? '-1px' : '0',
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-pill, 9999px)',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'var(--color-bg-surface-elevated, #182035)',
                  color: isActive ? '#FFFFFF' : 'var(--color-text-muted, #64748B)',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
