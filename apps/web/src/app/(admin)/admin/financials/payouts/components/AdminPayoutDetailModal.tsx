/**
 * Filename: AdminPayoutDetailModal.tsx
 * Purpose: Admin payout detail modal with full information and actions
 * Created: 2026-02-05
 * Pattern: Follows AdminReferralDetailModal structure with HubDetailModal
 */

'use client';

import React, { useState } from 'react';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal/HubDetailModal/HubDetailModal';
import Button from '@/app/components/ui/actions/Button';
import StatusBadge from '@/app/components/admin/badges/StatusBadge';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { ExternalLink, User, CheckCircle, XCircle } from 'lucide-react';
import styles from './AdminPayoutDetailModal.module.css';

// Extended Payout type for detail modal
export interface PayoutDetail {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  // User info
  profile_id?: string;
  user_email?: string;
  user_name?: string;
  user_avatar_url?: string;
  // Bank details
  bank_account?: string;
  bank_name?: string;
  account_holder_name?: string;
  // Dates
  arrival_date?: string;
  initiated_at?: string;
  completed_at?: string;
  failed_at?: string;
  // Stripe fields
  stripe_payout_id?: string;
  stripe_account_id?: string;
  // Failure details
  failure_code?: string;
  failure_message?: string;
  // Additional context
  description?: string;
  currency?: string;
}

interface AdminPayoutDetailModalProps {
  payout: PayoutDetail;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

// Status variant helper
function getPayoutStatusVariant(status: string) {
  const statusLower = status.toLowerCase();
  if (statusLower === 'paid' || statusLower === 'completed') return 'paid' as const;
  if (statusLower === 'pending') return 'pending' as const;
  if (statusLower === 'in_transit') return 'processing' as const;
  if (statusLower === 'failed') return 'error' as const;
  if (statusLower === 'canceled' || statusLower === 'cancelled') return 'cancelled' as const;
  return 'neutral' as const;
}

export default function AdminPayoutDetailModal({
  payout,
  isOpen,
  onClose,
  onUpdate,
}: AdminPayoutDetailModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Format date helper
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format datetime helper
  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format currency helper
  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  // Action handlers
  const handleViewInStripe = () => {
    const stripeUrl = payout.stripe_payout_id
      ? `https://dashboard.stripe.com/payouts/${payout.stripe_payout_id}`
      : 'https://dashboard.stripe.com/payouts';
    window.open(stripeUrl, '_blank');
  };

  const handleViewUser = () => {
    if (payout.profile_id) {
      window.open(`/admin/accounts/users?id=${payout.profile_id}`, '_blank');
    }
  };

  const handleApprovePayout = async () => {
    if (!confirm('Are you sure you want to approve this payout?')) return;
    setIsProcessing(true);
    try {
      // TODO: Implement payout approval API
      alert('Payout approval functionality to be implemented');
      onUpdate?.();
    } catch (error) {
      alert('Failed to approve payout');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectPayout = async () => {
    if (!confirm('Are you sure you want to reject this payout?')) return;
    setIsProcessing(true);
    try {
      // TODO: Implement payout rejection API
      alert('Payout rejection functionality to be implemented');
      onUpdate?.();
    } catch (error) {
      alert('Failed to reject payout');
    } finally {
      setIsProcessing(false);
    }
  };

  // Section 1: Payout Information
  const payoutInfoFields = [
    {
      label: 'Payout ID',
      value: <span className={styles.idText}>{formatIdForDisplay(payout.id, 'full')}</span>,
    },
    {
      label: 'Status',
      value: (
        <StatusBadge
          variant={getPayoutStatusVariant(payout.status)}
          label={payout.status.replace(/_/g, ' ')}
        />
      ),
    },
    {
      label: 'Amount',
      value: (
        <span className={styles.amountPositive}>
          {formatCurrency(payout.amount, payout.currency)}
        </span>
      ),
    },
    {
      label: 'Currency',
      value: payout.currency || 'GBP',
    },
    {
      label: 'Description',
      value: payout.description || '—',
    },
  ];

  // Section 2: User Information
  const userInfoFields = [
    {
      label: 'Recipient',
      value: (
        <div className={styles.profileDisplay}>
          {payout.user_avatar_url && (
            <img
              src={payout.user_avatar_url}
              alt={payout.user_name || 'User'}
              className={styles.avatar}
            />
          )}
          <span>{payout.user_name || 'Unknown'}</span>
        </div>
      ),
    },
    {
      label: 'Email',
      value: payout.user_email || '—',
    },
    {
      label: 'User ID',
      value: payout.profile_id ? (
        <span className={styles.idText}>{formatIdForDisplay(payout.profile_id)}</span>
      ) : (
        '—'
      ),
    },
  ];

  // Section 3: Bank Account Details
  const bankInfoFields = [
    {
      label: 'Bank Account',
      value: payout.bank_account || '—',
    },
    {
      label: 'Bank Name',
      value: payout.bank_name || '—',
    },
    {
      label: 'Account Holder',
      value: payout.account_holder_name || '—',
    },
  ];

  // Section 4: Timeline
  const timelineFields = [
    {
      label: 'Created At',
      value: formatDateTime(payout.created_at),
    },
    {
      label: 'Initiated At',
      value: formatDateTime(payout.initiated_at),
    },
    {
      label: 'Arrival Date',
      value: formatDate(payout.arrival_date),
    },
    ...(payout.completed_at
      ? [{ label: 'Completed At', value: formatDateTime(payout.completed_at) }]
      : []),
    ...(payout.failed_at
      ? [{ label: 'Failed At', value: formatDateTime(payout.failed_at) }]
      : []),
  ];

  // Section 5: Stripe Information
  const stripeInfoFields = [
    {
      label: 'Stripe Payout ID',
      value: payout.stripe_payout_id ? (
        <span className={styles.idText}>{payout.stripe_payout_id}</span>
      ) : (
        '—'
      ),
    },
    {
      label: 'Stripe Account ID',
      value: payout.stripe_account_id ? (
        <span className={styles.idText}>{payout.stripe_account_id}</span>
      ) : (
        '—'
      ),
    },
  ];

  // Section 6: Failure Details (if failed)
  const failureFields =
    payout.status.toLowerCase() === 'failed'
      ? [
          {
            label: 'Failure Code',
            value: payout.failure_code || '—',
          },
          {
            label: 'Failure Message',
            value: payout.failure_message || '—',
          },
        ]
      : [];

  // Build sections array
  const sections: DetailSection[] = [
    {
      title: 'Payout Information',
      fields: payoutInfoFields,
    },
    {
      title: 'Recipient',
      fields: userInfoFields,
    },
    {
      title: 'Bank Account',
      fields: bankInfoFields,
    },
    {
      title: 'Timeline',
      fields: timelineFields,
    },
    {
      title: 'Stripe Details',
      fields: stripeInfoFields,
    },
    ...(failureFields.length > 0
      ? [
          {
            title: 'Failure Details',
            fields: failureFields,
          },
        ]
      : []),
  ];

  // Modal title and subtitle
  const title = `Payout ${formatIdForDisplay(payout.id)}`;
  const subtitle = `${formatCurrency(payout.amount, payout.currency)} to ${payout.user_name || 'Unknown'}`;

  const isPending = payout.status.toLowerCase() === 'pending';

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      sections={sections}
      actions={
        <div className={styles.actionsWrapper}>
          <Button variant="secondary" onClick={handleViewUser} disabled={!payout.profile_id}>
            <User size={16} className={styles.buttonIcon} />
            View User
          </Button>
          <Button variant="secondary" onClick={handleViewInStripe}>
            <ExternalLink size={16} className={styles.buttonIcon} />
            View in Stripe
          </Button>
          {isPending && (
            <>
              <Button
                variant="primary"
                onClick={handleApprovePayout}
                disabled={isProcessing}
              >
                <CheckCircle size={16} className={styles.buttonIcon} />
                Approve
              </Button>
              <Button
                variant="danger"
                onClick={handleRejectPayout}
                disabled={isProcessing}
              >
                <XCircle size={16} className={styles.buttonIcon} />
                Reject
              </Button>
            </>
          )}
        </div>
      }
    />
  );
}
