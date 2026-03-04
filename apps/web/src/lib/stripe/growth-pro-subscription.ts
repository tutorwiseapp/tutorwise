/*
 * Filename: src/lib/stripe/growth-pro-subscription.ts
 * Purpose: Subscription management for Growth Agent Pro tier
 * Created: 2026-03-05
 *
 * Model: Soft rate-limit paywall (same as Sage Pro)
 * - Free tier: 10 questions/day
 * - Growth Pro (£10/month): 5,000 questions/month
 * - No free trial
 */

import { stripe } from './client';
import { createClient } from '@/utils/supabase/server';
import type Stripe from 'stripe';

export interface GrowthProSubscription {
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_price_id: string | null;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  questions_used_this_period: number;
  questions_limit: number;
  price_per_month: number;
  created_at: string;
  updated_at: string;
}

if (!process.env.STRIPE_GROWTH_PRO_PRICE_ID) {
  console.warn(
    'STRIPE_GROWTH_PRO_PRICE_ID not set. Growth Pro subscriptions will not work. ' +
    'Set this in .env.local after creating the product in Stripe Dashboard.'
  );
}

export async function getGrowthProSubscription(
  userId: string
): Promise<GrowthProSubscription | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('growth_pro_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching Growth Pro subscription:', error);
    throw error;
  }

  return data as GrowthProSubscription;
}

export function isGrowthPro(subscription: GrowthProSubscription | null): boolean {
  if (!subscription) return false;
  return subscription.status === 'active' || subscription.status === 'past_due';
}

/**
 * Create Stripe Checkout Session for Growth Pro subscription (no trial).
 */
export async function createGrowthCheckoutSession(
  userId: string
): Promise<Stripe.Checkout.Session> {
  if (!process.env.STRIPE_GROWTH_PRO_PRICE_ID) {
    throw new Error('STRIPE_GROWTH_PRO_PRICE_ID not configured');
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    throw new Error('User not authenticated');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    line_items: [
      {
        price: process.env.STRIPE_GROWTH_PRO_PRICE_ID,
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        user_id: userId,
        subscription_type: 'growth_pro',
      },
    },
    metadata: {
      user_id: userId,
      subscription_type: 'growth_pro',
    },
    success_url: `${process.env.NEXT_PUBLIC_URL}/growth?subscription=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/growth?subscription=canceled`,
    allow_promotion_codes: true,
  });

  return session;
}

export async function createGrowthBillingPortalSession(
  userId: string,
  returnUrl?: string
): Promise<Stripe.BillingPortal.Session> {
  const subscription = await getGrowthProSubscription(userId);

  if (!subscription || !subscription.stripe_customer_id) {
    throw new Error('No active subscription found');
  }

  return await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: returnUrl || `${process.env.NEXT_PUBLIC_URL}/growth/billing`,
  });
}

export async function cancelGrowthSubscription(userId: string): Promise<void> {
  const subscription = await getGrowthProSubscription(userId);

  if (!subscription || !subscription.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  const supabase = await createClient();
  await supabase
    .from('growth_pro_subscriptions')
    .update({ cancel_at_period_end: true, canceled_at: new Date().toISOString() })
    .eq('user_id', userId);
}

/**
 * Increment question usage for Growth Pro subscribers.
 * Logs to growth_usage_log and increments questions_used_this_period.
 */
export async function incrementGrowthUsage(
  userId: string,
  sessionId: string,
  questionsCount: number = 1,
  tokensUsed?: number,
  modelUsed: string = 'grok-4-fast'
): Promise<void> {
  const supabase = await createClient();

  // Log to growth_usage_log (authoritative for rate limiting via check_growth_daily_limit RPC)
  await supabase.from('growth_usage_log').insert({
    user_id: userId,
    session_id: sessionId,
    question_count: questionsCount,
    tokens_used: tokensUsed ?? null,
    model_used: modelUsed,
  });
}

export async function userHasActiveGrowthPro(userId: string): Promise<boolean> {
  const subscription = await getGrowthProSubscription(userId);
  return isGrowthPro(subscription);
}
