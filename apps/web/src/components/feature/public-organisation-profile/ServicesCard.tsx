/**
 * Filename: ServicesCard.tsx
 * Purpose: Display organisation services (placeholder for future development)
 * Created: 2026-01-04
 */

'use client';

import styles from './ServicesCard.module.css';

interface ServicesCardProps {
  organisation: any;
}

export function ServicesCard({ organisation }: ServicesCardProps) {
  // Placeholder - will be developed in future
  return (
    <div className={styles.card}>
      {/* Header with light teal background */}
      <div className={styles.header}>
        <h2 className={styles.title}>Services</h2>
      </div>

      {/* Content wrapper for padding */}
      <div className={styles.content}>
        <p className={styles.placeholderText}>
          Services information will be displayed here.
        </p>
      </div>
    </div>
  );
}
