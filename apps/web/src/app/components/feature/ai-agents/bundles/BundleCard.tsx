/**
 * Filename: BundleCard.tsx
 * Purpose: Display bundle pricing card with purchase option
 * Created: 2026-02-24
 * Phase: 3C - Bundle Pricing
 *
 * Shows bundle details, savings calculation, and purchase button.
 */

'use client';

import { useState } from 'react';
import styles from './BundleCard.module.css';

interface Bundle {
  id: string;
  bundle_name: string;
  ai_sessions_count: number;
  human_sessions_count: number;
  total_price_pence: number;
  description?: string;
  badge_text?: string;
  valid_days?: number;
}

interface BundleCardProps {
  bundle: Bundle;
  aiSessionPrice?: number; // Price per AI session in pence
  humanSessionPrice?: number; // Price per human session in pence
  onPurchase: (bundleId: string) => void;
  isPurchasing?: boolean;
}

export default function BundleCard({
  bundle,
  aiSessionPrice = 1000, // Default £10 per AI session
  humanSessionPrice = 3000, // Default £30 per human session
  onPurchase,
  isPurchasing = false
}: BundleCardProps) {
  // Calculate savings
  const regularPrice = (bundle.ai_sessions_count * aiSessionPrice) + (bundle.human_sessions_count * humanSessionPrice);
  const savings = regularPrice - bundle.total_price_pence;
  const savingsPercentage = Math.round((savings / regularPrice) * 100);

  const bundlePrice = (bundle.total_price_pence / 100).toFixed(2);

  return (
    <div className={styles.card}>
      {/* Badge */}
      {bundle.badge_text && (
        <div className={styles.badge}>{bundle.badge_text}</div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>{bundle.bundle_name}</h3>
        {savings > 0 && (
          <div className={styles.savingsTag}>
            Save {savingsPercentage}%
          </div>
        )}
      </div>

      {/* Description */}
      {bundle.description && (
        <p className={styles.description}>{bundle.description}</p>
      )}

      {/* Sessions Breakdown */}
      <div className={styles.breakdown}>
        {bundle.ai_sessions_count > 0 && (
          <div className={styles.sessionRow}>
            <span className={styles.sessionIcon}>🤖</span>
            <span className={styles.sessionText}>
              {bundle.ai_sessions_count} AI {bundle.ai_sessions_count === 1 ? 'Session' : 'Sessions'}
            </span>
          </div>
        )}
        {bundle.human_sessions_count > 0 && (
          <div className={styles.sessionRow}>
            <span className={styles.sessionIcon}>👤</span>
            <span className={styles.sessionText}>
              {bundle.human_sessions_count} Human {bundle.human_sessions_count === 1 ? 'Session' : 'Sessions'}
            </span>
          </div>
        )}
      </div>

      {/* Validity Period */}
      {bundle.valid_days && (
        <div className={styles.validity}>
          <span className={styles.validityIcon}>📅</span>
          <span>Valid for {bundle.valid_days} days after purchase</span>
        </div>
      )}

      {/* Pricing */}
      <div className={styles.pricing}>
        <div className={styles.price}>
          <span className={styles.currency}>£</span>
          <span className={styles.amount}>{bundlePrice}</span>
        </div>
        {savings > 0 && (
          <div className={styles.savings}>
            Save £{(savings / 100).toFixed(2)}
          </div>
        )}
      </div>

      {/* Purchase Button */}
      <button
        className={styles.purchaseButton}
        onClick={() => onPurchase(bundle.id)}
        disabled={isPurchasing}
      >
        {isPurchasing ? 'Processing...' : 'Purchase Bundle'}
      </button>
    </div>
  );
}
