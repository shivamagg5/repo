import React from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
  style,
}) => {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination Navigation"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '16px 0',
        ...style,
      }}
    >
      {/* Previous Button */}
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous Page"
        className="focus-ring"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '36px',
          height: '36px',
          padding: '0 10px',
          borderRadius: 'var(--radius-sm, 8px)',
          border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
          backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
          color: currentPage <= 1 ? 'var(--color-text-muted, #64748B)' : 'var(--color-text-primary, #F8FAFC)',
          fontSize: 'var(--text-body-small, 14px)',
          fontWeight: '600',
          cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          opacity: currentPage <= 1 ? 0.4 : 1,
        }}
      >
        ← Prev
      </button>

      {/* Page Numbers */}
      {[...Array(totalPages)].map((_, idx) => {
        const pageNumber = idx + 1;
        const isActive = pageNumber === currentPage;

        return (
          <button
            key={pageNumber}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onPageChange(pageNumber)}
            className="focus-ring"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm, 8px)',
              border: '1px solid',
              borderColor: isActive ? 'var(--color-brand, #7C3AED)' : 'var(--color-border, rgba(255, 255, 255, 0.08))',
              backgroundColor: isActive ? 'var(--color-brand, #7C3AED)' : 'var(--color-bg-surface, #111625)',
              color: isActive ? '#FFFFFF' : 'var(--color-text-secondary, #94A3B8)',
              fontSize: 'var(--text-body-small, 14px)',
              fontWeight: isActive ? '700' : '500',
              cursor: 'pointer',
              transition: 'all var(--transition-fast, 120ms ease-out)',
            }}
          >
            {pageNumber}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next Page"
        className="focus-ring"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '36px',
          height: '36px',
          padding: '0 10px',
          borderRadius: 'var(--radius-sm, 8px)',
          border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
          backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
          color: currentPage >= totalPages ? 'var(--color-text-muted, #64748B)' : 'var(--color-text-primary, #F8FAFC)',
          fontSize: 'var(--text-body-small, 14px)',
          fontWeight: '600',
          cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          opacity: currentPage >= totalPages ? 0.4 : 1,
        }}
      >
        Next →
      </button>
    </nav>
  );
};
