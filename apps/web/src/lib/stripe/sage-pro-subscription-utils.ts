/*
 * Filename: src/lib/stripe/sage-pro-subscription-utils.ts
 * Purpose: Client-safe subscription utilities for Sage Pro (no server dependencies)
 * Created: 2026-02-22
 */

/**
 * Subscription status type
 */
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'none';

/**
 * Sage Pro subscription data
 */
export interface SageProSubscription {
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: SubscriptionStatus;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  questions_used_this_month: number;
  questions_quota: number;
  storage_used_bytes: number;
  storage_quota_bytes: number;
  last_quota_reset: string;
  created_at: string;
  updated_at: string;
}

/**
 * Usage quota check result
 */
export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  quota: number;
  used: number;
}

/**
 * Storage quota check result
 */
export interface StorageQuotaCheckResult {
  allowed: boolean;
  remaining: number; // bytes
  quota: number; // bytes
  used: number; // bytes
}

/**
 * Check if subscription grants Pro access
 */
export function isPro(subscription: SageProSubscription | null): boolean {
  if (!subscription) return false;
  return subscription.status === 'trialing' || subscription.status === 'active';
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get quota usage percentage
 */
export function getQuotaPercentage(used: number, quota: number): number {
  if (quota === 0) return 0;
  return Math.min(100, Math.round((used / quota) * 100));
}

/**
 * Check if quota is running low (>80% used)
 */
export function isQuotaLow(used: number, quota: number): boolean {
  return getQuotaPercentage(used, quota) > 80;
}

/**
 * Check if quota is exceeded
 */
export function isQuotaExceeded(used: number, quota: number): boolean {
  return used >= quota;
}
