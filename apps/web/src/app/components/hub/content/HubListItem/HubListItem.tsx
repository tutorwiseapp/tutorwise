/**
 * HubListItem Component
 *
 * A reusable Hub component for displaying list items with consistent styling.
 * Used for availability periods, unavailability periods, and other list displays.
 *
 * Design:
 * - Horizontal flex layout with space-between
 * - White/light background with border
 * - Optional conflict/error state styling
 * - Actions slot for buttons on the right side
 */

import React from 'react';
import styles from './HubListItem.module.css';

export interface HubListItemProps {
  /** Main content to display (left side) */
  children: React.ReactNode;
  /** Optional actions (buttons) to display on the right side */
  actions?: React.ReactNode;
  /** Optional error/conflict state - shows warning border */
  hasError?: boolean;
  /** Optional variant for background color */
  variant?: 'default' | 'light';
  /** Optional className for additional styling */
  className?: string;
}

/**
 * HubListItem - Displays a horizontal list item with content and actions
 *
 * @example
 * <HubListItem
 *   actions={<Button variant="danger" size="sm">Remove</Button>}
 * >
 *   Mon, Wed - 9:00 AM to 5:00 PM
 * </HubListItem>
 *
 * @example
 * <HubListItem
 *   hasError={true}
 *   actions={<Button variant="danger" size="sm">Remove</Button>}
 * >
 *   Conflicting period
 * </HubListItem>
 */
export default function HubListItem({
  children,
  actions,
  hasError = false,
  variant = 'light',
  className = ''
}: HubListItemProps) {
  const variantClass = variant === 'light' ? styles.itemLight : styles.itemDefault;
  const errorClass = hasError ? styles.itemError : '';

  return (
    <div className={`${styles.item} ${variantClass} ${errorClass} ${className}`.trim()}>
      <div className={styles.content}>
        {children}
      </div>
      {actions && (
        <div className={styles.actions}>
          {actions}
        </div>
      )}
    </div>
  );
}
