/**
 * Filename: AdminDisputeDetailModal.tsx
 * Purpose: Admin dispute detail modal with full information and actions
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
import { ExternalLink, User, FileText, Upload, MessageSquare } from 'lucide-react';
import styles from './AdminDisputeDetailModal.module.css';

// Extended Dispute type for detail modal
export interface DisputeDetail {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  reason?: string;
  // User info
  profile_id?: string;
  user_email?: string;
  user_name?: string;
  user_avatar_url?: string;
  // Dispute details
  response_due?: string;
  evidence_due?: string;
  resolved_at?: string;
  // Evidence
  evidence_submitted?: boolean;
  evidence_submitted_at?: string;
  evidence_details?: string;
  // Stripe fields
  stripe_dispute_id?: string;
  stripe_charge_id?: string;
  stripe_payment_intent_id?: string;
  // Related data
  booking_id?: string;
  transaction_id?: string;
  // Outcome
  outcome?: 'won' | 'lost' | 'pending';
  outcome_reason?: string;
  // Additional context
  network_reason_code?: string;
  dispute_type?: string;
  currency?: string;
}

interface AdminDisputeDetailModalProps {
  dispute: DisputeDetail;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

// Status variant helper
function getDisputeStatusVariant(status: string) {
  const statusLower = status.toLowerCase();
  if (statusLower === 'won') return 'completed' as const;
  if (statusLower === 'lost') return 'cancelled' as const;
  if (statusLower === 'under_review') return 'in_progress' as const;
  if (statusLower === 'action_required' || statusLower === 'needs_response') return 'pending' as const;
  if (statusLower === 'warning_closed') return 'neutral' as const;
  return 'neutral' as const;
}

export default function AdminDisputeDetailModal({
  dispute,
  isOpen,
  onClose,
  onUpdate: _onUpdate,
}: AdminDisputeDetailModalProps) {
  const [_isProcessing, _setIsProcessing] = useState(false);

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

  // Calculate days until due
  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue(dispute.response_due);

  // Action handlers
  const handleViewInStripe = () => {
    const stripeUrl = dispute.stripe_dispute_id
      ? `https://dashboard.stripe.com/disputes/${dispute.stripe_dispute_id}`
      : 'https://dashboard.stripe.com/disputes';
    window.open(stripeUrl, '_blank');
  };

  const handleViewUser = () => {
    if (dispute.profile_id) {
      window.open(`/admin/accounts/users?id=${dispute.profile_id}`, '_blank');
    }
  };

  const handleViewBooking = () => {
    if (dispute.booking_id) {
      window.open(`/admin/bookings?id=${dispute.booking_id}`, '_blank');
    }
  };

  const handleSubmitEvidence = async () => {
    alert('Evidence submission functionality to be implemented - use Stripe Dashboard for now');
    window.open(
      `https://dashboard.stripe.com/disputes/${dispute.stripe_dispute_id}`,
      '_blank'
    );
  };

  const handleContactUser = () => {
    if (dispute.profile_id) {
      window.open(`/messages?userId=${dispute.profile_id}`, '_blank');
    }
  };

  // Section 1: Dispute Information
  const disputeInfoFields = [
    {
      label: 'Dispute ID',
      value: <span className={styles.idText}>{formatIdForDisplay(dispute.id, 'full')}</span>,
    },
    {
      label: 'Status',
      value: (
        <StatusBadge
          variant={getDisputeStatusVariant(dispute.status)}
          label={dispute.status.replace(/_/g, ' ')}
        />
      ),
    },
    {
      label: 'Disputed Amount',
      value: (
        <span className={styles.amountNegative}>
          {formatCurrency(dispute.amount, dispute.currency)}
        </span>
      ),
    },
    {
      label: 'Reason',
      value: dispute.reason || '—',
    },
    {
      label: 'Dispute Type',
      value: dispute.dispute_type || '—',
    },
    {
      label: 'Network Reason Code',
      value: dispute.network_reason_code || '—',
    },
  ];

  // Section 2: User Information
  const userInfoFields = [
    {
      label: 'Customer',
      value: (
        <div className={styles.profileDisplay}>
          {dispute.user_avatar_url && (
            <img
              src={dispute.user_avatar_url}
              alt={dispute.user_name || 'User'}
              className={styles.avatar}
            />
          )}
          <span>{dispute.user_name || 'Unknown'}</span>
        </div>
      ),
    },
    {
      label: 'Email',
      value: dispute.user_email || '—',
    },
    {
      label: 'User ID',
      value: dispute.profile_id ? (
        <span className={styles.idText}>{formatIdForDisplay(dispute.profile_id)}</span>
      ) : (
        '—'
      ),
    },
  ];

  // Section 3: Response Timeline
  const timelineFields = [
    {
      label: 'Created At',
      value: formatDateTime(dispute.created_at),
    },
    {
      label: 'Response Due',
      value: (
        <div>
          {formatDate(dispute.response_due)}
          {daysUntilDue !== null && (
            <span
              className={
                daysUntilDue <= 3
                  ? styles.urgentDue
                  : daysUntilDue <= 7
                    ? styles.warningDue
                    : styles.normalDue
              }
            >
              {' '}
              ({daysUntilDue > 0 ? `${daysUntilDue} days left` : 'Overdue'})
            </span>
          )}
        </div>
      ),
    },
    {
      label: 'Evidence Due',
      value: formatDate(dispute.evidence_due),
    },
    ...(dispute.resolved_at
      ? [{ label: 'Resolved At', value: formatDateTime(dispute.resolved_at) }]
      : []),
  ];

  // Section 4: Evidence Status
  const evidenceFields = [
    {
      label: 'Evidence Submitted',
      value: dispute.evidence_submitted ? (
        <span className={styles.evidenceSubmitted}>Yes</span>
      ) : (
        <span className={styles.evidenceNotSubmitted}>No</span>
      ),
    },
    ...(dispute.evidence_submitted_at
      ? [{ label: 'Submitted At', value: formatDateTime(dispute.evidence_submitted_at) }]
      : []),
    ...(dispute.evidence_details
      ? [{ label: 'Evidence Details', value: dispute.evidence_details }]
      : []),
  ];

  // Section 5: Stripe Information
  const stripeInfoFields = [
    {
      label: 'Stripe Dispute ID',
      value: dispute.stripe_dispute_id ? (
        <span className={styles.idText}>{dispute.stripe_dispute_id}</span>
      ) : (
        '—'
      ),
    },
    {
      label: 'Stripe Charge ID',
      value: dispute.stripe_charge_id ? (
        <span className={styles.idText}>{dispute.stripe_charge_id}</span>
      ) : (
        '—'
      ),
    },
    {
      label: 'Payment Intent ID',
      value: dispute.stripe_payment_intent_id ? (
        <span className={styles.idText}>{dispute.stripe_payment_intent_id}</span>
      ) : (
        '—'
      ),
    },
    {
      label: 'Booking ID',
      value: dispute.booking_id ? (
        <button onClick={handleViewBooking} className={styles.linkButton}>
          {formatIdForDisplay(dispute.booking_id)}
        </button>
      ) : (
        '—'
      ),
    },
    {
      label: 'Transaction ID',
      value: dispute.transaction_id ? (
        <span className={styles.idText}>{formatIdForDisplay(dispute.transaction_id)}</span>
      ) : (
        '—'
      ),
    },
  ];

  // Section 6: Outcome (if resolved)
  const outcomeFields =
    dispute.outcome && dispute.outcome !== 'pending'
      ? [
          {
            label: 'Outcome',
            value: (
              <span
                className={dispute.outcome === 'won' ? styles.outcomeWon : styles.outcomeLost}
              >
                {dispute.outcome.toUpperCase()}
              </span>
            ),
          },
          ...(dispute.outcome_reason
            ? [{ label: 'Outcome Reason', value: dispute.outcome_reason }]
            : []),
        ]
      : [];

  // Build sections array
  const sections: DetailSection[] = [
    {
      title: 'Dispute Information',
      fields: disputeInfoFields,
    },
    {
      title: 'Customer',
      fields: userInfoFields,
    },
    {
      title: 'Response Timeline',
      fields: timelineFields,
    },
    {
      title: 'Evidence',
      fields: evidenceFields,
    },
    {
      title: 'Payment Details',
      fields: stripeInfoFields,
    },
    ...(outcomeFields.length > 0
      ? [
          {
            title: 'Outcome',
            fields: outcomeFields,
          },
        ]
      : []),
  ];

  // Modal title and subtitle
  const title = `Dispute ${formatIdForDisplay(dispute.id)}`;
  const subtitle = `${dispute.reason || 'Unknown reason'} • ${formatCurrency(dispute.amount, dispute.currency)}`;

  const needsAction =
    dispute.status.toLowerCase() === 'action_required' ||
    dispute.status.toLowerCase() === 'needs_response';

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      sections={sections}
      actions={
        <div className={styles.actionsWrapper}>
          <Button variant="secondary" onClick={handleViewUser} disabled={!dispute.profile_id}>
            <User size={16} className={styles.buttonIcon} />
            View User
          </Button>
          <Button
            variant="secondary"
            onClick={handleContactUser}
            disabled={!dispute.profile_id}
          >
            <MessageSquare size={16} className={styles.buttonIcon} />
            Contact User
          </Button>
          <Button
            variant="secondary"
            onClick={handleViewBooking}
            disabled={!dispute.booking_id}
          >
            <FileText size={16} className={styles.buttonIcon} />
            View Booking
          </Button>
          <Button variant="secondary" onClick={handleViewInStripe}>
            <ExternalLink size={16} className={styles.buttonIcon} />
            View in Stripe
          </Button>
          {needsAction && !dispute.evidence_submitted && (
            <Button variant="primary" onClick={handleSubmitEvidence}>
              <Upload size={16} className={styles.buttonIcon} />
              Submit Evidence
            </Button>
          )}
        </div>
      }
    />
  );
}
