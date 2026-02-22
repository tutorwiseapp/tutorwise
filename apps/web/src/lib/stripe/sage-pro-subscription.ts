/*
 * Filename: src/lib/stripe/sage-pro-subscription.ts
 * Purpose: Subscription management for Sage AI Tutor Pro tier
 * Created: 2026-02-22
 * Version: v1.0
 *
 * Features:
 * - Configurable free trial (default 14 days)
 * - £10/month pricing
 * - 5,000 questions/month quota
 * - 1 GB storage quota
 * - Trial to paid conversion
 * - Subscription cancellation
 */

import { stripe } from './client';
import { createClient } from '@/utils/supabase/server';
import type Stripe from 'stripe';
import { FEATURES } from '@/config/organisation-features';

// Re-export types and utilities from sage-pro-subscription-utils (client-safe)
export type { SubscriptionStatus, SageProSubscription, QuotaCheckResult, StorageQuotaCheckResult } from './sage-pro-subscription-utils';
export { isPro, formatBytes, getQuotaPercentage, isQuotaLow, isQuotaExceeded } from './sage-pro-subscription-utils';
import type { SageProSubscription, SubscriptionStatus, QuotaCheckResult, StorageQuotaCheckResult } from './sage-pro-subscription-utils';
import { isPro } from './sage-pro-subscription-utils';

/**
 * Environment validation
 */
if (!process.env.STRIPE_SAGE_PRO_PRICE_ID) {
  console.warn(
    'STRIPE_SAGE_PRO_PRICE_ID not set. Sage Pro subscriptions will not work. ' +
    'Set this in .env.local after creating the product in Stripe Dashboard.'
  );
}

/**
 * Get user's Sage Pro subscription from database
 */
export async function getSageProSubscription(
  userId: string
): Promise<SageProSubscription | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sage_pro_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // No subscription exists (free tier user)
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching Sage Pro subscription:', error);
    throw error;
  }

  return data as SageProSubscription;
}

/**
 * Create Stripe Checkout Session for trial signup
 *
 * Flow:
 * 1. User clicks "Start Free Trial" on Sage page
 * 2. This function creates a Checkout Session with 14-day trial
 * 3. No credit card required during trial (trial_settings.end_behavior.missing_payment_method: 'cancel')
 * 4. User is redirected to Stripe Checkout
 * 5. After completing Checkout, user returns to /sage page
 * 6. Webhook creates sage_pro_subscriptions record with status='trialing'
 */
export async function createTrialCheckoutSession(userId: string): Promise<Stripe.Checkout.Session> {
  if (!process.env.STRIPE_SAGE_PRO_PRICE_ID) {
    throw new Error('STRIPE_SAGE_PRO_PRICE_ID not configured');
  }

  const supabase = await createClient();

  // Get user's email for Stripe Customer
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    throw new Error('User not authenticated');
  }

  // Get trial days from feature flags (configurable via environment)
  const trialDays = FEATURES.SUBSCRIPTION_PAYWALL.trialDays;

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    line_items: [
      {
        price: process.env.STRIPE_SAGE_PRO_PRICE_ID,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: trialDays,
      metadata: {
        user_id: userId,
        subscription_type: 'sage_pro',
      },
      // Auto-cancel if no payment method added after trial
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel' as const,
        },
      },
    },
    metadata: {
      user_id: userId,
      subscription_type: 'sage_pro',
    },
    success_url: `${process.env.NEXT_PUBLIC_URL}/sage?subscription=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/sage?subscription=canceled`,
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Create Stripe Billing Portal Session
 * Allows user to manage subscription (update payment, cancel, view invoices)
 */
export async function createBillingPortalSession(
  userId: string,
  returnUrl?: string
): Promise<Stripe.BillingPortal.Session> {
  const subscription = await getSageProSubscription(userId);

  if (!subscription || !subscription.stripe_customer_id) {
    throw new Error('No active subscription found');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: returnUrl || `${process.env.NEXT_PUBLIC_URL}/sage/billing`,
  });

  return session;
}

/**
 * Cancel subscription at period end
 * User keeps access until current billing period ends
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const subscription = await getSageProSubscription(userId);

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
    .from('sage_pro_subscriptions')
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Reactivate a canceled subscription
 * Only works if subscription hasn't ended yet
 */
export async function reactivateSubscription(userId: string): Promise<void> {
  const subscription = await getSageProSubscription(userId);

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
    .from('sage_pro_subscriptions')
    .update({
      cancel_at_period_end: false,
      canceled_at: null,
    })
    .eq('user_id', userId);
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
export async function syncSubscriptionStatus(userId: string): Promise<void> {
  const subscription = await getSageProSubscription(userId);

  if (!subscription || !subscription.stripe_subscription_id) {
    throw new Error('No subscription found');
  }

  const stripeSubscription = await getStripeSubscription(subscription.stripe_subscription_id);

  const supabase = await createClient();
  await supabase
    .from('sage_pro_subscriptions')
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
    .eq('user_id', userId);
}

/**
 * Check if user has active Pro subscription (helper for middleware)
 */
export async function userHasActivePro(userId: string): Promise<boolean> {
  const subscription = await getSageProSubscription(userId);
  return isPro(subscription);
}

/**
 * Check user's question quota
 * Returns quota details for display and enforcement
 */
export async function checkQuestionQuota(userId: string): Promise<QuotaCheckResult> {
  const supabase = await createClient();

  // Call database function
  const { data, error } = await supabase
    .rpc('sage_check_quota', { p_user_id: userId })
    .single();

  if (error) {
    console.error('Error checking question quota:', error);
    throw error;
  }

  return data as QuotaCheckResult;
}

/**
 * Check user's storage quota
 * Returns storage details for display and enforcement
 */
export async function checkStorageQuota(
  userId: string,
  newFileSize: number = 0
): Promise<StorageQuotaCheckResult> {
  const supabase = await createClient();

  // Call database function
  const { data, error } = await supabase
    .rpc('sage_check_storage_quota', {
      p_user_id: userId,
      p_new_file_size: newFileSize,
    })
    .single();

  if (error) {
    console.error('Error checking storage quota:', error);
    throw error;
  }

  return data as StorageQuotaCheckResult;
}

/**
 * Increment usage count after user asks a question
 */
export async function incrementUsage(
  userId: string,
  sessionId: string,
  questionsCount: number = 1,
  tokensUsed?: number,
  modelUsed: string = 'gemini-1.5-flash',
  estimatedCostUsd?: number
): Promise<void> {
  const supabase = await createClient();

  await supabase.rpc('sage_increment_usage', {
    p_user_id: userId,
    p_session_id: sessionId,
    p_questions_count: questionsCount,
    p_tokens_used: tokensUsed,
    p_model_used: modelUsed,
    p_estimated_cost_usd: estimatedCostUsd,
  });
}

/**
 * Update storage usage after file upload/delete
 */
export async function updateStorageUsage(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase.rpc('sage_update_storage_usage', {
    p_user_id: userId,
  });
}

/**
 * Track uploaded file
 */
export async function trackStorageFile(
  userId: string,
  fileName: string,
  fileType: 'image' | 'audio' | 'pdf',
  fileSizeBytes: number,
  storagePath: string,
  sessionId?: string,
  extractedText?: string
): Promise<void> {
  const supabase = await createClient();

  // Insert file record
  await supabase.from('sage_storage_files').insert({
    user_id: userId,
    file_name: fileName,
    file_type: fileType,
    file_size_bytes: fileSizeBytes,
    storage_path: storagePath,
    session_id: sessionId,
    extracted_text: extractedText,
    processing_status: extractedText ? 'processed' : 'pending',
  });

  // Update total storage usage
  await updateStorageUsage(userId);
}

/**
 * Get user's usage statistics
 */
export async function getUserUsageStats(userId: string): Promise<{
  subscription: SageProSubscription | null;
  questionQuota: QuotaCheckResult;
  storageQuota: StorageQuotaCheckResult;
}> {
  const subscription = await getSageProSubscription(userId);
  const questionQuota = await checkQuestionQuota(userId);
  const storageQuota = await checkStorageQuota(userId);

  return {
    subscription,
    questionQuota,
    storageQuota,
  };
}
