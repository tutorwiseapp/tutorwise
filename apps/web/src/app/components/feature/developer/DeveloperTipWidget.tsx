/**
 * Filename: DeveloperTipWidget.tsx
 * Purpose: Developer Hub Tip Widget - Security best practices
 * Created: 2025-12-17
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './DeveloperTipWidget.module.css';

export default function DeveloperTipWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Security Best Practices</h3>
      <div className={styles.content}>
        <ul className={styles.tipsList}>
          <li>Never commit API keys to version control</li>
          <li>Store keys securely using environment variables</li>
          <li>Rotate keys regularly for enhanced security</li>
          <li>Use minimum required scopes for each key</li>
          <li>Monitor API usage for suspicious activity</li>
        </ul>
      </div>
    </HubComplexCard>
  );
}
