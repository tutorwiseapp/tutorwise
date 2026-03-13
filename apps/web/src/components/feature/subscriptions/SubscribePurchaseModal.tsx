/**
 * Filename: SubscribePurchaseModal.tsx
 * Purpose: Modal for subscribing to a subscription listing
 * Created: 2026-02-24
 *
 * Displays subscription details and handles Stripe checkout for recurring billing.
 */

'use client';

import { useState } from 'react';
import type { Listing } from '@tutorwise/shared-types';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import styles from './SubscribePurchaseModal.module.css';

interface SubscribePurchaseModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscribePurchaseModal({ listing, isOpen, onClose }: SubscribePurchaseModalProps) {
  const router = useRouter();
  const { user } = useUserProfile();
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse subscription config
  const config = (listing as any).subscription_config || {};
  const pricePerMonth = config.price_per_month_pence
    ? (config.price_per_month_pence / 100).toFixed(2)
    : '0.00';
  const frequency = config.frequency || 'weekly';
  const sessionDuration = config.session_duration_minutes || 60;
  const termTimeOnly = config.term_time_only || false;
  const sessionLimit = config.session_limit_per_period;

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      router.push(`/login?redirect=/listings/${listing.id}`);
      return;
    }

    setIsProcessing(true);
    try {
      // Call subscription API
      const response = await fetch('/api/listings/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create subscription');
      }

      const data = await response.json();

      // TODO: Integrate Stripe Checkout for subscription billing
      // For now, just redirect to subscription management
      toast.success('Subscription activated! Redirecting to payment...');

      // In production, this would redirect to Stripe Checkout:
      // const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      // await stripe.redirectToCheckout({ sessionId: data.stripe_session_id });

      // For now, redirect to subscriptions page
      setTimeout(() => {
        router.push('/subscriptions/manage');
      }, 1500);

    } catch (error) {
      console.error('Subscribe error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to subscribe');
    } finally {
      setIsProcessing(false);
    }
  };

  const frequencyDisplay = frequency === 'daily'
    ? 'Daily'
    : frequency === 'weekly'
    ? 'Weekly'
    : 'Fortnightly';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Subscribe to {listing.title}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {/* Subscription Details */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Subscription Details</h3>
            <div className={styles.detailGrid}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Frequency</span>
                <span className={styles.detailValue}>{frequencyDisplay} sessions</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Session Duration</span>
                <span className={styles.detailValue}>{sessionDuration} minutes</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Term Time Only</span>
                <span className={styles.detailValue}>{termTimeOnly ? 'Yes' : 'No'}</span>
              </div>
              {sessionLimit && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Sessions per month</span>
                  <span className={styles.detailValue}>{sessionLimit} sessions</span>
                </div>
              )}
            </div>
          </div>

          {/* Subject & Level */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>What's Included</h3>
            <div className={styles.includedList}>
              <div className={styles.includedItem}>
                <span className={styles.includedIcon}>📚</span>
                <span>Subjects: {listing.subjects?.join(', ')}</span>
              </div>
              {listing.levels && listing.levels.length > 0 && (
                <div className={styles.includedItem}>
                  <span className={styles.includedIcon}>🎓</span>
                  <span>Levels: {listing.levels?.join(', ')}</span>
                </div>
              )}
              <div className={styles.includedItem}>
                <span className={styles.includedIcon}>💻</span>
                <span>
                  Delivery: {listing.delivery_mode?.map(mode =>
                    mode === 'online' ? 'Online' :
                    mode === 'in_person' ? 'In Person' :
                    mode === 'hybrid' ? 'Hybrid' : mode
                  ).join(', ')}
                </span>
              </div>
              <div className={styles.includedItem}>
                <span className={styles.includedIcon}>🔄</span>
                <span>Recurring {frequencyDisplay.toLowerCase()} sessions</span>
              </div>
              {sessionLimit && (
                <div className={styles.includedItem}>
                  <span className={styles.includedIcon}>📅</span>
                  <span>{sessionLimit} sessions per billing period</span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className={styles.pricingSection}>
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Monthly Price</span>
              <span className={styles.price}>£{pricePerMonth}/month</span>
            </div>
            <p className={styles.priceNote}>
              Cancel anytime. Billed monthly. {termTimeOnly && 'Paused during school holidays.'}
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            className={styles.subscribeButton}
            onClick={handleSubscribe}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : `Subscribe for £${pricePerMonth}/month`}
          </button>
        </div>
      </div>
    </div>
  );
}
