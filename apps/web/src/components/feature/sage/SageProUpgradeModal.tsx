/**
 * Sage Pro Upgrade Modal
 *
 * Shows "Under Development" modal when user tries to upgrade to Sage Pro.
 * Future: Will integrate with Stripe for actual subscriptions.
 *
 * @module components/feature/sage/SageProUpgradeModal
 */

'use client';

import React from 'react';
import styles from './SageProUpgradeModal.module.css';

interface SageProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SageProUpgradeModal({ isOpen, onClose }: SageProUpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Modal */}
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Upgrade to Sage Pro</h2>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {/* Pricing */}
          <div className={styles.pricing}>
            <div className={styles.price}>£10</div>
            <div className={styles.period}>per month</div>
          </div>

          {/* Features */}
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.checkmark}>✓</div>
              <span>5,000 AI tutoring questions per month</span>
            </div>
            <div className={styles.feature}>
              <div className={styles.checkmark}>✓</div>
              <span>Access to all learning materials</span>
            </div>
            <div className={styles.feature}>
              <div className={styles.checkmark}>✓</div>
              <span>Progress tracking and insights</span>
            </div>
            <div className={styles.feature}>
              <div className={styles.checkmark}>✓</div>
              <span>Personalized study support</span>
            </div>
          </div>

          {/* Under Development Notice */}
          <div className={styles.notice}>
            <div className={styles.noticeIcon}>ℹ</div>
            <div className={styles.noticeText}>
              <strong>This feature is under development.</strong>
              <p>We'll notify you when Sage Pro launches!</p>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button disabled className={styles.subscribeButton}>
              Subscribe (Coming Soon)
            </button>
            <button onClick={onClose} className={styles.cancelButton}>
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
