/**
 * Filename: DeveloperVideoWidget.tsx
 * Purpose: Developer Hub Video Widget - Quick start guide
 * Created: 2025-12-17
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './DeveloperVideoWidget.module.css';

export default function DeveloperVideoWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Quick Start Guide</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Watch our tutorial to get started with the Platform API in minutes.
        </p>
        <a href="/developer/docs#getting-started" target="_blank" rel="noopener noreferrer" className={styles.link}>
          Watch Tutorial →
        </a>
      </div>
    </HubComplexCard>
  );
}
