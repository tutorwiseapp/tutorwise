/*
 * Filename: src/lib/stripe/organisation-subscription.ts
 * Purpose: Subscription management for Organisation Premium tier
 * Created: 2025-12-13
 * Version: v8.0 - Feature Flag Integration
 * Updated: 2025-12-17 - Added configurable trial days and pricing via feature flags
 *
 * Features:
 * - Configurable free trial (default 14 days, adjustable via NEXT_PUBLIC_TRIAL_DAYS)
 * - Configurable pricing (default £50/month, adjustable via NEXT_PUBLIC_SUBSCRIPTION_PRICE)
 * - Feature flag toggle (NEXT_PUBLIC_ENABLE_SUBSCRIPTION_PAYWALL)
 * - Single Premium tier (no free tier)
 * - Trial to paid conversion
 * - Subscription cancellation
 */

import { stripe } from './client';
import { createClient } from '@/utils/supabase/server';
import type Stripe from 'stripe';
import { FEATURES, getFormattedPrice } from '@/config/organisation-features';

// Re-export types and utilities from subscription-utils (client-safe)
export type { SubscriptionStatus, OrganisationSubscription } from './subscription-utils';
export { isPremium } from './subscription-utils';
import type { OrganisationSubscription, SubscriptionStatus } from './subscription-utils';
import { isPremium } from './subscription-utils';

/**
 * Environment validation
 */
if (!process.env.STRIPE_PREMIUM_PRICE_ID) {
  console.warn(
    'STRIPE_PREMIUM_PRICE_ID not set. Organisation Premium subscriptions will not work. ' +
    'Set this in .env.local after creating the product in Stripe Dashboard.'
  );
}

/**
 * Get organisation subscription from database
 */
export async function getOrganisationSubscription(
  organisationId: string
): Promise<OrganisationSubscription | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organisation_subscriptions')
    .select('*')
    .eq('organisation_id', organisationId)
    .single();

  if (error) {
    // No subscription exists (new organisation)
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching organisation subscription:', error);
    throw error;
  }

  return data as OrganisationSubscription;
}

/**
 * Create Stripe Checkout Session for trial signup
 *
 * Flow:
 * 1. User clicks "Start Free Trial" on /organisation page
 * 2. This function creates a Checkout Session with configurable trial_period_days
 * 3. No credit card required during trial (trial_settings.end_behavior.missing_payment_method: 'cancel')
 * 4. User is redirected to Stripe Checkout
 * 5. After completing Checkout, user returns to /organisation page
 * 6. Webhook creates organisation_subscriptions record with status='trialing'
 *
 * Note: Trial days are configured via NEXT_PUBLIC_TRIAL_DAYS (default: 14)
 */
export async function createTrialCheckoutSession(organisationId: string): Promise<Stripe.Checkout.Session> {
  if (!process.env.STRIPE_PREMIUM_PRICE_ID) {
    throw new Error('STRIPE_PREMIUM_PRICE_ID not configured');
  }

  const supabase = await createClient();

  // Get organisation owner's email for Stripe Customer
  const { data: org, error: orgError } = await supabase
    .from('connection_groups')
    .select('profile_id, name')
    .eq('id', organisationId)
    .eq('type', 'organisation')
    .single();

  if (orgError || !org) {
    throw new Error('Organisation not found');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', org.profile_id)
    .single();

  if (profileError || !profile?.email) {
    throw new Error('Organisation owner profile not found');
  }

  // Get trial days from feature flags (configurable via environment)
  const trialDays = FEATURES.SUBSCRIPTION_PAYWALL.trialDays;

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: profile.email,
    line_items: [
      {
        price: process.env.STRIPE_PREMIUM_PRICE_ID,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: trialDays,
      metadata: {
        organisation_id: organisationId,
        organisation_name: org.name || 'Unnamed Organisation',
      },
      // Optional: Auto-cancel if no payment method added after trial
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel' as const,
        },
      },
    },
    metadata: {
      organisation_id: organisationId,
      organisation_name: org.name || 'Unnamed Organisation',
    },
    success_url: `${process.env.NEXT_PUBLIC_URL}/organisations?subscription=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/organisations?subscription=canceled`,
    // Allow user to update subscription in future
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Create Stripe Billing Portal Session
 * Allows user to manage subscription (update payment, cancel, view invoices)
 */
export async function createBillingPortalSession(
  organisationId: string,
  returnUrl?: string
): Promise<Stripe.BillingPortal.Session> {
  const subscription = await getOrganisationSubscription(organisationId);

  if (!subscription || !subscription.stripe_customer_id) {
    throw new Error('No active subscription found');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: returnUrl || `${process.env.NEXT_PUBLIC_URL}/organisations`,
  });

  return session;
}

/**
 * Cancel subscription at period end
 * User keeps access until current billing period ends
 */
export async function cancelSubscription(organisationId: string): Promise<void> {
  const subscription = await getOrganisationSubscription(organisationId);

  if (!subscription || !subscription.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  // Cancel at period end (user keeps access until then)
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // Update database
  const supabase = await createClient();
  await supabase
    .from('organisation_subscriptions')
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
    })
    .eq('organisation_id', organisationId);
}

/**
 * Reactivate a canceled subscription
 * Only works if subscription hasn't ended yet
 */
export async function reactivateSubscription(organisationId: string): Promise<void> {
  const subscription = await getOrganisationSubscription(organisationId);

  if (!subscription || !subscription.stripe_subscription_id) {
    throw new Error('No subscription found');
  }

  if (!subscription.cancel_at_period_end) {
    throw new Error('Subscription is not scheduled for cancellation');
  }

  // Remove cancellation
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  // Update database
  const supabase = await createClient();
  await supabase
    .from('organisation_subscriptions')
    .update({
      cancel_at_period_end: false,
      canceled_at: null,
    })
    .eq('organisation_id', organisationId);
}

/**
 * Get subscription details from Stripe (for sync/debug)
 */
export async function getStripeSubscription(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(stripeSubscriptionId);
}

/**
 * Sync subscription status from Stripe to database
 * Useful for fixing desync issues
 */
export async function syncSubscriptionStatus(organisationId: string): Promise<void> {
  const subscription = await getOrganisationSubscription(organisationId);

  if (!subscription || !subscription.stripe_subscription_id) {
    throw new Error('No subscription found');
  }

  const stripeSubscription = await getStripeSubscription(subscription.stripe_subscription_id);

  const supabase = await createClient();
  await supabase
    .from('organisation_subscriptions')
    .update({
      status: stripeSubscription.status as SubscriptionStatus,
      trial_start: (stripeSubscription as any).trial_start
        ? new Date((stripeSubscription as any).trial_start * 1000).toISOString()
        : null,
      trial_end: (stripeSubscription as any).trial_end
        ? new Date((stripeSubscription as any).trial_end * 1000).toISOString()
        : null,
      current_period_start: new Date((stripeSubscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((stripeSubscription as any).current_period_end * 1000).toISOString(),
      cancel_at_period_end: (stripeSubscription as any).cancel_at_period_end,
    })
    .eq('organisation_id', organisationId);
}

/**
 * Check if organisation has active subscription (helper for RLS/middleware)
 */
export async function organisationHasActiveSubscription(organisationId: string): Promise<boolean> {
  const subscription = await getOrganisationSubscription(organisationId);
  return isPremium(subscription);
}
