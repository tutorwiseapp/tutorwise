/**
 * Filename: apps/web/src/app/components/hub/content/HubEmptyState.tsx
 * Purpose: Centralized empty state component for all hub pages
 * Created: 2025-12-03
 * Pattern: Replaces 200+ lines of duplicated empty state CSS across hub pages
 */

import React from 'react';
import Button from '@/app/components/ui/actions/Button';
import styles from './HubEmptyState.module.css';

interface HubEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export default function HubEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon
}: HubEmptyStateProps) {
  return (
    <div className={styles.container}>
      {icon && <div className={styles.icon}>{icon}</div>}

      <h3 className={styles.title}>
        {title}
      </h3>

      <p className={styles.description}>
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}