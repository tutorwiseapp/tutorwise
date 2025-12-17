/**
 * Filename: apps/web/src/lib/stripe/trial-status.ts
 * Purpose: Trial status detection and smart popup timing logic
 * Created: 2025-12-17
 * Version: v1.0
 *
 * Smart Popup Logic:
 * - Days 1-10: No popup (let users explore)
 * - Day 11 (3 days left): Show once per day
 * - Day 12 (2 days left): Show once per day
 * - Day 13 (1 day left): Show once per day
 * - Day 14+ (expired): Show immediately every visit (no dismissal)
 */

import type { OrganisationSubscription } from './subscription-utils';
import { FEATURES } from '@/config/features';

export interface TrialStatus {
  daysRemaining: number;
  isExpired: boolean;
  shouldShowReminder: boolean;
  reminderType: 'none' | 'gentle' | 'urgent' | 'expired';
  trialEnd: Date;
  canDismiss: boolean;
}

/**
 * Calculate days remaining in trial
 */
function calculateDaysRemaining(trialEnd: Date): number {
  const now = new Date();
  const diffMs = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get trial status with smart popup logic
 */
export function getTrialStatus(subscription: OrganisationSubscription | null): TrialStatus | null {
  // No subscription = no trial
  if (!subscription || !subscription.trial_end) {
    return null;
  }

  const trialEnd = new Date(subscription.trial_end);
  const daysRemaining = calculateDaysRemaining(trialEnd);
  const isExpired = daysRemaining <= 0;

  // Determine if reminder should be shown based on FEATURES.SUBSCRIPTION_PAYWALL.reminderDays
  const shouldShowReminder = FEATURES.SUBSCRIPTION_PAYWALL.reminderDays.includes(daysRemaining);

  // Determine reminder type for UI styling
  let reminderType: TrialStatus['reminderType'] = 'none';
  if (isExpired) {
    reminderType = 'expired';
  } else if (daysRemaining === 1) {
    reminderType = 'urgent';
  } else if (shouldShowReminder) {
    reminderType = 'gentle';
  }

  // Can only dismiss if trial hasn't expired yet
  const canDismiss = !isExpired;

  return {
    daysRemaining,
    isExpired,
    shouldShowReminder,
    reminderType,
    trialEnd,
    canDismiss,
  };
}

/**
 * localStorage key for dismissal tracking
 */
function getDismissalKey(organisationId: string, daysRemaining: number): string {
  return `trial_reminder_dismissed_${organisationId}_day${daysRemaining}`;
}

/**
 * Check if user has dismissed reminder for today
 */
export function hasUserDismissedToday(organisationId: string, daysRemaining: number): boolean {
  if (typeof window === 'undefined') return false;

  const key = getDismissalKey(organisationId, daysRemaining);
  const dismissedDate = localStorage.getItem(key);

  if (!dismissedDate) return false;

  // Check if dismissal was today
  const today = new Date().toDateString();
  const dismissed = new Date(dismissedDate).toDateString();

  return today === dismissed;
}

/**
 * Mark reminder as dismissed for today
 */
export function dismissReminderForToday(organisationId: string, daysRemaining: number): void {
  if (typeof window === 'undefined') return;

  const key = getDismissalKey(organisationId, daysRemaining);
  localStorage.setItem(key, new Date().toISOString());
}

/**
 * Clear all dismissal history for organisation (useful for testing)
 */
export function clearDismissalHistory(organisationId: string): void {
  if (typeof window === 'undefined') return;

  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith(`trial_reminder_dismissed_${organisationId}_`)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Should show popup on this page load?
 * Combines trial status + dismissal logic
 */
export function shouldShowPopup(
  organisationId: string,
  subscription: OrganisationSubscription | null
): boolean {
  // Feature flag check
  if (!FEATURES.SUBSCRIPTION_PAYWALL.enabled) {
    return false;
  }

  const trialStatus = getTrialStatus(subscription);

  // No trial status = no popup
  if (!trialStatus) {
    return false;
  }

  // Trial not in reminder window = no popup
  if (!trialStatus.shouldShowReminder) {
    return false;
  }

  // Trial expired = always show (no dismissal)
  if (trialStatus.isExpired) {
    return true;
  }

  // Check if user dismissed for today
  const dismissed = hasUserDismissedToday(organisationId, trialStatus.daysRemaining);

  return !dismissed;
}

/**
 * Get reminder message based on trial status
 */
export function getReminderMessage(trialStatus: TrialStatus): {
  title: string;
  description: string;
  ctaText: string;
} {
  if (trialStatus.isExpired) {
    return {
      title: 'Your Trial Has Expired',
      description: 'Subscribe now to continue accessing Organisation Premium features. Export your data before your grace period ends.',
      ctaText: 'Subscribe Now',
    };
  }

  if (trialStatus.daysRemaining === 1) {
    return {
      title: 'Trial Expires Tomorrow',
      description: 'Your trial ends tomorrow. Subscribe now or export your data to keep your work.',
      ctaText: 'Subscribe Now',
    };
  }

  return {
    title: `${trialStatus.daysRemaining} Days Left in Your Trial`,
    description: `Your trial expires in ${trialStatus.daysRemaining} days. Subscribe to continue enjoying Premium features, or export your data.`,
    ctaText: 'Subscribe Now',
  };
}
