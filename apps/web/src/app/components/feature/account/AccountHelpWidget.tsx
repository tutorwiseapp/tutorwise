/**
 * Filename: AccountHelpWidget.tsx
 * Purpose: Account Hub Help Widget
 * Created: 2025-12-03
 * Updated: 2026-02-08 - Added props support for reusability
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AccountHelpWidget.module.css';

interface AccountHelpWidgetProps {
  title?: string;
  description?: string;
  tips?: string[];
}

export default function AccountHelpWidget({
  title = 'Managing Your Account',
  description,
  tips = [
    'Keep your personal information up to date for accurate billing and communication.',
    'Update your professional details to enhance your profile credibility.',
    'Configure notification preferences to stay informed about important updates.',
  ],
}: AccountHelpWidgetProps = {}) {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.content}>
        {description && <p className={styles.text}>{description}</p>}
        {tips.map((tip, index) => (
          <p key={index} className={styles.text}>
            {tip}
          </p>
        ))}
      </div>
    </HubComplexCard>
  );
}
