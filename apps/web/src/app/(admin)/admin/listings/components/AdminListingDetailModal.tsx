/**
 * Filename: AdminListingDetailModal.tsx
 * Purpose: Admin-specific listing detail modal with full information and admin actions
 * Created: 2025-12-27
 * Updated: 2026-01-21 - Removed edit and status change capabilities (admin can only view, contact, delete)
 * Pattern: Uses HubDetailModal with admin-specific sections and actions (mirrors AdminBookingDetailModal)
 *
 * Features:
 * - Complete listing information (50+ fields from listings table)
 * - Admin-specific actions (Contact Tutor, Delete)
 * - Engagement metrics (views, bookings, ratings)
 * - Service details and media information
 *
 * Usage:
 * <AdminListingDetailModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   listing={listing}
 *   onListingUpdated={refreshListingsList}
 * />
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Listing } from '@/types';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';
import { createClient } from '@/utils/supabase/client';
import { MessageSquare, Trash2 } from 'lucide-react';
import styles from './AdminListingDetailModal.module.css';

interface AdminListingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  onListingUpdated?: () => void; // Callback to refresh listing list after update
}

export default function AdminListingDetailModal({
  isOpen,
  onClose,
  listing,
  onListingUpdated,
}: AdminListingDetailModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // If no listing, don't render
  if (!listing) return null;

  // Format datetime helper
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Build subtitle
  const subtitle = `Listing ID: ${listing.id.slice(0, 8)}`;

  // Build sections with all listing fields
  const sections: DetailSection[] = [
    {
      title: 'Basic Information',
      fields: [
        { label: 'Title', value: listing.title },
        { label: 'Slug', value: listing.slug },
        { label: 'Status', value: listing.status },
        { label: 'Description', value: listing.description || 'N/A' },
      ],
    },
    {
      title: 'Service Details',
      fields: [
        { label: 'Subjects', value: listing.subjects?.join(', ') || 'N/A' },
        { label: 'Levels', value: listing.levels?.join(', ') || 'N/A' },
        { label: 'Hourly Rate', value: `£${listing.hourly_rate}/hr` },
        {
          label: 'Delivery Mode',
          value: listing.delivery_mode && listing.delivery_mode.length > 0
            ? listing.delivery_mode.map((mode: string) =>
                mode === 'online' ? 'Online' :
                mode === 'in_person' ? 'In Person' :
                mode === 'hybrid' ? 'Hybrid' : mode
              ).join(', ')
            : 'N/A',
        },
        { label: 'Location City', value: listing.location_city || 'N/A' },
        { label: 'Free Trial', value: listing.free_trial ? 'Yes' : 'No' },
        { label: 'Free Help Available', value: listing.available_free_help ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'Tutor Information',
      fields: [
        { label: 'Tutor Name', value: listing.profile?.full_name || 'N/A' },
        { label: 'Tutor ID', value: listing.profile_id },
      ],
    },
    {
      title: 'Engagement Metrics',
      fields: [
        { label: 'View Count', value: listing.view_count?.toString() || '0' },
        { label: 'Booking Count', value: listing.booking_count?.toString() || '0' },
      ],
    },
    {
      title: 'System Information',
      fields: [
        { label: 'Listing ID', value: listing.id },
        { label: 'Created At', value: formatDateTime(listing.created_at) },
        {
          label: 'Updated At',
          value: listing.updated_at ? formatDateTime(listing.updated_at) : 'N/A',
        },
      ],
    },
  ];

  // Action Handlers

  const handleDelete = async () => {
    if (!confirm('Delete this listing? This action cannot be undone.')) return;

    setIsProcessing(true);
    try {
      // Log admin action before deleting
      await supabase.rpc('log_admin_action', {
        p_action: 'delete',
        p_resource_type: 'listing',
        p_resource_id: listing.id,
        p_details: {
          action: 'delete',
          listing_title: listing.title,
          listing_owner_id: listing.profile_id,
          listing_status: listing.status,
        },
      });

      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listing.id);

      if (error) throw error;

      alert('Listing deleted successfully!');
      onListingUpdated?.();
      onClose();
    } catch (error) {
      alert('Failed to delete listing. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContactTutor = () => {
    router.push(`/messages?userId=${listing.profile_id}`);
  };

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={listing.title}
      subtitle={subtitle}
      size="xl"
      sections={sections}
      actions={
        <div className={styles.actionsWrapper}>
          {/* Contact Tutor */}
          <Button variant="secondary" onClick={handleContactTutor}>
            <MessageSquare className={styles.buttonIcon} />
            Contact Tutor
          </Button>

          {/* Delete */}
          <Button variant="danger" onClick={handleDelete} disabled={isProcessing}>
            <Trash2 className={styles.buttonIcon} />
            Delete
          </Button>
        </div>
      }
    />
  );
}
