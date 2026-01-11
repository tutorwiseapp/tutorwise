/**
 * Filename: AutoSaveIndicator.tsx
 * Purpose: Visual indicator for auto-save status in onboarding
 * Created: 2026-01-10
 *
 * Shows save status with toast notifications and inline indicator
 * Integrates with useAutoSave hook
 */

'use client';

import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { SaveStatus, formatLastSaved } from '@/hooks/useAutoSave';
import styles from './AutoSaveIndicator.module.css';

interface AutoSaveIndicatorProps {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  error?: Error | null;
  showToasts?: boolean; // Enable/disable toast notifications
  variant?: 'inline' | 'floating'; // Display style
}

export default function AutoSaveIndicator({
  saveStatus,
  lastSaved,
  error = null,
  showToasts = true,
  variant = 'inline',
}: AutoSaveIndicatorProps) {
  // Show toast notifications on save success/error
  useEffect(() => {
    if (!showToasts) return;

    if (saveStatus === 'success') {
      toast.success('Progress saved', {
        duration: 2000,
        position: 'bottom-right',
        icon: '✓',
        style: {
          background: '#dcfce7',
          color: '#166534',
          fontSize: '14px',
        },
      });
    } else if (saveStatus === 'error') {
      toast.error(error?.message || 'Failed to save progress', {
        duration: 4000,
        position: 'bottom-right',
        icon: '⚠',
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          fontSize: '14px',
        },
      });
    }
  }, [saveStatus, error, showToasts]);

  // Don't render indicator if idle and no last save
  if (saveStatus === 'idle' && !lastSaved) {
    return null;
  }

  const getStatusConfig = () => {
    switch (saveStatus) {
      case 'pending':
        return {
          icon: '○',
          text: 'Changes pending...',
          className: styles.pending,
        };
      case 'saving':
        return {
          icon: '◐',
          text: 'Saving...',
          className: styles.saving,
        };
      case 'success':
        return {
          icon: '✓',
          text: formatLastSaved(lastSaved),
          className: styles.success,
        };
      case 'error':
        return {
          icon: '⚠',
          text: error?.message || 'Save failed',
          className: styles.error,
        };
      default:
        return {
          icon: '',
          text: formatLastSaved(lastSaved),
          className: styles.idle,
        };
    }
  };

  const config = getStatusConfig();

  if (variant === 'inline') {
    return (
      <div className={`${styles.inlineIndicator} ${config.className}`}>
        <span className={styles.icon}>{config.icon}</span>
        <span className={styles.text}>{config.text}</span>
      </div>
    );
  }

  // Floating indicator (bottom-left corner)
  return (
    <div className={`${styles.floatingIndicator} ${config.className}`}>
      <span className={styles.icon}>{config.icon}</span>
      <span className={styles.text}>{config.text}</span>
    </div>
  );
}

/**
 * Compact version - just icon with tooltip
 */
export function CompactAutoSaveIndicator({
  saveStatus,
  lastSaved,
}: {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
}) {
  const getStatusConfig = () => {
    switch (saveStatus) {
      case 'pending':
        return { icon: '○', title: 'Changes pending...', color: '#9ca3af' };
      case 'saving':
        return { icon: '◐', title: 'Saving...', color: '#3b82f6' };
      case 'success':
        return { icon: '✓', title: formatLastSaved(lastSaved), color: '#34a853' };
      case 'error':
        return { icon: '⚠', title: 'Save failed', color: '#d93025' };
      default:
        return { icon: '', title: formatLastSaved(lastSaved), color: '#9ca3af' };
    }
  };

  const config = getStatusConfig();

  if (!config.icon) return null;

  return (
    <span
      className={styles.compactIcon}
      style={{ color: config.color }}
      title={config.title}
    >
      {config.icon}
    </span>
  );
}
