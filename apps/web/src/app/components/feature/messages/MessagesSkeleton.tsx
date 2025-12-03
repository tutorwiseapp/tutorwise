/**
 * Filename: apps/web/src/app/components/messages/MessagesSkeleton.tsx
 * Purpose: Loading skeleton for messages page
 * Created: 2025-11-09
 */

import React from 'react';
import styles from '../network/NetworkSkeleton.module.css'; // Reuse Network skeleton styles

export default function MessagesSkeleton() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSkeleton} />
        <div className={styles.subtitleSkeleton} />
      </div>

      <div className={styles.filterSkeleton}>
        <div className={styles.filterTab} />
        <div className={styles.filterTab} />
      </div>

      <div className={styles.connectionsList}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className={styles.connectionCard}>
            <div className={styles.cardHeader}>
              <div className={styles.avatar} />
              <div className={styles.details}>
                <div className={styles.name} />
                <div className={styles.email} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
