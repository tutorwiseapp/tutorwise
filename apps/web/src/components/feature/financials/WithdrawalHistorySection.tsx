/*
 * Filename: WithdrawalHistorySection.tsx
 * Purpose: Display withdrawal history with status tracking
 * Created: 2026-02-07
 * Specification: Financials UI Enhancement - Withdrawal tracking
 */
'use client';

import React, { useState, useMemo } from 'react';
import { Transaction } from '@/types';
import { ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import styles from './WithdrawalHistorySection.module.css';

interface WithdrawalHistorySectionProps {
  transactions: Transaction[];
}

export default function WithdrawalHistorySection({ transactions }: WithdrawalHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter for withdrawal transactions only
  const withdrawals = useMemo(() => {
    return transactions
      .filter((txn) => txn.type === 'Withdrawal')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10); // Show last 10 withdrawals
  }, [transactions]);

  if (withdrawals.length === 0) {
    return null; // Don't show section if no withdrawals
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid_out':
        return <CheckCircle size={16} className={styles.iconSuccess} />;
      case 'clearing':
        return <Clock size={16} className={styles.iconPending} />;
      case 'failed':
      case 'disputed':
        return <XCircle size={16} className={styles.iconError} />;
      default:
        return <Clock size={16} className={styles.iconPending} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid_out':
        return 'Completed';
      case 'clearing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      case 'disputed':
        return 'Disputed';
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'paid_out':
        return styles.statusSuccess;
      case 'clearing':
        return styles.statusPending;
      case 'failed':
      case 'disputed':
        return styles.statusError;
      default:
        return styles.statusPending;
    }
  };

  return (
    <div className={styles.historySection}>
      <button
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className={styles.title}>Withdrawal History</h3>
        <div className={styles.headerRight}>
          <span className={styles.count}>{withdrawals.length} withdrawal{withdrawals.length !== 1 ? 's' : ''}</span>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {isExpanded && (
        <div className={styles.withdrawalsList}>
          {withdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className={styles.withdrawalItem}>
              <div className={styles.withdrawalHeader}>
                <div className={styles.withdrawalInfo}>
                  <span className={styles.withdrawalAmount}>
                    £{Math.abs(withdrawal.amount).toFixed(2)}
                  </span>
                  <span className={styles.withdrawalDate}>
                    {new Date(withdrawal.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className={`${styles.statusBadge} ${getStatusClass(withdrawal.status)}`}>
                  {getStatusIcon(withdrawal.status)}
                  <span>{getStatusLabel(withdrawal.status)}</span>
                </div>
              </div>

              {withdrawal.description && (
                <p className={styles.withdrawalDescription}>{withdrawal.description}</p>
              )}

              {withdrawal.stripe_payout_id && (
                <div className={styles.withdrawalMeta}>
                  <span className={styles.metaLabel}>Stripe Payout ID:</span>
                  <a
                    href={`https://dashboard.stripe.com/connect/payouts/${withdrawal.stripe_payout_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.stripeLink}
                  >
                    {withdrawal.stripe_payout_id.substring(0, 20)}...
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {withdrawal.status === 'clearing' && withdrawal.available_at && (
                <p className={styles.estimatedArrival}>
                  Estimated arrival: {new Date(withdrawal.available_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
          ))}

          {withdrawals.length === 10 && (
            <p className={styles.footerNote}>
              Showing last 10 withdrawals. View all transactions for complete history.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
