/**
 * Filename: DeveloperHelpWidget.tsx
 * Purpose: Developer Hub Help Widget - API Documentation link
 * Created: 2025-12-17
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './DeveloperHelpWidget.module.css';

export default function DeveloperHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Keep your API keys secure</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          API keys provide full access to your account via the API. Treat them like passwords and never share them publicly.
        </p>
        <a href="/developer/docs" target="_blank" rel="noopener noreferrer" className={styles.link}>
          View API Documentation →
        </a>
      </div>
    </HubComplexCard>
  );
}
