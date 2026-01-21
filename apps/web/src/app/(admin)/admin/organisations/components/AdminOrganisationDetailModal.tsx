/**
 * Filename: AdminOrganisationDetailModal.tsx
 * Purpose: Admin organisation detail modal with full information and actions
 * Created: 2025-12-28
 * Pattern: Follows AdminBookingDetailModal structure
 * Applies: All 12 critical lessons from referrals implementation
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { HubDetailModal } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button'; // ✅ Lesson #3: Use Button component
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { formatDate, calculateDaysRemaining } from '@/lib/utils/format-date';
import styles from './AdminOrganisationDetailModal.module.css';

interface Organisation {
  id: string;
  profile_id: string;
  name: string;
  slug: string | null;
  type: 'personal' | 'organisation';
  avatar_url: string | null;
  description: string | null;
  website: string | null;
  member_count: number;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address_line1?: string | null;
  address_town?: string | null;
  address_city?: string | null;
  address_postcode?: string | null;
  address_country?: string | null;
  created_at: string;
  updated_at: string;
  owner?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  subscription?: {
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
    status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'none';
    trial_start: string | null;
    trial_end: string | null;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
  } | null;
}

interface AdminOrganisationDetailModalProps {
  organisation: Organisation;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function AdminOrganisationDetailModal({
  organisation,
  isOpen,
  onClose,
  onUpdate,
}: AdminOrganisationDetailModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isDeleting, setIsDeleting] = useState(false);

  // Normalize subscription data (handle both single object and array from join)
  const subscription = Array.isArray(organisation.subscription)
    ? organisation.subscription[0]
    : organisation.subscription;

  // Format datetime helper
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${month} ${year} at ${time}`;
  };

  // Handler: View Owner Profile
  const handleViewOwner = () => {
    if (organisation.owner) {
      router.push(`/admin/users?id=${organisation.owner.id}`);
    }
  };

  // Handler: View Public Page
  const handleViewPublicPage = () => {
    window.open(`/org/${organisation.slug}`, '_blank');
  };

  // Handler: View Members
  const handleViewMembers = () => {
    router.push(`/admin/users?organisation_id=${organisation.id}`);
  };

  // Handler: Delete Organisation
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${organisation.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('connection_groups')
        .delete()
        .eq('id', organisation.id);

      if (error) throw error;

      alert('Organisation deleted successfully');
      onUpdate();
      onClose();
    } catch (error: any) {
      alert(`Failed to delete organisation: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ Lesson #2: Title = human-readable name, Subtitle = ID reference
  const modalTitle = organisation.name;
  const modalSubtitle = `Organisation ID: ${organisation.id}`;

  // Section 1: Basic Information
  const basicInfoFields = [
    {
      label: 'Organisation ID',
      value: <span className={styles.idText}>{organisation.id}</span>,
    },
    {
      label: 'Short ID',
      value: <span className={styles.idText}>{formatIdForDisplay(organisation.id)}</span>,
    },
    {
      label: 'Organisation Name',
      value: organisation.name,
    },
    {
      label: 'Slug',
      value: organisation.slug || <span className={styles.notAvailable}>Not set</span>,
    },
    {
      label: 'Type',
      value: organisation.type === 'organisation' ? 'Organisation' : 'Personal',
    },
    {
      label: 'Description',
      value: organisation.description || <span className={styles.notAvailable}>No description</span>,
    },
  ];

  // Section 2: Owner Information
  // ✅ Lesson #4: Always show field labels with placeholder text
  // ✅ Lesson #5: Email fields for all parties
  const ownerFields = organisation.owner
    ? [
        {
          label: 'Owner',
          value: (
            <div className={styles.profileDisplay}>
              {organisation.owner.avatar_url && (
                <img
                  src={organisation.owner.avatar_url}
                  alt={organisation.owner.full_name || 'Owner'}
                  className={styles.avatar}
                />
              )}
              <span>{organisation.owner.full_name || 'Unknown'}</span>
            </div>
          ),
        },
        {
          label: 'Owner Email',
          value: organisation.owner.email,
        },
        {
          label: 'Owner ID',
          value: <span className={styles.idText}>{organisation.owner.id}</span>,
        },
      ]
    : [
        {
          label: 'Owner',
          value: <span className={styles.notAvailable}>No owner information</span>,
        },
        {
          label: 'Owner Email',
          value: <span className={styles.notAvailable}>Not available</span>,
        },
        {
          label: 'Owner ID',
          value: <span className={styles.notAvailable}>Not available</span>,
        },
      ];

  // Section 3: Contact Information
  // ✅ Lesson #4: Always show labels, use placeholder when no data
  const contactFields = [
    {
      label: 'Contact Name',
      value: organisation.contact_name || <span className={styles.notAvailable}>Not provided</span>,
    },
    {
      label: 'Contact Email',
      value: organisation.contact_email || <span className={styles.notAvailable}>Not provided</span>,
    },
    {
      label: 'Contact Phone',
      value: organisation.contact_phone || <span className={styles.notAvailable}>Not provided</span>,
    },
    {
      label: 'Website',
      value: organisation.website ? (
        <a
          href={organisation.website}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.websiteLink}
        >
          {organisation.website}
        </a>
      ) : (
        <span className={styles.notAvailable}>Not provided</span>
      ),
    },
  ];

  // Section 4: Address Information
  const addressFields = [
    {
      label: 'Address Line 1',
      value: organisation.address_line1 || <span className={styles.notAvailable}>Not provided</span>,
    },
    {
      label: 'Town',
      value: organisation.address_town || <span className={styles.notAvailable}>Not provided</span>,
    },
    {
      label: 'City',
      value: organisation.address_city || <span className={styles.notAvailable}>Not provided</span>,
    },
    {
      label: 'Postcode',
      value: organisation.address_postcode || <span className={styles.notAvailable}>Not provided</span>,
    },
    {
      label: 'Country',
      value: organisation.address_country || <span className={styles.notAvailable}>Not provided</span>,
    },
  ];

  // Section 5: Statistics
  const statsFields = [
    {
      label: 'Total Members',
      value: `${organisation.member_count} ${organisation.member_count === 1 ? 'member' : 'members'}`,
    },
  ];

  // Section 6: Subscription Information
  const subscriptionFields = subscription
    ? [
        {
          label: 'Status',
          value: subscription.status,
        },
        {
          label: 'Trial Start',
          value: subscription.trial_start
            ? formatDate(subscription.trial_start)
            : <span className={styles.notAvailable}>No trial</span>,
        },
        {
          label: 'Trial End',
          value: subscription.trial_end
            ? formatDate(subscription.trial_end)
            : <span className={styles.notAvailable}>No trial</span>,
        },
        {
          label: 'Trial Status',
          value: subscription.trial_end ? (() => {
            const daysRemaining = calculateDaysRemaining(subscription.trial_end);
            return daysRemaining > 0 ? (
              <span className={styles.trialActive}>{daysRemaining}d left</span>
            ) : (
              <span className={styles.trialExpired}>Expired</span>
            );
          })() : <span className={styles.notAvailable}>No trial</span>,
        },
        {
          label: 'Current Period Start',
          value: formatDate(subscription.current_period_start),
        },
        {
          label: 'Current Period End',
          value: formatDate(subscription.current_period_end),
        },
        {
          label: 'Next Billing',
          value: formatDate(subscription.current_period_end),
        },
        {
          label: 'Billing Action',
          value: subscription.cancel_at_period_end ? (
            <span className={styles.billingCancels}>Cancels</span>
          ) : (
            <span className={styles.billingRenews}>Renews</span>
          ),
        },
        {
          label: 'Canceled At',
          value: subscription.canceled_at
            ? formatDate(subscription.canceled_at)
            : <span className={styles.notAvailable}>Not canceled</span>,
        },
        {
          label: 'Stripe Customer ID',
          value: subscription.stripe_customer_id
            ? <span className={styles.idText}>{subscription.stripe_customer_id}</span>
            : <span className={styles.notAvailable}>Not available</span>,
        },
        {
          label: 'Stripe Subscription ID',
          value: subscription.stripe_subscription_id
            ? <span className={styles.idText}>{subscription.stripe_subscription_id}</span>
            : <span className={styles.notAvailable}>Not available</span>,
        },
      ]
    : [
        {
          label: 'Subscription',
          value: <span className={styles.notAvailable}>No subscription data</span>,
        },
      ];

  // Section 7: System Information
  const systemFields = [
    {
      label: 'Created At',
      value: formatDateTime(organisation.created_at),
    },
    {
      label: 'Last Updated',
      value: formatDateTime(organisation.updated_at),
    },
  ];

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      sections={[
        {
          title: 'Basic Information',
          fields: basicInfoFields,
        },
        {
          title: 'Owner Information',
          fields: ownerFields,
        },
        {
          title: 'Contact Information',
          fields: contactFields,
        },
        {
          title: 'Address',
          fields: addressFields,
        },
        {
          title: 'Statistics',
          fields: statsFields,
        },
        {
          title: 'Subscription Information',
          fields: subscriptionFields,
        },
        {
          title: 'System Information',
          fields: systemFields,
        },
      ]}
      actions={
        // ✅ Lesson #3: Use Button component (not plain buttons)
        <div className={styles.actionsWrapper}>
          <Button
            variant="secondary"
            onClick={handleViewOwner}
            disabled={!organisation.owner}
          >
            View Owner
          </Button>
          <Button
            variant="secondary"
            onClick={handleViewMembers}
          >
            View Members
          </Button>
          <Button
            variant="secondary"
            onClick={handleViewPublicPage}
          >
            View Public Page
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Organisation'}
          </Button>
        </div>
      }
    />
  );
}
