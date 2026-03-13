'use client';

/**
 * Filename: GrowthSubscriptionWidget.tsx
 * Purpose: Growth Pro subscription status widget for main Growth page sidebar
 * Pattern: Mirrors SageSubscriptionWidget — indigo theme
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import HubComplexCard from '@/components/hub/sidebar/cards/HubComplexCard';
import type { GrowthProSubscription } from '@/lib/stripe/growth-pro-subscription';
import styles from './GrowthSubscriptionWidget.module.css';

interface GrowthSubscriptionWidgetProps {
  subscription?: GrowthProSubscription | null;
}

export default function GrowthSubscriptionWidget({ subscription }: GrowthSubscriptionWidgetProps) {
  const router = useRouter();

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleButtonClick = () => router.push('/growth/billing');

  const isPro = subscription &&
    (subscription.status === 'active' || subscription.status === 'past_due');

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Growth Pro</h3>
      <div className={styles.content}>
        {isPro ? (
          <div className={`${styles.statusBox} ${subscription.status === 'past_due' ? styles.pastDueAlert : styles.activeAlert}`}>
            <p className={styles.statusTitle}>
              {subscription.status === 'past_due' ? 'Payment Due' : 'Pro Active'}
            </p>
            <p className={styles.statusText}>
              {subscription.cancel_at_period_end
                ? `Ends: ${formatDate(new Date(subscription.current_period_end))}`
                : `Renews: ${formatDate(new Date(subscription.current_period_end))}`}
            </p>
            <p className={styles.statusText}>
              {subscription.questions_used_this_period ?? 0} / {subscription.questions_limit ?? 5000} questions used
            </p>
          </div>
        ) : (
          <div className={`${styles.statusBox} ${styles.neutralAlert}`}>
            <p className={styles.statusTitle}>Free Tier</p>
            <p className={styles.statusText}>10 questions per day</p>
            <p className={styles.statusText}>Upgrade for 5,000/month</p>
          </div>
        )}

        <div className={styles.subscriptionActions}>
          <button onClick={handleButtonClick} className={styles.subscribeButton}>
            {isPro ? 'Manage Subscription' : 'Upgrade to Pro'}
          </button>
        </div>

        <p className={styles.pricingInfo}>Pro: £10/month • 5,000 questions</p>
      </div>
    </HubComplexCard>
  );
}
