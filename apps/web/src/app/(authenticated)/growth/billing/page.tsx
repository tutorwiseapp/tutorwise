/**
 * Filename: apps/web/src/app/(authenticated)/growth/billing/page.tsx
 * Purpose: Growth Pro billing & subscription management
 * Route: /growth/billing
 * Created: 2026-03-05
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';

type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid';

interface GrowthSubscription {
  status: SubscriptionStatus;
  current_period_end: string;
  cancel_at_period_end: boolean;
  questions_used_this_period: number;
  questions_limit: number;
  price_per_month: number;
}

async function fetchSubscription(): Promise<GrowthSubscription | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('growth_pro_subscriptions')
    .select('status, current_period_end, cancel_at_period_end, questions_used_this_period, questions_limit, price_per_month')
    .eq('user_id', user.id)
    .single();

  return data as GrowthSubscription | null;
}

export default function GrowthBillingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['growth-subscription'],
    queryFn: fetchSubscription,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
  });

  const isPro = subscription && (subscription.status === 'active' || subscription.status === 'past_due');

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/growth/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('[Growth Billing] Checkout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!isPro) {
      handleSubscribe();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/growth/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('[Growth Billing] Portal error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Growth Billing"
          subtitle="Manage your Growth Pro subscription"
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'chat', label: 'Chat', href: '/growth' },
            { id: 'billing', label: 'Billing', active: true },
          ]}
          onTabChange={(tabId) => {
            if (tabId !== 'billing') router.push(`/growth`);
          }}
        />
      }
      sidebar={
        <HubSidebar>
          <div className={styles.infoWidget}>
            <div className={styles.widgetTitle}>Growth Pro</div>
            <div className={styles.price}>£10<span>/month</span></div>
            <ul className={styles.featureList}>
              <li>5,000 questions/month</li>
              <li>Role-adaptive advisor</li>
              <li>Revenue audit tool</li>
              <li>Pricing benchmarks</li>
              <li>Referral strategy coaching</li>
              <li>Business setup guidance</li>
            </ul>
          </div>
          <div className={styles.infoWidget}>
            <div className={styles.widgetTitle}>Free Tier</div>
            <ul className={styles.featureList}>
              <li>10 questions/day</li>
              <li>No subscription needed</li>
            </ul>
          </div>
        </HubSidebar>
      }
    >
      <div className={styles.content}>
        {subLoading ? (
          <div className={styles.loading}>Loading subscription details...</div>
        ) : (
          <>
            {/* Current subscription status */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Current Plan</h2>

              {isPro ? (
                <div className={styles.activePlan}>
                  <div className={styles.planBadge}>Growth Pro</div>
                  <p className={styles.planDescription}>
                    {subscription?.cancel_at_period_end
                      ? `Your subscription will end on ${periodEnd}. You have full access until then.`
                      : `Your subscription renews on ${periodEnd}.`}
                  </p>
                  <div className={styles.usageRow}>
                    <span>Questions used this period</span>
                    <strong>
                      {subscription?.questions_used_this_period ?? 0} / {subscription?.questions_limit ?? 5000}
                    </strong>
                  </div>
                  <div className={styles.usageBar}>
                    <div
                      className={styles.usageFill}
                      style={{
                        width: `${Math.min(((subscription?.questions_used_this_period ?? 0) / (subscription?.questions_limit ?? 5000)) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <div className={styles.actions}>
                    <Button variant="secondary" size="sm" onClick={handleManageSubscription} disabled={isLoading}>
                      {isLoading ? 'Loading...' : 'Manage Subscription'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.freePlan}>
                  <div className={styles.planBadge} data-tier="free">Free</div>
                  <p className={styles.planDescription}>
                    10 free questions per day — upgrade for 5,000/month and full features.
                  </p>
                  <div className={styles.upgradeSection}>
                    <Button variant="primary" size="md" onClick={handleSubscribe} disabled={isLoading}>
                      {isLoading ? 'Redirecting to Stripe...' : 'Upgrade to Growth Pro · £10/month'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* What&apos;s included */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>What&apos;s included in Growth Pro</h2>
              <div className={styles.featureGrid}>
                <div className={styles.feature}>
                  <div className={styles.featureTitle}>5,000 questions/month</div>
                  <div className={styles.featureDesc}>Ask as much as you need without hitting daily limits</div>
                </div>
                <div className={styles.feature}>
                  <div className={styles.featureTitle}>Role-adaptive AI advisor</div>
                  <div className={styles.featureDesc}>Personalised advice for tutors, agents, clients and organisations</div>
                </div>
                <div className={styles.feature}>
                  <div className={styles.featureTitle}>Live metrics context</div>
                  <div className={styles.featureDesc}>Growth knows your income, students, and referrals — no re-explaining</div>
                </div>
                <div className={styles.feature}>
                  <div className={styles.featureTitle}>Revenue Audit</div>
                  <div className={styles.featureDesc}>Identify missed income streams and get a score on your current setup</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </HubPageLayout>
  );
}
