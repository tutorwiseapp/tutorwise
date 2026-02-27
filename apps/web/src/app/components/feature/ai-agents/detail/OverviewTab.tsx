/**
 * Filename: OverviewTab.tsx
 * Purpose: AI Tutor Overview - Subscription status, basic info, quick actions
 * Created: 2026-02-23
 * Version: v1.0
 */

'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './OverviewTab.module.css';

interface OverviewTabProps {
  aiTutor: any;
  subscription: any;
  shouldPublish?: boolean;
  onRefresh: () => void;
}

export default function OverviewTab({
  aiTutor,
  subscription,
  shouldPublish,
  onRefresh,
}: OverviewTabProps) {
  const [isLoading, setIsLoading] = useState(false);

  const hasSubscription = subscription && subscription.status === 'active';

  // Handle subscribe
  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai-agents/${aiTutor.id}/subscription`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Failed to start subscription');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manage billing
  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai-agents/${aiTutor.id}/billing-portal`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create billing portal session');
      }

      const data = await response.json();

      // Redirect to Stripe Billing Portal
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error('Failed to open billing portal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Subscription Status */}
      <div className={styles.section}>
        <h2>Subscription Status</h2>
        {hasSubscription ? (
          <div className={styles.subscriptionActive}>
            <div className={styles.subscriptionHeader}>
              <span className={styles.statusBadge}>Active</span>
              <span className={styles.price}>£10/month</span>
            </div>
            <div className={styles.subscriptionDetails}>
              <p>
                <strong>Current Period:</strong>{' '}
                {new Date(subscription.current_period_start).toLocaleDateString()} -{' '}
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
              {subscription.cancel_at && (
                <p className={styles.canceling}>
                  Subscription will cancel on{' '}
                  {new Date(subscription.cancel_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button
              onClick={handleManageBilling}
              variant="secondary"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Manage Billing'}
            </Button>
          </div>
        ) : (
          <div className={styles.subscriptionInactive}>
            <div className={styles.pricingCard}>
              <h3>AI Tutor Creator Subscription</h3>
              <div className={styles.pricingAmount}>
                <span className={styles.amount}>£10</span>
                <span className={styles.period}>/month</span>
              </div>
              <ul className={styles.features}>
                <li>Publish AI tutor to marketplace</li>
                <li>1GB storage for materials</li>
                <li>Unlimited URL links</li>
                <li>Full analytics dashboard</li>
                <li>Earn 90% commission on sessions</li>
              </ul>
              <Button
                onClick={handleSubscribe}
                variant="primary"
                disabled={isLoading}
                fullWidth
              >
                {isLoading ? 'Processing...' : 'Subscribe Now'}
              </Button>
            </div>
            {shouldPublish && (
              <div className={styles.publishPrompt}>
                <p>
                  <strong>Ready to publish?</strong> Subscribe now to make your AI tutor available to clients.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Tutor Info */}
      <div className={styles.section}>
        <h2>AI Tutor Information</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Name</span>
            <span className={styles.infoValue}>{aiTutor.display_name}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Subject</span>
            <span className={styles.infoValue}>{aiTutor.subject}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Price per Hour</span>
            <span className={styles.infoValue}>£{aiTutor.price_per_hour}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Status</span>
            <span className={styles.infoValue}>{aiTutor.status}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Skills</span>
            <span className={styles.infoValue}>
              {aiTutor.skills?.length || 0} skills
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Created</span>
            <span className={styles.infoValue}>
              {new Date(aiTutor.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className={styles.description}>
          <h3>Description</h3>
          <p>{aiTutor.description}</p>
        </div>
      </div>

      {/* Quick Actions */}
      {!hasSubscription && (
        <div className={styles.section}>
          <h2>Next Steps</h2>
          <div className={styles.nextSteps}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <div className={styles.stepContent}>
                <h4>Subscribe (£10/month)</h4>
                <p>Activate your AI tutor creator subscription to unlock publishing</p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <div className={styles.stepContent}>
                <h4>Add Materials (Optional)</h4>
                <p>Upload PDFs, DOCX, or PPTX files to train your AI tutor</p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <div className={styles.stepContent}>
                <h4>Publish to Marketplace</h4>
                <p>Make your AI tutor available to clients and start earning</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
