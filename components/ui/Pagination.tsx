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
  // Desktop: show more pages (1 2 3 4 5 ... last)
  // Mobile: show fewer pages (1 ... current ... last)
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];

    // Desktop shows more pages, mobile shows fewer
    const siblingsCount = isDesktop ? 2 : 1;
    const showEllipsisThreshold = isDesktop ? 9 : 7;

    if (totalPages <= showEllipsisThreshold) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first pages on desktop (1, 2, 3, 4, 5)
      const firstPagesCount = isDesktop ? 5 : 1;

      if (currentPage <= firstPagesCount + siblingsCount) {
        // Near the start: show first pages + ellipsis + last
        const endOfFirstSection = isDesktop ? Math.max(5, currentPage + siblingsCount) : currentPage + siblingsCount;
        for (let i = 1; i <= Math.min(endOfFirstSection, totalPages - 1); i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - firstPagesCount - siblingsCount) {
        // Near the end: show first + ellipsis + last pages
        pages.push(1);
        pages.push('ellipsis');
        const startOfLastSection = isDesktop
          ? Math.min(totalPages - 4, currentPage - siblingsCount)
          : currentPage - siblingsCount;
        for (let i = Math.max(2, startOfLastSection); i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Middle: show first + ellipsis + current area + ellipsis + last
        pages.push(1);
        if (isDesktop) pages.push(2);
        pages.push('ellipsis');

        for (let i = currentPage - siblingsCount; i <= currentPage + siblingsCount; i++) {
          if (i > (isDesktop ? 2 : 1) && i < totalPages) {
            pages.push(i);
          }
        }

        pages.push('ellipsis');
        if (isDesktop) pages.push(totalPages - 1);
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
