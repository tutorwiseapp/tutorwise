/**
 * Filename: SubscriptionRequired.tsx
 * Purpose: Block UI for organisation users without active subscription
 * Created: 2025-12-15
 * Version: v7.0 - Organisation Premium Subscription
 *
 * This component displays when a user tries to access organisation features
 * without an active Premium subscription (£50/month with 14-day trial)
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Check } from 'lucide-react';
import Button from '@/app/components/ui/actions/Button';
import type { OrganisationSubscription } from '@/lib/stripe/subscription-utils';
import styles from './SubscriptionRequired.module.css';

interface SubscriptionRequiredProps {
  organisation: {
    id: string;
    name: string;
  };
  subscription: OrganisationSubscription | null;
  onStartTrial: () => void;
  isLoading?: boolean;
}

export default function SubscriptionRequired({
  organisation,
  subscription,
  onStartTrial,
  isLoading = false,
}: SubscriptionRequiredProps) {
  const router = useRouter();

  // Determine message based on subscription status
  const getStatusMessage = () => {
    if (!subscription) {
      return {
        title: 'Start Your 14-Day Free Trial',
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
        <div className={styles.iconContainer}>
          <Sparkles size={48} className={styles.icon} />
        </div>

        <h2 className={styles.title}>{status.title}</h2>
        <p className={styles.description}>{status.description}</p>

        {status.showFeatures && (
          <div className={styles.features}>
            <div className={styles.feature}>
              <Check size={20} className={styles.checkIcon} />
              <span>14-day free trial (no credit card required)</span>
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
          <span className={styles.price}>£50</span>
          <span className={styles.period}>/month</span>
        </div>

        <Button
          onClick={handleCTAClick}
          variant="primary"
          fullWidth
          disabled={isLoading}
          className={styles.ctaButton}
        >
          {isLoading ? 'Loading...' : status.ctaText}
        </Button>

        {!subscription && (
          <p className={styles.trialNote}>
            Start your free trial today. Cancel anytime during the trial period.
          </p>
        )}
      </div>
    </div>
  );
}
