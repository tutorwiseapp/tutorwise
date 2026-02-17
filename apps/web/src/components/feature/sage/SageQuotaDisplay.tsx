/**
 * Sage Quota Display Component
 *
 * Shows user's current usage quota and encourages upgrade when approaching/hitting limit.
 * Displays:
 * - Free tier: "7/10 questions today"
 * - Pro tier: "147/5,000 questions this month"
 * - Warning state when approaching limit
 * - Upgrade CTA when limit reached
 *
 * @module components/feature/sage/SageQuotaDisplay
 */

'use client';

import React from 'react';
import styles from './SageQuotaDisplay.module.css';

export interface QuotaInfo {
  tier: 'free' | 'sage_pro';
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
}

interface SageQuotaDisplayProps {
  quota?: QuotaInfo;
  onUpgradeClick?: () => void;
}

export function SageQuotaDisplay({ quota, onUpgradeClick }: SageQuotaDisplayProps) {
  if (!quota) {
    return null;
  }

  const { tier, limit, used, remaining, resetAt } = quota;
  const percentage = (used / limit) * 100;
  const isWarning = remaining <= 2 && remaining > 0;
  const isLimit = remaining === 0;
  const isPro = tier === 'sage_pro';

  // Format reset time
  const resetDate = new Date(resetAt);
  const now = new Date();
  const hoursUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  const daysUntilReset = Math.ceil(hoursUntilReset / 24);

  let resetText = '';
  if (isPro) {
    const monthName = resetDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    resetText = `Resets ${monthName}`;
  } else {
    if (hoursUntilReset < 24) {
      resetText = `Resets in ${hoursUntilReset}h`;
    } else {
      resetText = `Resets in ${daysUntilReset}d`;
    }
  }

  // Determine badge color
  let badgeClass = styles.badgeNormal;
  if (isLimit) {
    badgeClass = styles.badgeLimit;
  } else if (isWarning) {
    badgeClass = styles.badgeWarning;
  }

  return (
    <div className={styles.container}>
      {/* Quota Badge */}
      <div className={`${styles.badge} ${badgeClass}`}>
        <div className={styles.quotaText}>
          <span className={styles.used}>{used}</span>
          <span className={styles.separator}>/</span>
          <span className={styles.limit}>{limit}</span>
          <span className={styles.period}>
            {isPro ? ' this month' : ' today'}
          </span>
        </div>
        {isPro && <span className={styles.proBadge}>Pro</span>}
      </div>

      {/* Reset time */}
      <div className={styles.resetText}>{resetText}</div>

      {/* Warning/Limit message */}
      {isWarning && !isPro && (
        <div className={styles.warningMessage}>
          <span className={styles.warningIcon}>⚠</span>
          <span>{remaining} questions left</span>
          {onUpgradeClick && (
            <button onClick={onUpgradeClick} className={styles.upgradeLink}>
              Upgrade
            </button>
          )}
        </div>
      )}

      {isLimit && (
        <div className={styles.limitMessage}>
          <span className={styles.limitIcon}>🚫</span>
          <span>Limit reached</span>
          {!isPro && onUpgradeClick && (
            <button onClick={onUpgradeClick} className={styles.upgradeButton}>
              Upgrade to Pro
            </button>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div
          className={`${styles.progressFill} ${badgeClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
