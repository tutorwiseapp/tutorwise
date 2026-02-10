/**
 * Filename: SubscriptionRequired.tsx
 * Purpose: Block UI for organisation users without active subscription
 * Created: 2025-12-15
 * Version: v8.0 - Feature Flag Integration & Smart Dismissal
 * Updated: 2025-12-17 - Added configurable trial days, smart dismissal, and export functionality
 *
 * This component displays when a user tries to access organisation features
 * without an active Premium subscription (configurable via feature flags)
 *
 * Smart Popup Logic:
 * - Days 1-10: No popup (silent trial)
 * - Days 11-13 (3-1 days left): Show once per day, dismissible with "X" button
 * - Day 14+ (expired): Show always, non-dismissible
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Check, X } from 'lucide-react';
import Button from '@/app/components/ui/actions/Button';
import type { OrganisationSubscription } from '@/lib/stripe/subscription-utils';
import { FEATURES, getFormattedPrice } from '@/config/organisation-features';
import styles from './SubscriptionRequired.module.css';

interface SubscriptionRequiredProps {
  organisation: {
    id: string;
    name: string;
  };
  subscription: OrganisationSubscription | null;
  onStartTrial: () => void;
  onDismiss?: () => void; // Optional dismiss handler for trial reminders
  onExportData?: () => void; // Optional export handler
  isLoading?: boolean;
  canDismiss?: boolean; // Can user dismiss this modal?
}

export default function SubscriptionRequired({
  organisation: _organisation,
  subscription,
  onStartTrial,
  onDismiss,
  onExportData,
  isLoading = false,
  canDismiss = false,
}: SubscriptionRequiredProps) {
  const router = useRouter();

  // Get trial days from feature flags
  const trialDays = FEATURES.SUBSCRIPTION_PAYWALL.trialDays;
  const formattedPrice = getFormattedPrice();

  // Determine message based on subscription status
  const getStatusMessage = () => {
    if (!subscription) {
      return {
        title: `Start Your ${trialDays}-Day Free Trial`,
        description: 'Get full access to Organisation Premium features with no credit card required.',
        ctaText: 'Start Free Trial',
        showFeatures: true,
      };
    }

    if (subscription.status === 'canceled') {
      return {
        title: 'Subscription Canceled',
        description: `Your subscription was canceled on ${new Date(subscription.canceled_at!).toLocaleDateString()}. Reactivate to continue using Premium features.`,
        ctaText: 'Reactivate Subscription',
        showFeatures: false,
      };
    }

    if (subscription.status === 'past_due') {
      return {
        title: 'Payment Failed',
        description: 'Your last payment failed. Please update your payment method to continue using Premium features.',
        ctaText: 'Update Payment Method',
        showFeatures: false,
      };
    }

    if (subscription.status === 'unpaid') {
      return {
        title: 'Subscription Unpaid',
        description: 'Your subscription has been suspended due to unpaid invoices. Please contact support.',
        ctaText: 'Contact Support',
        showFeatures: false,
      };
    }

    return {
      title: 'Premium Subscription Required',
      description: 'Activate Organisation Premium to access team management and analytics.',
      ctaText: 'Start Free Trial',
      showFeatures: true,
    };
  };

  const status = getStatusMessage();

  const handleCTAClick = () => {
    if (subscription?.status === 'past_due') {
      // Redirect to billing portal to update payment method
      router.push('/api/stripe/billing-portal');
    } else if (subscription?.status === 'unpaid') {
      // Redirect to support
      router.push('/support');
    } else {
      // Start trial
      onStartTrial();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Close button (X) - only show if dismissible */}
        {canDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className={styles.closeButton}
            aria-label="Dismiss reminder"
          >
            <X size={20} />
          </button>
        )}

        <div className={styles.iconContainer}>
          <Sparkles size={48} className={styles.icon} />
        </div>

        <h2 className={styles.title}>{status.title}</h2>
        <p className={styles.description}>{status.description}</p>

        {status.showFeatures && (
          <div className={styles.features}>
            <div className={styles.feature}>
              <Check size={20} className={styles.checkIcon} />
              <span>{trialDays}-day free trial (no credit card required)</span>
            </div>
            <div className={styles.feature}>
              <Check size={20} className={styles.checkIcon} />
              <span>Unlimited team members</span>
            </div>
            <div className={styles.feature}>
              <Check size={20} className={styles.checkIcon} />
              <span>Client aggregation and analytics</span>
            </div>
            <div className={styles.feature}>
              <Check size={20} className={styles.checkIcon} />
              <span>Commission management</span>
            </div>
            <div className={styles.feature}>
              <Check size={20} className={styles.checkIcon} />
              <span>Performance analytics dashboard</span>
            </div>
            <div className={styles.feature}>
              <Check size={20} className={styles.checkIcon} />
              <span>Member verification tracking</span>
            </div>
          </div>
        )}

        <div className={styles.pricing}>
          <span className={styles.price}>{formattedPrice}</span>
          <span className={styles.period}>/month</span>
        </div>

        {/* Action buttons */}
        <div className={styles.actionButtons}>
          <Button
            onClick={handleCTAClick}
            variant="primary"
            fullWidth
            disabled={isLoading}
            className={styles.ctaButton}
          >
            {isLoading ? 'Loading...' : status.ctaText}
          </Button>

          {/* Export button - show during trial expiry reminders */}
          {onExportData && (
            <Button
              onClick={onExportData}
              variant="secondary"
              fullWidth
              className={styles.exportButton}
            >
              Export My Data (CSV)
            </Button>
          )}
        </div>

        {!subscription && (
          <p className={styles.trialNote}>
            Start your free trial today. Cancel anytime during the trial period.
          </p>
        )}
      </div>
    </div>
  );
}
