/*
 * Filename: src/app/components/financials/TransactionCard.tsx
 * Purpose: Display transaction information in card format (SDD v4.9)
 * Created: 2025-11-02
 * Updated: 2025-11-24 - Migrated to HubRowCard standard with 3-role counterparty logic
 * Specification: SDD v4.9 - Horizontal card layout with HubRowCard component
 */
'use client';

import { Transaction, TransactionStatus } from '@/types';
import HubRowCard from '@/app/components/ui/hub-row-card/HubRowCard';
import StatsRow from '@/app/components/ui/hub-row-card/StatsRow';
import Button from '@/app/components/ui/Button';
import getProfileImageUrl from '@/lib/utils/image';

interface TransactionCardProps {
  transaction: Transaction;
  currentUserId: string;
}

export default function TransactionCard({ transaction, currentUserId }: TransactionCardProps) {
  // Determine counterparty (3-role logic: Client, Tutor, Agent)
  const determineCounterparty = () => {
    // System transactions (no person)
    if (transaction.type === 'Withdrawal') {
      return { name: 'Withdrawal', id: null, avatar_url: null, fallbackChar: 'W' };
    }
    if (transaction.type === 'Platform Fee') {
      return { name: 'TutorWise', id: null, avatar_url: null, fallbackChar: 'T' };
    }

    // Booking-related transactions
    if (transaction.booking) {
      const booking = transaction.booking;

      // If I am Tutor: Counterparty is Client
      if (booking.tutor_id === currentUserId) {
        return {
          name: booking.client?.full_name || 'Client',
          id: booking.client?.id || null,
          avatar_url: booking.client?.avatar_url || null,
          fallbackChar: booking.client?.full_name?.charAt(0).toUpperCase() || 'C'
        };
      }

      // If I am Client: Counterparty is Tutor
      if (booking.client_id === currentUserId) {
        return {
          name: booking.tutor?.full_name || 'Tutor',
          id: booking.tutor?.id || null,
          avatar_url: booking.tutor?.avatar_url || null,
          fallbackChar: booking.tutor?.full_name?.charAt(0).toUpperCase() || 'T'
        };
      }

      // If I am Agent: Counterparty is Tutor (primary) or Client (fallback)
      const agent = booking.tutor || booking.client;
      return {
        name: agent?.full_name || 'Unknown',
        id: agent?.id || null,
        avatar_url: agent?.avatar_url || null,
        fallbackChar: agent?.full_name?.charAt(0).toUpperCase() || '?'
      };
    }

    // Fallback for non-booking transactions
    return { name: 'Unknown', id: null, avatar_url: null, fallbackChar: '?' };
  };

  const counterparty = determineCounterparty();
  const isSystemTransaction = !counterparty.id;

  // Format date helper (en-GB standard)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format time helper (24-hour format)
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Map status to HubRowCard status variant (v4.9)
  const getStatus = (): { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' | 'info' } => {
    switch (transaction.status) {
      case 'available':
      case 'paid_out':
      case 'Paid':
        return { label: transaction.status, variant: 'success' };
      case 'clearing':
      case 'Pending':
        return { label: transaction.status, variant: 'warning' };
      case 'Failed':
      case 'disputed':
        return { label: transaction.status, variant: 'error' };
      case 'refunded':
      case 'Cancelled':
        return { label: transaction.status, variant: 'neutral' };
      default:
        return { label: transaction.status, variant: 'neutral' };
    }
  };

  // Get image properties (Person or System)
  const getImage = () => {
    if (isSystemTransaction) {
      return {
        src: null,
        alt: counterparty.name,
        fallbackChar: counterparty.fallbackChar,
      };
    }

    return {
      src: counterparty.avatar_url ? getProfileImageUrl({
        id: counterparty.id!,
        avatar_url: counterparty.avatar_url,
      }) : null,
      alt: counterparty.name,
      fallbackChar: counterparty.fallbackChar,
    };
  };

  // Build title (service name or description)
  const title = transaction.booking?.service_name || transaction.description || counterparty.name;

  // Build description (transaction type - already human-readable)
  const description = transaction.type;

  // Build metadata array
  const meta = [
    formatDate(transaction.created_at),
    formatTime(transaction.created_at),
    `#${transaction.id.slice(0, 8)}`
  ];

  // Determine credit/debit for amount display
  const isCredit =
    (transaction.type === 'Booking Payment' && transaction.booking?.tutor_id === currentUserId) ||
    transaction.type === 'Referral Commission' ||
    transaction.type === 'Agent Commission';

  const isDebit =
    (transaction.type === 'Booking Payment' && transaction.booking?.client_id === currentUserId) ||
    transaction.type === 'Platform Fee' ||
    transaction.type === 'Withdrawal';

  // Build stats (amount with explicit signs and consistent spacing for future expansion)
  const amountColor = isCredit ? '#137333' : '#111827'; // emerald-600 : gray-900
  const amountPrefix = isCredit ? '+' : (isDebit && transaction.type !== 'Withdrawal' ? '-' : '');

  const stats = (
    <StatsRow
      stats={[
        {
          value: `${amountPrefix}£${transaction.amount.toFixed(2)}`,
          color: amountColor,
          hideLabel: true,
        },
        // Future: Add more stats here
        // { label: 'Fee', value: `£${transaction.fee}` },
        // { label: 'Net', value: `£${transaction.net}` },
      ]}
    />
  );

  // Build actions
  const actions = (
    <>
      {transaction.booking_id && (
        <Button variant="secondary" size="sm" href={`/bookings/${transaction.booking_id}`}>
          View Booking
        </Button>
      )}
      {(transaction.status === 'disputed' || transaction.status === 'Failed') && (
        <Button variant="ghost" size="sm" href="/help-centre">
          Support
        </Button>
      )}
    </>
  );

  return (
    <HubRowCard
      image={getImage()}
      title={title}
      status={getStatus()}
      description={description}
      meta={meta}
      stats={stats}
      actions={actions}
      imageHref={isSystemTransaction ? undefined : `/public-profile/${counterparty.id}`}
      titleHref={isSystemTransaction ? undefined : `/public-profile/${counterparty.id}`}
    />
  );
}
