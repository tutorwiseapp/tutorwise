/**
 * Filename: src/app/components/admin/badges/StatusBadge.tsx
 * Purpose: Reusable status badge component for admin tables
 * Created: 2025-12-30
 */

'use client';

import React from 'react';
import styles from './StatusBadge.module.css';

export type StatusVariant =
  // Booking statuses
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  // User statuses
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'verified'
  | 'unverified'
  // Payment statuses
  | 'paid'
  | 'unpaid'
  | 'refunded'
  | 'processing'
  // Review statuses
  | 'published'
  | 'flagged'
  | 'removed'
  // Dispute statuses
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'escalated'
  // General statuses
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

export type StatusSize = 'sm' | 'md' | 'lg';

export interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string; // Override default label
  size?: StatusSize;
  className?: string;
}

const DEFAULT_LABELS: Record<StatusVariant, string> = {
  // Booking statuses
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  // User statuses
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  verified: 'Verified',
  unverified: 'Unverified',
  // Payment statuses
  paid: 'Paid',
  unpaid: 'Unpaid',
  refunded: 'Refunded',
  processing: 'Processing',
  // Review statuses
  published: 'Published',
  flagged: 'Flagged',
  removed: 'Removed',
  // Dispute statuses
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  escalated: 'Escalated',
  // General statuses
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Info',
  neutral: 'Neutral',
};

export default function StatusBadge({
  variant,
  label,
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  const displayLabel = label || DEFAULT_LABELS[variant];

  return (
    <span
      className={`${styles.badge} ${styles[variant]} ${styles[size]} ${className}`}
      aria-label={`Status: ${displayLabel}`}
    >
      {displayLabel}
    </span>
  );
}

/**
 * Helper function to map booking status to badge variant
 */
export function getBookingStatusVariant(status: string): StatusVariant {
  const statusLower = status.toLowerCase();
  if (statusLower === 'confirmed') return 'confirmed';
  if (statusLower === 'completed') return 'completed';
  if (statusLower === 'cancelled') return 'cancelled';
  if (statusLower === 'rejected') return 'rejected';
  return 'pending';
}

/**
 * Helper function to map user status to badge variant
 */
export function getUserStatusVariant(
  isActive: boolean,
  isSuspended: boolean
): StatusVariant {
  if (isSuspended) return 'suspended';
  if (isActive) return 'active';
  return 'inactive';
}

/**
 * Helper function to map payment status to badge variant
 */
export function getPaymentStatusVariant(status: string): StatusVariant {
  const statusLower = status.toLowerCase();
  if (statusLower === 'paid' || statusLower === 'succeeded') return 'paid';
  if (statusLower === 'refunded') return 'refunded';
  if (statusLower === 'processing' || statusLower === 'pending') return 'processing';
  return 'unpaid';
}

/**
 * Helper function to map review status to badge variant
 */
export function getReviewStatusVariant(
  isPublished: boolean,
  isFlagged: boolean,
  isRemoved: boolean
): StatusVariant {
  if (isRemoved) return 'removed';
  if (isFlagged) return 'flagged';
  if (isPublished) return 'published';
  return 'pending';
}

/**
 * Helper function to map dispute status to badge variant
 */
export function getDisputeStatusVariant(status: string): StatusVariant {
  const statusLower = status.toLowerCase();
  if (statusLower === 'resolved') return 'resolved';
  if (statusLower === 'escalated') return 'escalated';
  if (statusLower === 'in_progress' || statusLower === 'investigating')
    return 'in_progress';
  return 'open';
}
