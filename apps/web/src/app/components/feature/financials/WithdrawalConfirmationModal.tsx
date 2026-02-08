/*
 * Filename: WithdrawalConfirmationModal.tsx
 * Purpose: Confirmation modal for withdrawal requests
 * Created: 2026-02-07
 * Specification: Financials UI Enhancement - Functional withdrawal flow
 */
'use client';

import React, { useState } from 'react';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import { AlertCircle, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './WithdrawalConfirmationModal.module.css';

interface WithdrawalConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  onWithdrawalComplete: () => void;
}

export default function WithdrawalConfirmationModal({
  isOpen,
  onClose,
  availableBalance,
  onWithdrawalComplete
}: WithdrawalConfirmationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmWithdrawal = async () => {
    if (availableBalance <= 0) {
      toast.error('No available balance to withdraw');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/financials/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: availableBalance
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          toast.error(data.message || 'You already have a withdrawal in progress');
        } else if (response.status === 400) {
          toast.error(data.message || 'Invalid withdrawal request');
        } else {
          toast.error(data.message || 'Failed to process withdrawal');
        }
        return;
      }

      toast.success('Withdrawal request submitted successfully! Funds will be transferred to your Stripe Connect account.');
      onWithdrawalComplete();
      onClose();
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Withdrawal"
    >
      <div className={styles.modalContent}>
        {/* Available Balance Display */}
        <div className={styles.balanceSection}>
          <DollarSign size={48} className={styles.dollarIcon} />
          <div className={styles.amountDisplay}>
            <span className={styles.amountLabel}>Available Balance</span>
            <span className={styles.amountValue}>£{availableBalance.toFixed(2)}</span>
          </div>
        </div>

        {/* Information Alert */}
        <div className={styles.infoAlert}>
          <AlertCircle size={18} />
          <div className={styles.infoText}>
            <p className={styles.infoTitle}>Withdrawal Details</p>
            <ul className={styles.infoList}>
              <li>Funds will be transferred to your Stripe Connect account</li>
              <li>Processing typically takes 2-3 business days</li>
              <li>You'll receive an email confirmation once processed</li>
              <li>Only one withdrawal request can be active at a time</li>
            </ul>
          </div>
        </div>

        {/* Warning for low balance */}
        {availableBalance > 0 && availableBalance < 10 && (
          <div className={styles.warningAlert}>
            <AlertCircle size={18} />
            <span>Minimum withdrawal amount is typically £10. Please check with your payment provider.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.buttonGroup}>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            fullWidth
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmWithdrawal}
            disabled={isSubmitting || availableBalance <= 0}
            fullWidth
          >
            {isSubmitting ? 'Processing...' : `Withdraw £${availableBalance.toFixed(2)}`}
          </Button>
        </div>

        {/* No balance warning */}
        {availableBalance <= 0 && (
          <p className={styles.noBalanceMessage}>
            You have no available balance to withdraw. Funds become available 7 days after session completion.
          </p>
        )}
      </div>
    </HubComplexModal>
  );
}
