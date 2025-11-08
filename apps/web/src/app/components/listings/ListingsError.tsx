/**
 * Filename: apps/web/src/app/components/listings/ListingsError.tsx
 * Purpose: Error fallback component for listings page
 * Created: 2025-11-08
 */

import React from 'react';
import styles from './ListingsError.module.css';

interface ListingsErrorProps {
  error?: Error;
  onRetry: () => void;
}

export default function ListingsError({ error, onRetry }: ListingsErrorProps) {
  return (
    <div className={styles.container}>
      <div className={styles.errorCard}>
        <div className={styles.iconContainer}>
          <svg
            className={styles.icon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h3 className={styles.title}>Failed to Load Listings</h3>

        <p className={styles.message}>
          {error?.message || 'An unexpected error occurred while loading your listings.'}
        </p>

        <div className={styles.actions}>
          <button onClick={onRetry} className={styles.retryButton}>
            <svg
              className={styles.buttonIcon}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </button>

          <button
            onClick={() => window.location.href = '/dashboard'}
            className={styles.backButton}
          >
            Back to Dashboard
          </button>
        </div>

        <details className={styles.details}>
          <summary className={styles.detailsSummary}>Technical Details</summary>
          <pre className={styles.errorStack}>
            {error?.stack || 'No error stack available'}
          </pre>
        </details>
      </div>
    </div>
  );
}
