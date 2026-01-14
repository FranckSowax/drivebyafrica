'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const showEllipsisThreshold = 7;

    if (totalPages <= showEllipsisThreshold) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const baseButtonStyles = cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-mandarin focus-visible:ring-offset-2',
    'disabled:opacity-40 disabled:cursor-not-allowed'
  );

  const pageButtonStyles = cn(
    baseButtonStyles,
    'h-10 min-w-[40px] px-3 text-sm'
  );

  const navButtonStyles = cn(
    baseButtonStyles,
    'h-10 px-3 text-sm gap-1'
  );

  return (
    <nav
      className={cn('flex items-center justify-center gap-1', className)}
      aria-label="Pagination"
    >
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          navButtonStyles,
          'border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)]',
          'hover:border-mandarin hover:text-mandarin',
          'disabled:hover:border-[var(--card-border)] disabled:hover:text-[var(--text-muted)]'
        )}
        aria-label="Page précédente"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Préc.</span>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="flex items-center justify-center h-10 w-10 text-[var(--text-muted)]"
              >
                <MoreHorizontal className="w-4 h-4" />
              </span>
            );
          }

          const isActive = page === currentPage;

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={isActive}
              className={cn(
                pageButtonStyles,
                isActive
                  ? 'bg-mandarin text-white shadow-md shadow-mandarin/30'
                  : cn(
                      'border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)]',
                      'hover:border-mandarin hover:text-mandarin hover:bg-mandarin/5'
                    )
              )}
              aria-label={`Page ${page}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          navButtonStyles,
          'border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)]',
          'hover:border-mandarin hover:text-mandarin',
          'disabled:hover:border-[var(--card-border)] disabled:hover:text-[var(--text-muted)]'
        )}
        aria-label="Page suivante"
      >
        <span className="hidden sm:inline">Suiv.</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
