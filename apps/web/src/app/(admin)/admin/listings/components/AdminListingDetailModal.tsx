/**
 * Filename: AdminListingDetailModal.tsx
 * Purpose: Admin-specific listing detail modal with full information and admin actions
 * Created: 2025-12-27
 * Updated: 2026-01-21 - Removed edit and status change capabilities (admin can only view, contact, delete)
 * Updated: 2026-02-05 - Expanded to show all listing fields across 8 sections
 * Pattern: Uses HubDetailModal with admin-specific sections and actions (mirrors AdminBookingDetailModal)
 *
 * Features:
 * - Complete listing information (50+ fields from listings table)
 * - Admin-specific actions (Contact Tutor, Delete)
 * - Engagement metrics (views, inquiries, bookings, ratings, reviews)
 * - Teaching details, pricing, location, media, SEO, and system info
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

  // Format service type helper
  const formatServiceType = (type: string | undefined) => {
    if (!type) return 'N/A';
    const map: Record<string, string> = {
      'one-to-one': 'One-to-One Session',
      'group-session': 'Group Session',
      'workshop': 'Workshop/Webinar',
      'study-package': 'Study Package',
      'job-listing': 'Job Listing',
    };
    return map[type] || type;
  };

  // Format listing category helper
  const formatCategory = (category: string | undefined) => {
    if (!category) return 'Session';
    const map: Record<string, string> = {
      'session': 'Session',
      'course': 'Course',
      'job': 'Job Posting',
    };
    return map[category] || category;
  };

  // Build sections with all listing fields
  const sections: DetailSection[] = [
    {
      title: 'Basic Information',
      fields: [
        { label: 'Title', value: listing.title },
        { label: 'Slug', value: listing.slug || 'N/A' },
        { label: 'Status', value: listing.status },
        { label: 'Category', value: formatCategory((listing as any).listing_category) },
        { label: 'Service Type', value: formatServiceType((listing as any).service_type) },
        { label: 'Description', value: listing.description || 'N/A' },
      ],
    },
    {
      title: 'Teaching Details',
      fields: [
        { label: 'Subjects', value: listing.subjects?.join(', ') || 'N/A' },
        { label: 'Levels', value: listing.levels?.join(', ') || 'N/A' },
        { label: 'Languages', value: (listing as any).languages?.join(', ') || 'N/A' },
        { label: 'Teaching Methods', value: (listing as any).teaching_methods?.join(', ') || 'N/A' },
        { label: 'Specializations', value: (listing as any).specializations?.join(', ') || 'N/A' },
        { label: 'Qualifications', value: (listing as any).qualifications?.join(', ') || 'N/A' },
      ],
    },
    {
      title: 'Pricing & Booking',
      fields: [
        { label: 'Hourly Rate', value: listing.hourly_rate ? `£${listing.hourly_rate}/hr` : 'N/A' },
        { label: 'Group Rate', value: (listing as any).group_hourly_rate ? `£${(listing as any).group_hourly_rate}/hr` : 'N/A' },
        { label: 'Currency', value: (listing as any).currency || 'GBP' },
        { label: 'Duration Options', value: (listing as any).duration_options?.map((d: number) => `${d} min`).join(', ') || 'N/A' },
        { label: 'Free Trial', value: (listing as any).free_trial ? 'Yes' : 'No' },
        { label: 'Trial Duration', value: (listing as any).trial_duration_minutes ? `${(listing as any).trial_duration_minutes} min` : 'N/A' },
        { label: 'Instant Booking', value: (listing as any).instant_booking_enabled ? 'Enabled' : 'Disabled' },
        { label: 'Free Help Available', value: (listing as any).available_free_help ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'Location & Delivery',
      fields: [
        {
          label: 'Delivery Mode',
          value: (listing as any).delivery_mode && (listing as any).delivery_mode.length > 0
            ? (listing as any).delivery_mode.map((mode: string) =>
                mode === 'online' ? 'Online' :
                mode === 'in_person' ? 'In Person' :
                mode === 'hybrid' ? 'Hybrid' : mode
              ).join(', ')
            : 'N/A',
        },
        { label: 'City', value: (listing as any).location_city || 'N/A' },
        { label: 'Country', value: (listing as any).location_country || 'N/A' },
        { label: 'Postcode', value: (listing as any).location_postcode || 'N/A' },
        { label: 'Timezone', value: (listing as any).timezone || 'N/A' },
        { label: 'Location Details', value: (listing as any).location_details || 'N/A' },
      ],
    },
    {
      title: 'Tutor Information',
      fields: [
        { label: 'Tutor Name', value: (listing as any).profile?.full_name || (listing as any).full_name || 'N/A' },
        { label: 'Tutor ID', value: listing.profile_id },
        { label: 'Identity Verified', value: (listing as any).identity_verified ? 'Yes' : 'No' },
        { label: 'DBS Verified', value: (listing as any).dbs_verified ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'Engagement Metrics',
      fields: [
        { label: 'View Count', value: (listing as any).view_count?.toString() || '0' },
        { label: 'Inquiry Count', value: (listing as any).inquiry_count?.toString() || '0' },
        { label: 'Booking Count', value: (listing as any).booking_count?.toString() || '0' },
        { label: 'Average Rating', value: (listing as any).average_rating ? `${(listing as any).average_rating.toFixed(1)} / 5` : 'N/A' },
        { label: 'Review Count', value: (listing as any).review_count?.toString() || '0' },
        { label: 'Response Time', value: (listing as any).response_time || 'N/A' },
      ],
    },
    {
      title: 'Media & SEO',
      fields: [
        { label: 'Images', value: (listing as any).images?.length ? `${(listing as any).images.length} image(s)` : 'None' },
        { label: 'Video URL', value: (listing as any).video_url ? 'Yes' : 'No' },
        { label: 'Tags', value: (listing as any).tags?.join(', ') || 'None' },
        { label: 'AI Tools Used', value: (listing as any).ai_tools_used?.join(', ') || 'None' },
        { label: 'Cancellation Policy', value: (listing as any).cancellation_policy || 'N/A' },
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
        {
          label: 'Published At',
          value: (listing as any).published_at ? formatDateTime((listing as any).published_at) : 'N/A',
        },
        {
          label: 'Archived At',
          value: (listing as any).archived_at ? formatDateTime((listing as any).archived_at) : 'N/A',
        },
        { label: 'Is Template', value: (listing as any).is_template ? 'Yes' : 'No' },
        { label: 'Is Deletable', value: (listing as any).is_deletable === false ? 'No' : 'Yes' },
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
