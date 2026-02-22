/**
 * Filename: /sage/billing/page.tsx
 * Purpose: Sage Pro billing & subscription management page
 * Created: 2026-02-22
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './page.module.css';

interface SageProSubscription {
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid';
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

interface UsageStats {
  tier: 'pro' | 'free';
  subscription: SageProSubscription | null;
  questions: {
    used: number;
    remaining: number;
    quota: number;
    allowed: boolean;
    percentage: number;
  };
  storage: {
    usedBytes: number;
    remainingBytes: number;
    quotaBytes: number;
    allowed: boolean;
    percentage: number;
  };
}

async function getSageSubscription(): Promise<{ subscription: SageProSubscription | null; tier: 'pro' | 'free' }> {
  const response = await fetch('/api/sage/subscription');
  if (!response.ok) throw new Error('Failed to fetch subscription');
  return response.json();
}

async function getSageUsage(): Promise<UsageStats> {
  const response = await fetch('/api/sage/usage');
  if (!response.ok) throw new Error('Failed to fetch usage stats');
  return response.json();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function SageBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Fetch subscription data
  const {
    data: subscriptionData,
    isLoading: subscriptionLoading,
  } = useQuery({
    queryKey: ['sage-subscription'],
    queryFn: getSageSubscription,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    refetchOnMount: 'always',
  });

  // Fetch usage stats
  const {
    data: usageStats,
    isLoading: usageLoading,
  } = useQuery({
    queryKey: ['sage-usage'],
    queryFn: getSageUsage,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
  });

  const subscription = subscriptionData?.subscription;
  const tier = subscriptionData?.tier || 'free';
  const isPro = tier === 'pro';

  // Handle URL parameters (success/canceled from Stripe)
  useEffect(() => {
    const status = searchParams.get('subscription');
    if (status === 'success') {
      toast.success('Subscription activated! Welcome to Sage Pro.');
      queryClient.invalidateQueries({ queryKey: ['sage-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['sage-usage'] });
      router.replace('/sage/billing');
    } else if (status === 'canceled') {
      toast.error('Subscription setup was canceled');
      router.replace('/sage/billing');
    }
  }, [searchParams, router, queryClient]);

  // Handle Start Trial
  const handleStartTrial = async () => {
    try {
      const response = await fetch('/api/stripe/sage/checkout/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create checkout session');
        return;
      }

      if (!data.url) {
        toast.error('No checkout URL returned');
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Error starting trial:', error);
      toast.error('Failed to start trial. Please try again.');
    }
  };

  // Handle Manage Subscription (Billing Portal)
  const handleManageSubscription = async () => {
    if (!subscription || subscription.status === 'canceled') {
      return handleStartTrial();
    }

    try {
      const response = await fetch('/api/stripe/sage/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/sage/billing`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to open billing portal');
        return;
      }

      if (!data.url) {
        toast.error('No billing portal URL returned');
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error('Failed to open billing portal. Please try again.');
    }
  };

  if (subscriptionLoading || usageLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Sage Pro Billing</h1>
        </div>
        <div className={styles.loading}>Loading subscription details...</div>
      </div>
    );
  }

  const getStatusBadge = (status: SageProSubscription['status']) => {
    const badges: Record<SageProSubscription['status'], { label: string; className: string }> = {
      trialing: { label: 'Free Trial', className: styles.statusTrialing },
      active: { label: 'Active', className: styles.statusActive },
      past_due: { label: 'Past Due', className: styles.statusPastDue },
      canceled: { label: 'Canceled', className: styles.statusCanceled },
      incomplete: { label: 'Incomplete', className: styles.statusIncomplete },
      incomplete_expired: { label: 'Expired', className: styles.statusExpired },
      unpaid: { label: 'Unpaid', className: styles.statusUnpaid },
    };

    const badge = badges[status];
    return <span className={`${styles.statusBadge} ${badge.className}`}>{badge.label}</span>;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Sage Pro Billing</h1>
          <p className={styles.subtitle}>Manage your Sage AI Tutor subscription and usage</p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            onClick={() => router.push('/sage')}
          >
            Back to Sage
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Current Plan */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Current Plan</h2>
          <div className={styles.planInfo}>
            <div className={styles.planTier}>
              <span className={styles.tierName}>{isPro ? 'Sage Pro' : 'Free Tier'}</span>
              {subscription && getStatusBadge(subscription.status)}
            </div>
            <p className={styles.planPrice}>
              {isPro ? '£10.00/month' : 'Free'}
            </p>
            {subscription && subscription.status === 'trialing' && subscription.trial_end && (
              <p className={styles.trialInfo}>
                Trial ends on {formatDate(subscription.trial_end)}
              </p>
            )}
            {subscription && subscription.cancel_at_period_end && (
              <p className={styles.cancelInfo}>
                Access until {formatDate(subscription.current_period_end)}
              </p>
            )}
          </div>

          <div className={styles.planFeatures}>
            <h3>Features</h3>
            <ul>
              <li className={isPro ? styles.included : styles.notIncluded}>
                {usageStats?.questions.quota.toLocaleString() || '10'} questions per month
              </li>
              <li className={isPro ? styles.included : styles.notIncluded}>
                {isPro ? formatBytes(usageStats?.storage.quotaBytes || 1073741824) : 'No'} storage
              </li>
              <li className={isPro ? styles.included : styles.notIncluded}>
                {isPro ? 'All subjects' : 'Maths only'}
              </li>
              <li className={isPro ? styles.included : styles.notIncluded}>
                {isPro ? 'Extended' : 'Basic'} conversation history
              </li>
              <li className={isPro ? styles.included : styles.notIncluded}>
                Priority responses
              </li>
              <li className={isPro ? styles.included : styles.notIncluded}>
                Progress tracking & analytics
              </li>
            </ul>
          </div>

          <div className={styles.cardActions}>
            {!isPro ? (
              <Button
                variant="primary"
                size="large"
                onClick={handleStartTrial}
                fullWidth
              >
                Start 14-Day Free Trial
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={handleManageSubscription}
                fullWidth
              >
                Manage Subscription
              </Button>
            )}
          </div>
        </div>

        {/* Usage Statistics */}
        {usageStats && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Usage This Month</h2>

            {/* Questions Usage */}
            <div className={styles.usageSection}>
              <div className={styles.usageHeader}>
                <span>Questions</span>
                <span className={styles.usageNumbers}>
                  {usageStats.questions.used.toLocaleString()} / {usageStats.questions.quota.toLocaleString()}
                </span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.min(usageStats.questions.percentage, 100)}%`,
                    backgroundColor: usageStats.questions.percentage > 90 ? '#ef4444' :
                                   usageStats.questions.percentage > 75 ? '#f59e0b' : '#10b981',
                  }}
                />
              </div>
              <p className={styles.usageDetail}>
                {usageStats.questions.remaining} questions remaining
                {!isPro && usageStats.questions.remaining === 0 && (
                  <span className={styles.upgradeHint}> • Upgrade to Pro for 5,000/month</span>
                )}
              </p>
            </div>

            {/* Storage Usage */}
            {isPro && (
              <div className={styles.usageSection}>
                <div className={styles.usageHeader}>
                  <span>Storage</span>
                  <span className={styles.usageNumbers}>
                    {formatBytes(usageStats.storage.usedBytes)} / {formatBytes(usageStats.storage.quotaBytes)}
                  </span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.min(usageStats.storage.percentage, 100)}%`,
                      backgroundColor: usageStats.storage.percentage > 90 ? '#ef4444' :
                                     usageStats.storage.percentage > 75 ? '#f59e0b' : '#10b981',
                    }}
                  />
                </div>
                <p className={styles.usageDetail}>
                  {formatBytes(usageStats.storage.remainingBytes)} available
                </p>
              </div>
            )}

            {!isPro && (
              <div className={styles.upgradePrompt}>
                <p>Upgrade to Sage Pro to unlock:</p>
                <ul>
                  <li>5,000 questions per month</li>
                  <li>1 GB storage for uploads</li>
                  <li>All subjects (Science & Humanities)</li>
                  <li>Priority support</li>
                </ul>
                <Button
                  variant="primary"
                  onClick={handleStartTrial}
                  fullWidth
                >
                  Upgrade to Pro
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Billing History */}
        {subscription && subscription.stripe_customer_id && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Billing Information</h2>
            <div className={styles.billingInfo}>
              <div className={styles.billingRow}>
                <span>Next billing date</span>
                <span>{formatDate(subscription.current_period_end)}</span>
              </div>
              {subscription.trial_end && subscription.status === 'trialing' && (
                <div className={styles.billingRow}>
                  <span>Trial ends</span>
                  <span>{formatDate(subscription.trial_end)}</span>
                </div>
              )}
              <div className={styles.billingRow}>
                <span>Subscription started</span>
                <span>{formatDate(subscription.created_at)}</span>
              </div>
            </div>
            <div className={styles.cardActions}>
              <Button
                variant="secondary"
                onClick={handleManageSubscription}
                fullWidth
              >
                View Invoices & Payment Methods
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
