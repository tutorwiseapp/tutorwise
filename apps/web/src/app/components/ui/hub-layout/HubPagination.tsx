/**
 * Filename: apps/web/src/app/components/ui/hub-layout/HubPagination.tsx
 * Purpose: Pagination component for Hub Pages
 * Created: 2025-11-28
 * Pattern: Shows "X-Y of Z results" + Previous/Next buttons
 *
 * Usage:
 * <HubPagination
 *   currentPage={1}
 *   totalItems={50}
 *   itemsPerPage={5}
 *   onPageChange={(page) => setCurrentPage(page)}
 * />
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
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) {
    return null; // Don't render pagination if there's only one page
  }

  return (
    <div className={styles.paginationContainer}>
      <p className={styles.summary}>
        Showing <span className={styles.bold}>{startItem}</span>-
        <span className={styles.bold}>{endItem}</span> of{' '}
        <span className={styles.bold}>{totalItems}</span> results
      </p>
      <div className={styles.buttons}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={styles.button}
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={styles.button}
        >
          Next
        </button>
      </div>
    </div>
  );
}
