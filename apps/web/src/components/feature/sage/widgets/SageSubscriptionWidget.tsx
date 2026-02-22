/**
 * Filename: SageSubscriptionWidget.tsx
 * Purpose: Sage Pro Subscription Management Widget for main Sage page sidebar
 * Created: 2026-02-22
 * Pattern: Adapted from OrganisationHelpWidget.tsx
 *
 * Displays:
 * - Free tier status (10 questions/day for non-subscribers)
 * - Pro subscription status (active/canceled)
 * - Next billing date and billing action
 * - Upgrade/Manage subscription button
 *
 * Note: No trial period - users upgrade directly from free tier to Pro
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import type { SageProSubscription } from '@/lib/stripe/sage-pro-subscription-utils';
import styles from './SageSubscriptionWidget.module.css';

interface SageSubscriptionWidgetProps {
  subscription?: SageProSubscription | null;
  onManageSubscription?: () => void;
}

export default function SageSubscriptionWidget({
  subscription,
  onManageSubscription,
}: SageSubscriptionWidgetProps) {
  const router = useRouter();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Handle button click - either use provided handler or navigate to billing page
  const handleButtonClick = () => {
    if (onManageSubscription) {
      onManageSubscription();
    } else {
      router.push('/sage/billing');
    }
  };

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Managing AI Tutor</h3>
      <div className={styles.content}>
        {/* Always show subscription status */}
        {(() => {
          // Active Pro subscription
          if (subscription && subscription.status === 'active') {
            return (
              <div className={`${styles.statusBox} ${styles.activeAlert}`}>
                <p className={styles.statusTitle}>Pro Active</p>
                <p className={styles.statusText}>
                  Next billing: {subscription.current_period_end ? formatDate(new Date(subscription.current_period_end)) : 'N/A'}
                </p>
                <p className={styles.statusText}>
                  {subscription.cancel_at_period_end ? 'Cancels automatically' : 'Renews automatically'}
                </p>
              </div>
            );
          }

          // Trialing subscription (for existing users only)
          if (subscription && subscription.status === 'trialing') {
            return (
              <div className={`${styles.statusBox} ${styles.infoAlert}`}>
                <p className={styles.statusTitle}>Pro Trial Active</p>
                <p className={styles.statusText}>
                  Trial ends: {subscription.trial_end ? formatDate(new Date(subscription.trial_end)) : 'N/A'}
                </p>
                <p className={styles.statusText}>
                  Unlimited questions during trial
                </p>
              </div>
            );
          }

          // Free tier (no subscription)
          return (
            <div className={`${styles.statusBox} ${styles.neutralAlert}`}>
              <p className={styles.statusTitle}>Free Tier</p>
              <p className={styles.statusText}>10 questions per day</p>
              <p className={styles.statusText}>Upgrade for 5,000/month</p>
            </div>
          );
        })()}

        {/* Primary Action Button */}
        <div className={styles.subscriptionActions}>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleButtonClick();
            }}
            className={styles.subscribeButton}
          >
            {subscription && (subscription.status === 'active' || subscription.status === 'trialing')
              ? 'Manage Subscription'
              : 'Upgrade to Pro'}
          </button>
        </div>

        {/* Pricing Info */}
        <p className={styles.pricingInfo}>
          Pro: £10/month • 5,000 questions
        </p>
      </div>
    </HubComplexCard>
  );
}
