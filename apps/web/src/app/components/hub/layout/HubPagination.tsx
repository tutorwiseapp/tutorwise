/**
 * Filename: apps/web/src/app/components/hub/layout/cards/HubPagination.tsx
 * Purpose: Pagination component for Hub Pages
 * Created: 2025-11-28
 * Updated: 2025-11-29 - Page numbers with arrows, ellipsis, and teal highlighting (no summary text)
 * Pattern: Page numbers (1, 2, ..., 12) + Previous/Next arrows (◁ ▷)
 *
 * Usage:
 * <HubPagination
 *   currentPage={1}
 *   totalItems={50}
 *   itemsPerPage={5}
 *   onPageChange={(page) => setCurrentPage(page)}
 * />
 *
 * Note:
 * - Current page highlighted in teal
 * - Shows ellipsis (...) when many pages
 * - Always visible (even with 1 page), hidden only when 0 items
 * - Auto-adjusts to content (no fixed position)
 */

'use client';

import React from 'react';
import styles from './HubPagination.module.css';

interface HubPaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function HubPagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}: HubPaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near start: 1 2 3 4 ... last
        pages.push(2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near end: 1 ... last-3 last-2 last-1 last
        pages.push('...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Middle: 1 ... current-1 current current+1 ... last
        pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  // Don't render anything if no items
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={styles.paginationContainer}>
      <div className={styles.pageNumbers}>
        {/* Previous Arrow */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={styles.arrowButton}
          aria-label="Previous page"
        >
          ◁
        </button>

        {/* Page Number Buttons */}
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`${styles.pageButton} ${
                currentPage === page ? styles.pageButtonActive : ''
              }`}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}

        {/* Next Arrow */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={styles.arrowButton}
          aria-label="Next page"
        >
          ▷
        </button>
      </div>
    </div>
  );
}
