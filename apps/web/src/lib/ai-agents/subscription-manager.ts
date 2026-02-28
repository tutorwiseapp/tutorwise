/**
 * Filename: subscription-manager.ts
 * Purpose: AI Tutor Subscription Manager - Stripe subscription handling
 * Created: 2026-02-23
 * Version: v1.0
 */

import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe/client';
import type Stripe from 'stripe';

export interface AIAgentSubscription {
  id: string;
  ai_tutor_id: string;
  owner_id: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  stripe_price_id?: string;
  status: string;
  price_per_month: number;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at?: string;
  canceled_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get subscription for AI tutor
 */
export async function getAIAgentSubscription(
  aiAgentId: string
): Promise<AIAgentSubscription | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_tutor_subscriptions')
    .select('*')
    .eq('ai_tutor_id', aiAgentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Create Stripe Checkout for AI tutor subscription
 * Price: £10/month
 */
export async function createSubscriptionCheckout(
  aiAgentId: string,
  userId: string
): Promise<Stripe.Checkout.Session> {
  if (!process.env.STRIPE_AI_AGENT_PRICE_ID) {
    throw new Error('STRIPE_AI_AGENT_PRICE_ID not configured');
  }

  const supabase = await createClient();

  // Get user email
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('User not authenticated');

  // Get AI tutor details
  const { data: tutor } = await supabase
    .from('ai_tutors')
    .select('display_name, owner_id')
    .eq('id', aiAgentId)
    .single();

  if (!tutor || tutor.owner_id !== userId) {
    throw new Error('AI tutor not found or access denied');
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    line_items: [
      {
        price: process.env.STRIPE_AI_AGENT_PRICE_ID,
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        user_id: userId,
        ai_tutor_id: aiAgentId,
        subscription_type: 'ai_tutor',
      },
    },
    metadata: {
      user_id: userId,
      ai_tutor_id: aiAgentId,
      subscription_type: 'ai_tutor',
    },
    success_url: `${process.env.NEXT_PUBLIC_URL}/hub/ai-agents/${aiAgentId}?subscription=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/hub/ai-agents/${aiAgentId}?subscription=canceled`,
  });

  return session;
}

/**
 * Create billing portal session
 */
export async function createBillingPortalSession(
  aiAgentId: string,
  userId: string
): Promise<Stripe.BillingPortal.Session> {
  const supabase = await createClient();

  // Get subscription
  const { data: subscription } = await supabase
    .from('ai_tutor_subscriptions')
    .select('stripe_customer_id, owner_id')
    .eq('ai_tutor_id', aiAgentId)
    .single();

  if (!subscription || subscription.owner_id !== userId) {
    throw new Error('Subscription not found or access denied');
  }

  if (!subscription.stripe_customer_id) {
    throw new Error('No Stripe customer ID found');
  }

  // Create portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_URL}/hub/ai-agents/${aiAgentId}`,
  });

  return session;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  aiAgentId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  // Get subscription
  const { data: subscription } = await supabase
    .from('ai_tutor_subscriptions')
    .select('stripe_subscription_id, owner_id')
    .eq('ai_tutor_id', aiAgentId)
    .single();

  if (!subscription || subscription.owner_id !== userId) {
    throw new Error('Subscription not found or access denied');
  }

  if (!subscription.stripe_subscription_id) {
    throw new Error('No Stripe subscription ID found');
  }

  // Cancel at period end
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true,
  });
}

/**
 * Reactivate canceled subscription
 */
export async function reactivateSubscription(
  aiAgentId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  // Get subscription
  const { data: subscription } = await supabase
    .from('ai_tutor_subscriptions')
    .select('stripe_subscription_id, owner_id')
    .eq('ai_tutor_id', aiAgentId)
    .single();

  if (!subscription || subscription.owner_id !== userId) {
    throw new Error('Subscription not found or access denied');
  }

  if (!subscription.stripe_subscription_id) {
    throw new Error('No Stripe subscription ID found');
  }

  // Remove cancel_at_period_end flag
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: false,
  });
}
