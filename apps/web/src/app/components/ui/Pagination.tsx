'use client';

import React from 'react';
import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) => {
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
};

export default Pagination;