/**
 * Filename: OrganisationHelpWidget.tsx
 * Purpose: Organisation Subscription Management Widget
 * Created: 2025-12-03
 * Updated: 2026-01-07 - Added trial countdown timer, removed tips (moved to OrganisationTipWidget)
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
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import { getTrialStatus } from '@/lib/stripe/organisation-trial-status';
import type { OrganisationSubscription } from '@/lib/stripe/subscription-utils';
import styles from './OrganisationHelpWidget.module.css';

interface OrganisationHelpWidgetProps {
  onSubscribeClick?: () => void;
  subscription?: OrganisationSubscription | null;
  onManageSubscription?: () => void;
  onUpdatePayment?: () => void;
  onCancelSubscription?: () => void;
}

export default function OrganisationHelpWidget({
  onSubscribeClick,
  subscription,
  onManageSubscription,
  onUpdatePayment,
  onCancelSubscription,
}: OrganisationHelpWidgetProps) {
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

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Managing Your Organisation</h3>
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
              if (subscription && subscription.status === 'active') {
                onManageSubscription?.();
              } else {
                onSubscribeClick?.();
              }
            }}
            className={styles.subscribeButton}
          >
            {subscription && subscription.status === 'active' ? 'Manage Subscription' : 'Subscribe Now'}
          </button>
        </div>

        {/* Pricing Info */}
        <p className={styles.pricingInfo}>
          Subscription: £50/month after trial
        </p>

        {/* Divider */}
        <div className={styles.divider}></div>

        {/* Secondary Actions */}
        <div className={styles.secondaryActions}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onUpdatePayment?.();
            }}
            className={styles.secondaryLink}
          >
            Update Payment Method
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onCancelSubscription?.();
            }}
            className={styles.secondaryLink}
          >
            Cancel Subscription
          </a>
        </div>
      </div>
    </HubComplexCard>
  );
}
