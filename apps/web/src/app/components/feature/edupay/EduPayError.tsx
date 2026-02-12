/**
 * Filename: apps/web/src/app/components/feature/edupay/EduPayError.tsx
 * Purpose: Error state component for EduPay pages (Wallet, Cashback, Savings)
 * Created: 2026-02-12
 * Pattern: Gold Standard Hub Architecture (matches BookingsError)
 */

import React from 'react';
import styles from './EduPayError.module.css';

interface EduPayErrorProps {
  error: Error | null;
  onRetry: () => void;
  title?: string;
  backUrl?: string;
  backLabel?: string;
}

export default function EduPayError({
  error,
  onRetry,
  title = 'Failed to Load EduPay Data',
  backUrl = '/edupay',
  backLabel = 'Back to EduPay',
}: EduPayErrorProps) {
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
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h3 className={styles.title}>{title}</h3>

        <p className={styles.message}>
          {error?.message || 'An unexpected error occurred while loading your EduPay data. Please try again.'}
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
            onClick={() => window.location.href = backUrl}
            className={styles.backButton}
          >
            {backLabel}
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <details className={styles.details}>
            <summary className={styles.detailsSummary}>Error Details (Development Only)</summary>
            <pre className={styles.errorStack}>{error?.stack || error?.message}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
