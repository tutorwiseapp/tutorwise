/**
 * Filename: SidebarQuickActionsWidget.tsx
 * Purpose: Core Quick Actions Shell - Reusable clickable actions list pattern
 * Created: 2025-11-18
 * Design: Generic shell for action lists with chevrons
 *
 * Pattern D: Quick Actions Pattern
 * - Title + List of clickable rows
 * - Each row: Icon (optional) + Label + Chevron
 * - Standard padding (16px)
 * - NO complex logic (children control behavior)
 */

'use client';

import React from 'react';
import styles from './SidebarQuickActionsWidget.module.css';

export interface QuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

interface SidebarQuickActionsWidgetProps {
  title: string;
  actions: QuickAction[];
  className?: string;
}

export default function SidebarQuickActionsWidget({
  title,
  actions,
  className = '',
}: SidebarQuickActionsWidgetProps) {
  return (
    <div className={`${styles.quickActionsWidget} ${className}`}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.actionsContainer}>
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={styles.actionRow}
          >
            {action.icon && (
              <span className={styles.icon}>{action.icon}</span>
            )}
            <span className={styles.label}>{action.label}</span>
            <span className={styles.chevron}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
