/**
 * Filename: SageHelpWidget.tsx
 * Purpose: Sage Pro Subscription Management Widget
 * Created: 2026-02-22
 *
 * Displays:
 * - Trial countdown (during 14-day trial period)
 * - Expired trial alert
 * - Subscription status (active/canceled)
 * - Next billing date and billing action
 * - Subscribe/Manage subscription button
 */

'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import type { SageProSubscription } from '@/lib/stripe/sage-pro-subscription-utils';
import styles from './SageHelpWidget.module.css';

interface SageHelpWidgetProps {
  subscription?: SageProSubscription | null;
  onManageSubscription?: () => void;
}

function getTrialStatus(subscription: SageProSubscription | null) {
  if (!subscription || !subscription.trial_end) return null;

  const trialEnd = new Date(subscription.trial_end);
  const now = new Date();
  const diffTime = trialEnd.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    daysRemaining,
    trialEnd,
    isExpired: daysRemaining <= 0,
  };
}

export default function SageHelpWidget({
  subscription,
  onManageSubscription,
}: SageHelpWidgetProps) {
  const router = useRouter();

  const trialStatus = useMemo(() => {
    return getTrialStatus(subscription || null);
  }, [subscription]);

  const formatTrialEndDate = (date: Date) => {
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
      <h3 className={styles.title}>Sage Pro Subscription</h3>
      <div className={styles.content}>
        {/* Always show subscription status */}
        {(() => {
          // Active trial
          if (trialStatus && trialStatus.daysRemaining > 0 && trialStatus.daysRemaining <= 14) {
            return (
              <div
                className={`${styles.statusBox} ${
                  trialStatus.daysRemaining <= 3
                    ? styles.urgentAlert
                    : trialStatus.daysRemaining <= 7
                    ? styles.warningAlert
                    : styles.infoAlert
                }`}
              >
                <p className={styles.statusTitle}>
                  {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? 'day' : 'days'} left in trial
                </p>
                <p className={styles.statusText}>
                  Trial ends {formatTrialEndDate(trialStatus.trialEnd)}
                </p>
              </div>
            );
          }

          // Expired trial
          if (trialStatus && trialStatus.isExpired) {
            return (
              <div className={`${styles.statusBox} ${styles.expiredAlert}`}>
                <p className={styles.statusTitle}>Trial Expired</p>
                <p className={styles.statusText}>Subscribe to restore access</p>
              </div>
            );
          }

          // Active subscription
          if (subscription && subscription.status === 'active') {
            return (
              <div className={`${styles.statusBox} ${styles.activeAlert}`}>
                <p className={styles.statusTitle}>Subscription Active</p>
                <p className={styles.statusText}>
                  Next billing: {subscription.current_period_end ? formatTrialEndDate(new Date(subscription.current_period_end)) : 'N/A'}
                </p>
                <p className={styles.statusText}>
                  {subscription.cancel_at_period_end ? 'Cancels automatically' : 'Renews automatically'}
                </p>
              </div>
            );
          }

          // No subscription (default state)
          return (
            <div className={`${styles.statusBox} ${styles.neutralAlert}`}>
              <p className={styles.statusTitle}>No Active Subscription</p>
              <p className={styles.statusText}>Start your 14-day free trial today</p>
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
            {subscription && subscription.status === 'active' ? 'Manage Subscription' : 'Subscribe Now'}
          </button>
        </div>

        {/* Pricing Info */}
        <p className={styles.pricingInfo}>
          Subscription: £10/month after trial
        </p>
      </div>
    </HubComplexCard>
  );
}
