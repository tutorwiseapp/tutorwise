/**
 * Filename: AdminTransactionDetailModal.tsx
 * Purpose: Admin transaction detail modal with full information and actions
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
import { ExternalLink, User, FileText, RefreshCw } from 'lucide-react';
import styles from './AdminTransactionDetailModal.module.css';

// Extended Transaction type for detail modal
export interface TransactionDetail {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  type: string;
  description?: string;
  // User info
  profile_id?: string | null;
  user_email?: string;
  user_name?: string;
  user_avatar_url?: string;
  // Context fields (from booking)
  booking_id?: string | null;
  service_name?: string;
  subjects?: string[];
  session_date?: string;
  location_type?: 'online' | 'in_person' | 'hybrid';
  tutor_name?: string;
  client_name?: string;
  agent_name?: string;
  // Stripe fields
  stripe_checkout_id?: string | null;
  stripe_payout_id?: string | null;
  // Availability
  available_at?: string;
  // Booking details (joined)
  booking?: {
    id: string;
    service_name: string;
    session_start_time: string;
    client?: { id: string; full_name: string; avatar_url?: string };
    tutor?: { id: string; full_name: string; avatar_url?: string };
  };
}

interface AdminTransactionDetailModalProps {
  transaction: TransactionDetail;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

// Status variant helper
function getTransactionStatusVariant(status: string) {
  const statusLower = status.toLowerCase();
  if (statusLower === 'available') return 'completed' as const;
  if (statusLower === 'paid_out') return 'paid' as const;
  if (statusLower === 'clearing') return 'processing' as const;
  if (statusLower === 'disputed') return 'flagged' as const;
  if (statusLower === 'refunded') return 'refunded' as const;
  if (statusLower === 'paid') return 'paid' as const;
  if (statusLower === 'pending') return 'pending' as const;
  if (statusLower === 'failed') return 'error' as const;
  return 'neutral' as const;
}

export default function AdminTransactionDetailModal({
  transaction,
  isOpen,
  onClose,
  onUpdate,
}: AdminTransactionDetailModalProps) {
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
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100);
  };

  // Format location type
  const formatLocationType = (type?: string) => {
    if (!type) return '—';
    const map: Record<string, string> = {
      online: 'Online',
      in_person: 'In Person',
      hybrid: 'Hybrid',
    };
    return map[type] || type;
  };

  // Action handlers
  const handleViewInStripe = () => {
    // Open Stripe dashboard (would need real Stripe URL)
    const stripeUrl = transaction.stripe_checkout_id
      ? `https://dashboard.stripe.com/payments/${transaction.stripe_checkout_id}`
      : 'https://dashboard.stripe.com/payments';
    window.open(stripeUrl, '_blank');
  };

  const handleViewUser = () => {
    if (transaction.profile_id) {
      window.open(`/admin/accounts/users?id=${transaction.profile_id}`, '_blank');
    }
  };

  const handleViewBooking = () => {
    if (transaction.booking_id) {
      window.open(`/admin/bookings?id=${transaction.booking_id}`, '_blank');
    }
  };

  // Section 1: Transaction Information
  const transactionInfoFields = [
    {
      label: 'Transaction ID',
      value: <span className={styles.idText}>{formatIdForDisplay(transaction.id, 'full')}</span>,
    },
    {
      label: 'Status',
      value: (
        <StatusBadge
          variant={getTransactionStatusVariant(transaction.status)}
          label={transaction.status.replace(/_/g, ' ')}
        />
      ),
    },
    {
      label: 'Type',
      value: transaction.type || '—',
    },
    {
      label: 'Amount',
      value: (
        <span className={transaction.amount >= 0 ? styles.amountPositive : styles.amountNegative}>
          {formatCurrency(transaction.amount)}
        </span>
      ),
    },
    {
      label: 'Description',
      value: transaction.description || '—',
    },
    {
      label: 'Created At',
      value: formatDateTime(transaction.created_at),
    },
    ...(transaction.available_at
      ? [
          {
            label: 'Available At',
            value: formatDateTime(transaction.available_at),
          },
        ]
      : []),
  ];

  // Section 2: User Information
  const userInfoFields = transaction.profile_id
    ? [
        {
          label: 'User',
          value: (
            <div className={styles.profileDisplay}>
              {transaction.user_avatar_url && (
                <img
                  src={transaction.user_avatar_url}
                  alt={transaction.user_name || 'User'}
                  className={styles.avatar}
                />
              )}
              <span>{transaction.user_name || 'Unknown'}</span>
            </div>
          ),
        },
        {
          label: 'Email',
          value: transaction.user_email || '—',
        },
        {
          label: 'User ID',
          value: <span className={styles.idText}>{formatIdForDisplay(transaction.profile_id)}</span>,
        },
      ]
    : [
        {
          label: 'User',
          value: <span className={styles.notAvailable}>Platform Fee (no user)</span>,
        },
      ];

  // Section 3: Service Context (from booking snapshot)
  const serviceContextFields = [
    {
      label: 'Service Name',
      value: transaction.service_name || transaction.booking?.service_name || '—',
    },
    {
      label: 'Subjects',
      value: transaction.subjects?.join(', ') || '—',
    },
    {
      label: 'Session Date',
      value: formatDate(transaction.session_date || transaction.booking?.session_start_time),
    },
    {
      label: 'Location Type',
      value: formatLocationType(transaction.location_type),
    },
    ...(transaction.tutor_name
      ? [{ label: 'Tutor', value: transaction.tutor_name }]
      : transaction.booking?.tutor
        ? [{ label: 'Tutor', value: transaction.booking.tutor.full_name }]
        : []),
    ...(transaction.client_name
      ? [{ label: 'Client', value: transaction.client_name }]
      : transaction.booking?.client
        ? [{ label: 'Client', value: transaction.booking.client.full_name }]
        : []),
    ...(transaction.agent_name ? [{ label: 'Agent', value: transaction.agent_name }] : []),
  ];

  // Section 4: Stripe Information
  const stripeInfoFields = [
    {
      label: 'Booking ID',
      value: transaction.booking_id ? (
        <button onClick={handleViewBooking} className={styles.linkButton}>
          {formatIdForDisplay(transaction.booking_id)}
        </button>
      ) : (
        '—'
      ),
    },
    {
      label: 'Stripe Checkout ID',
      value: transaction.stripe_checkout_id ? (
        <span className={styles.idText}>{transaction.stripe_checkout_id}</span>
      ) : (
        '—'
      ),
    },
    {
      label: 'Stripe Payout ID',
      value: transaction.stripe_payout_id ? (
        <span className={styles.idText}>{transaction.stripe_payout_id}</span>
      ) : (
        '—'
      ),
    },
  ];

  // Build sections array
  const sections: DetailSection[] = [
    {
      title: 'Transaction Information',
      fields: transactionInfoFields,
    },
    {
      title: 'User Information',
      fields: userInfoFields,
    },
    {
      title: 'Service Context',
      fields: serviceContextFields,
    },
    {
      title: 'Payment Details',
      fields: stripeInfoFields,
    },
  ];

  // Modal title and subtitle
  const title = `Transaction ${formatIdForDisplay(transaction.id)}`;
  const subtitle = `${transaction.type} • ${formatCurrency(transaction.amount)}`;

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      sections={sections}
      actions={
        <div className={styles.actionsWrapper}>
          <Button
            variant="secondary"
            onClick={handleViewUser}
            disabled={!transaction.profile_id}
          >
            <User size={16} className={styles.buttonIcon} />
            View User
          </Button>
          <Button
            variant="secondary"
            onClick={handleViewBooking}
            disabled={!transaction.booking_id}
          >
            <FileText size={16} className={styles.buttonIcon} />
            View Booking
          </Button>
          <Button variant="secondary" onClick={handleViewInStripe}>
            <ExternalLink size={16} className={styles.buttonIcon} />
            View in Stripe
          </Button>
        </div>
      }
    />
  );
}
