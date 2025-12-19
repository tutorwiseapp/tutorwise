/**
 * Filename: apps/web/src/app/components/help-centre/mdx/CalloutBox.tsx
 * Purpose: Callout box component for highlighting important information
 * Created: 2025-01-19
 */

'use client';

import { ReactNode } from 'react';
import styles from './CalloutBox.module.css';

interface CalloutBoxProps {
  type?: 'info' | 'warning' | 'success' | 'error' | 'tip';
  title?: string;
  children: ReactNode;
}

const icons = {
  info: '💡',
  warning: '⚠️',
  success: '✅',
  error: '❌',
  tip: '💡',
};

const defaultTitles = {
  info: 'Info',
  warning: 'Warning',
  success: 'Success',
  error: 'Error',
  tip: 'Pro Tip',
};

export default function CalloutBox({ type = 'info', title, children }: CalloutBoxProps) {
  const icon = icons[type];
  const displayTitle = title || defaultTitles[type];

  return (
    <div className={`${styles.callout} ${styles[type]}`}>
      <div className={styles.header}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.title}>{displayTitle}</span>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
