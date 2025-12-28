/**
 * Filename: AdminReferralDetailModal.tsx
 * Purpose: Detail modal for admin referral management
 * Created: 2025-12-27
 * Pattern: Follows AdminBookingDetailModal/AdminReviewDetailModal structure
 */

'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal/HubDetailModal/HubDetailModal';
import Button from '@/app/components/ui/actions/Button';
import { Referral } from '@/types';
import styles from './AdminReferralDetailModal.module.css';
import { formatIdForDisplay } from '@/lib/utils/formatId';

interface AdminReferralDetailModalProps {
  referral: Referral;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function AdminReferralDetailModal({
  referral,
  isOpen,
  onClose,
  onUpdate,
}: AdminReferralDetailModalProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Format date helper
  const formatDate = (dateString?: string | null, format: string = 'dd MMM yyyy HH:mm') => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    if (format === 'dd MMM yyyy') {
      return `${day} ${month} ${year}`;
    }
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  };

  // Format currency helper
  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate days active
  const getDaysActive = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Handle expire referral
  const handleExpire = async () => {
    if (!confirm('Mark this referral as expired?')) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('referrals')
      .update({ status: 'Expired' })
      .eq('id', referral.id);

    setIsLoading(false);

    if (error) {
      alert('Failed to expire referral');
      return;
    }

    alert('Referral marked as expired');
    onUpdate();
    onClose();
  };

  // Handle view agent profile
  const handleViewAgent = () => {
    if (!referral.agent_id) return;
    window.open(`/profile/${referral.agent_id}`, '_blank');
  };

  // Handle view referred user profile
  const handleViewUser = () => {
    if (!referral.referred_profile_id) return;
    window.open(`/profile/${referral.referred_profile_id}`, '_blank');
  };

  // Handle view booking
  const handleViewBooking = () => {
    if (!referral.booking_id) return;
    window.open(`/admin/bookings?id=${referral.booking_id}`, '_blank');
  };

  // Section 1: Referral Information
  const referralInfoFields = [
    {
      label: 'Referral ID',
      value: <span className={styles.idText}>{formatIdForDisplay(referral.id, 'full')}</span>,
    },
    {
      label: 'Status',
      value: <span className={styles[`status${referral.status.replace(' ', '')}`]}>{referral.status}</span>,
    },
    {
      label: 'Created At',
      value: formatDate(referral.created_at, 'dd MMM yyyy HH:mm'),
    },
    {
      label: 'Days Active',
      value: `${getDaysActive(referral.created_at)} days`,
    },
    ...(referral.converted_at
      ? [
          {
            label: 'Converted At',
            value: formatDate(referral.converted_at, 'dd MMM yyyy HH:mm'),
          },
        ]
      : []),
  ];

  // Section 2: Agent Information
  const agent = (referral as any).agent;
  const agentInfoFields = agent
    ? [
        {
          label: 'Name',
          value: (
            <div className={styles.profileDisplay}>
              {agent.avatar_url && (
                <img
                  src={agent.avatar_url}
                  alt={agent.full_name}
                  className={styles.avatar}
                />
              )}
              <span>{agent.full_name}</span>
            </div>
          ),
        },
        {
          label: 'Email',
          value: agent.email || 'N/A',
        },
        {
          label: 'Agent ID',
          value: <span className={styles.idText}>{formatIdForDisplay(referral.agent_id)}</span>,
        },
        ...(agent.referral_code
          ? [
              {
                label: 'Referral Code',
                value: <span className={styles.referralCode}>{agent.referral_code}</span>,
              },
              {
                label: 'Referral Link',
                value: (
                  <a
                    href={`${window.location.origin}/signup?ref=${agent.referral_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.referralLink}
                  >
                    {`${window.location.origin}/signup?ref=${agent.referral_code}`}
                  </a>
                ),
              },
            ]
          : []),
      ]
    : [];

  // Section 3: Referred User Information
  const referredUser = (referral as any).referred_user;
  const referredUserFields = referredUser
    ? [
        {
          label: 'Name',
          value: (
            <div className={styles.profileDisplay}>
              {referredUser.avatar_url && (
                <img
                  src={referredUser.avatar_url}
                  alt={referredUser.full_name}
                  className={styles.avatar}
                />
              )}
              <span>{referredUser.full_name}</span>
            </div>
          ),
        },
        {
          label: 'Email',
          value: referredUser.email || 'N/A',
        },
        {
          label: 'User ID',
          value: <span className={styles.idText}>{formatIdForDisplay(referral.referred_profile_id!)}</span>,
        },
        ...((referral as any).signed_up_at
          ? [
              {
                label: 'Signed Up At',
                value: formatDate((referral as any).signed_up_at, 'dd MMM yyyy HH:mm'),
              },
            ]
          : []),
      ]
    : [
        {
          label: 'Status',
          value: <span className={styles.notSignedUp}>User has not signed up yet</span>,
        },
      ];

  // Section 4: Referral Tracking
  const trackingFields = [
    {
      label: 'Referral Source',
      value: (referral as any).referral_source || 'N/A',
    },
    {
      label: 'Target Type',
      value: (referral as any).referral_target_type || 'N/A',
    },
    ...((referral as any).attribution_method
      ? [
          {
            label: 'Attribution Method',
            value: (referral as any).attribution_method,
          },
        ]
      : []),
    ...((referral as any).geographic_data
      ? [
          {
            label: 'Location',
            value: [
              (referral as any).geographic_data?.city,
              (referral as any).geographic_data?.region,
              (referral as any).geographic_data?.country,
            ]
              .filter(Boolean)
              .join(', ') || 'N/A',
          },
        ]
      : []),
    ...((referral as any).last_reminder_sent_at
      ? [
          {
            label: 'Last Reminder Sent',
            value: formatDate((referral as any).last_reminder_sent_at, 'dd MMM yyyy HH:mm'),
          },
        ]
      : []),
    {
      label: 'Reminder Count',
      value: `${(referral as any).reminder_count || 0} reminders sent`,
    },
  ];

  // Section 5: Booking Parties (always show, with placeholder text when not converted)
  const firstBooking = (referral as any).first_booking;
  const firstCommission = (referral as any).first_commission;

  const bookingPartiesFields = referral.status === 'Converted' && firstBooking
    ? [
        {
          label: 'Client',
          value: firstBooking.client ? (
            <div className={styles.profileDisplay}>
              {firstBooking.client.avatar_url && (
                <img
                  src={firstBooking.client.avatar_url}
                  alt={firstBooking.client.full_name}
                  className={styles.avatar}
                />
              )}
              <span>{firstBooking.client.full_name}</span>
            </div>
          ) : <span className={styles.notSignedUp}>Not available</span>,
        },
        ...(firstBooking.client?.email
          ? [
              {
                label: 'Client Email',
                value: firstBooking.client.email,
              },
            ]
          : []),
        {
          label: 'Tutor',
          value: firstBooking.tutor ? (
            <div className={styles.profileDisplay}>
              {firstBooking.tutor.avatar_url && (
                <img
                  src={firstBooking.tutor.avatar_url}
                  alt={firstBooking.tutor.full_name}
                  className={styles.avatar}
                />
              )}
              <span>{firstBooking.tutor.full_name}</span>
            </div>
          ) : <span className={styles.notSignedUp}>Not available</span>,
        },
        ...(firstBooking.tutor?.email
          ? [
              {
                label: 'Tutor Email',
                value: firstBooking.tutor.email,
              },
            ]
          : []),
      ]
    : [
        {
          label: 'Client',
          value: <span className={styles.notSignedUp}>Available after conversion</span>,
        },
        {
          label: 'Client Email',
          value: <span className={styles.notSignedUp}>Available after conversion</span>,
        },
        {
          label: 'Tutor',
          value: <span className={styles.notSignedUp}>Available after conversion</span>,
        },
        {
          label: 'Tutor Email',
          value: <span className={styles.notSignedUp}>Available after conversion</span>,
        },
      ];

  // Section 6: Conversion Details (only show when converted)
  const conversionFields =
    referral.status === 'Converted'
      ? [
          ...(firstBooking
            ? [
                {
                  label: 'First Booking Service',
                  value: firstBooking.service_name,
                },
                {
                  label: 'Booking Amount',
                  value: formatCurrency(firstBooking.amount),
                },
                {
                  label: 'Booking ID',
                  value: (
                    <button onClick={handleViewBooking} className={styles.linkButton}>
                      {formatIdForDisplay(referral.booking_id!)}
                    </button>
                  ),
                },
              ]
            : []),
          ...(firstCommission
            ? [
                {
                  label: 'Commission Amount',
                  value: formatCurrency(firstCommission.amount),
                },
                {
                  label: 'Transaction ID',
                  value: <span className={styles.idText}>{formatIdForDisplay(referral.transaction_id!)}</span>,
                },
              ]
            : []),
        ]
      : [];

  // Build sections array
  const sections: DetailSection[] = [
    {
      title: 'Referral Information',
      fields: referralInfoFields,
    },
    ...(agentInfoFields.length > 0
      ? [
          {
            title: 'Agent Information',
            fields: agentInfoFields,
          },
        ]
      : []),
    {
      title: 'Referred User Information',
      fields: referredUserFields,
    },
    {
      title: 'Booking Parties',
      fields: bookingPartiesFields,
    },
    {
      title: 'Referral Tracking',
      fields: trackingFields,
    },
    ...(conversionFields.length > 0
      ? [
          {
            title: 'Conversion Details',
            fields: conversionFields,
          },
        ]
      : []),
  ];

  // Actions
  const actions = (
    <div className={styles.actionsWrapper}>
      <Button
        onClick={handleViewAgent}
        variant="secondary"
        disabled={!referral.agent_id}
      >
        View Agent
      </Button>

      <Button
        onClick={handleViewUser}
        variant="secondary"
        disabled={!referral.referred_profile_id}
      >
        View User
      </Button>

      {referral.booking_id && (
        <Button onClick={handleViewBooking} variant="secondary">
          View Booking
        </Button>
      )}

      {referral.status !== 'Expired' && (
        <Button onClick={handleExpire} variant="danger" disabled={isLoading}>
          Mark as Expired
        </Button>
      )}
    </div>
  );

  // Build title and subtitle following Bookings pattern
  const agentData = (referral as any).agent;
  const title = agentData ? agentData.full_name : 'Referral';
  const subtitle = `Referral ID: ${referral.id}`;

  return (
    <HubDetailModal
      isOpen={isOpen}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      sections={sections}
      actions={actions}
    />
  );
}
