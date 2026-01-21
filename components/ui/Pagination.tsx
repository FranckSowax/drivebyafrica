'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

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
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  if (totalPages <= 1) return null;

  // Generate page numbers to display
  // Sliding window: current page stays in position, pages scroll around it
  // Desktop: 5 6 [7] 8 9 ... 4117
  // Mobile: 6 [7] 8 ... 4117
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];

    // Number of pages to show on each side of current page
    const siblingsCount = isDesktop ? 2 : 1;
    // Total visible page buttons (excluding ellipsis and last page)
    const visibleCount = siblingsCount * 2 + 1;

    if (totalPages <= visibleCount + 2) {
      // Show all pages if total is small enough
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Calculate the sliding window
      let start = currentPage - siblingsCount;
      let end = currentPage + siblingsCount;

      // Adjust if we're near the beginning
      if (start < 1) {
        start = 1;
        end = visibleCount;
      }

      // Adjust if we're near the end
      if (end > totalPages - 1) {
        end = totalPages - 1;
        start = Math.max(1, totalPages - visibleCount);
      }

      // Add visible pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis and last page if not already included
      if (end < totalPages - 1) {
        pages.push('ellipsis');
      }
      if (end < totalPages) {
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
