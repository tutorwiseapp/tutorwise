/**
 * Filename: ListingsHelpWidget.tsx
 * Purpose: Help widget for create listing sidebar
 * Created: 2026-01-19
 * Updated: 2026-01-19 - Migrated to HubComplexCard design pattern
 * Design: Uses HubComplexCard for consistent info display
 *
 * Pattern: Title + Content with links
 * - Teal header
 * - Paragraph content with teal links
 */
'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './ListingsHelpWidget.module.css';

export default function ListingsHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Need Help?</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Creating a great listing helps you attract more students and grow your business.
        </p>
        <div className={styles.links}>
          <a href="#" className={styles.link}>
            View listing guidelines
          </a>
          <a href="#" className={styles.link}>
            See example listings
          </a>
          <a href="#" className={styles.link}>
            Contact support
          </a>
        </div>
      </div>
    </HubComplexCard>
  );
}
