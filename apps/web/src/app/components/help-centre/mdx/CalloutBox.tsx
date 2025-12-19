/**
 * Filename: apps/web/src/app/components/help-centre/mdx/CalloutBox.tsx
 * Purpose: Callout box component for highlighting important information
 * Created: 2025-01-19
 */

'use client';

import { ReactNode } from 'react';
import styles from './CalloutBox.module.css';

interface CalloutBoxProps {
  type?: 'info' | 'warning' | 'success' | 'error' | 'tip' | 'help';
  title?: string;
  children: ReactNode;
}

const defaultTitles = {
  info: 'Note',
  warning: 'Important',
  success: 'Success',
  error: 'Error',
  tip: 'Tip',
  help: 'Need Help?',
};

export default function CalloutBox({ type = 'info', title, children }: CalloutBoxProps) {
  const displayTitle = title || defaultTitles[type] || defaultTitles.info;

  return (
    <div className={`${styles.callout} ${styles[type]}`}>
      {displayTitle && (
        <div className={styles.header}>
          <span className={styles.title}>{displayTitle}</span>
        </div>
      )}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
