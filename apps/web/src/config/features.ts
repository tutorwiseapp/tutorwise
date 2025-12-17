/**
 * Filename: apps/web/src/config/features.ts
 * Purpose: Feature flag configuration system for environment-based toggles
 * Created: 2025-12-17
 * Version: v1.0
 *
 * Environment Variables:
 * - NEXT_PUBLIC_ENABLE_SUBSCRIPTION_PAYWALL: 'true' | 'false' (default: 'true')
 * - NEXT_PUBLIC_TRIAL_DAYS: number (default: 14)
 * - NEXT_PUBLIC_SUBSCRIPTION_PRICE: number (default: 50)
 * - NEXT_PUBLIC_SUBSCRIPTION_CURRENCY: 'GBP' | 'USD' | 'EUR' (default: 'GBP')
 *
 * Usage:
 * import { FEATURES } from '@/config/features';
 * if (FEATURES.SUBSCRIPTION_PAYWALL.enabled) { ... }
 */

export const FEATURES = {
  SUBSCRIPTION_PAYWALL: {
    // Toggle subscription paywall on/off (useful for testing)
    enabled: process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTION_PAYWALL !== 'false',

    // Trial period duration (default: 14 days, can be changed to 30 for testing)
    trialDays: parseInt(process.env.NEXT_PUBLIC_TRIAL_DAYS || '14', 10),

    // Subscription pricing
    price: parseInt(process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE || '50', 10),
    currency: (process.env.NEXT_PUBLIC_SUBSCRIPTION_CURRENCY || 'GBP') as 'GBP' | 'USD' | 'EUR',

    // Reminder timing configuration (days before expiry to show reminders)
    reminderDays: [3, 2, 1, 0] as number[], // Show reminders at 3, 2, 1, 0 days remaining

    // Grace period after trial expiry (days)
    gracePeriodDays: 7,
  },
} as const;

/**
 * Validate feature flags on app initialization
 */
export function validateFeatureFlags() {
  const { SUBSCRIPTION_PAYWALL } = FEATURES;

  if (SUBSCRIPTION_PAYWALL.trialDays < 1) {
    console.error('[Feature Flags] Invalid NEXT_PUBLIC_TRIAL_DAYS: must be >= 1');
  }

  if (SUBSCRIPTION_PAYWALL.price < 1) {
    console.error('[Feature Flags] Invalid NEXT_PUBLIC_SUBSCRIPTION_PRICE: must be >= 1');
  }

  if (!['GBP', 'USD', 'EUR'].includes(SUBSCRIPTION_PAYWALL.currency)) {
    console.error('[Feature Flags] Invalid NEXT_PUBLIC_SUBSCRIPTION_CURRENCY: must be GBP, USD, or EUR');
  }
}

/**
 * Get formatted price string
 */
export function getFormattedPrice(): string {
  const { price, currency } = FEATURES.SUBSCRIPTION_PAYWALL;

  const symbols: Record<typeof currency, string> = {
    GBP: '£',
    USD: '$',
    EUR: '€',
  };

  return `${symbols[currency]}${price}`;
}
