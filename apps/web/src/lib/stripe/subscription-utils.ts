/*
 * Filename: src/lib/stripe/subscription-utils.ts
 * Purpose: Client-safe subscription utilities (no server dependencies)
 * Created: 2025-12-15
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
 * Organisation subscription data
 */
export interface OrganisationSubscription {
  organisation_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: SubscriptionStatus;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Check if subscription grants Premium access
 */
export function isPremium(subscription: OrganisationSubscription | null): boolean {
  if (!subscription) return false;
  return subscription.status === 'trialing' || subscription.status === 'active';
}
