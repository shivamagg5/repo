import React from 'react';
import { EmptyState } from './EmptyState.js';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no entries to display at this time.',
  onRowClick,
  className,
  style,
}: DataTableProps<T>) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        overflowX: 'auto',
        backgroundColor: 'var(--color-bg-surface, #111625)',
        border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
        borderRadius: 'var(--radius-lg, 16px)',
        ...style,
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: 'var(--text-body-small, 14px)',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--color-border-strong, rgba(255, 255, 255, 0.16))',
              backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
            }}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '12px 16px',
                  fontWeight: '600',
                  color: 'var(--color-text-secondary, #94A3B8)',
                  textTransform: 'uppercase',
                  fontSize: 'var(--text-micro, 10px)',
                  letterSpacing: '0.05em',
                  width: col.width,
                  textAlign: col.align ?? 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            [...Array(4)].map((_, rIdx) => (
              <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))' }}>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '14px 16px' }}>
                    <div
                      style={{
                        height: '14px',
                        width: '70%',
                        borderRadius: '4px',
                        backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '32px 16px', textAlign: 'center' }}>
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                style={{
                  borderBottom: rowIdx === data.length - 1 ? 'none' : '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color var(--transition-fast, 120ms ease-out)',
                  color: 'var(--color-text-primary, #F8FAFC)',
                }}
                onMouseEnter={(e) => {
                  if (onRowClick) e.currentTarget.style.backgroundColor = 'var(--color-bg-surface-hover, #222C46)';
                }}
                onMouseLeave={(e) => {
                  if (onRowClick) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '14px 16px',
                      verticalAlign: 'middle',
                      textAlign: col.align ?? 'left',
                      whiteSpace: col.width ? 'normal' : 'nowrap',
                    }}
                  >
                    {col.render
                      ? col.render(item, rowIdx)
                      : (item as Record<string, unknown>)[col.key] !== undefined
                      ? String((item as Record<string, unknown>)[col.key])
                      : '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
