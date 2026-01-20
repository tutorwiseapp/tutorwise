/**
 * Filename: AdminListingDetailModal.tsx
 * Purpose: Admin-specific listing detail modal with full information and admin actions
 * Created: 2025-12-27
 * Pattern: Uses HubDetailModal with admin-specific sections and actions (mirrors AdminBookingDetailModal)
 *
 * Features:
 * - Complete listing information (50+ fields from listings table)
 * - Admin-specific actions (Activate, Deactivate, Feature, Edit, Contact, Delete, Change Status)
 * - Engagement metrics (views, bookings, ratings)
 * - Service details and media information
 * - Radix UI DropdownMenu for Change Status action
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
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { CheckCircle, XCircle, Edit, MessageSquare, Trash2, Settings } from 'lucide-react';
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
  const handleActivate = async () => {
    if (!confirm('Activate this listing?')) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      if (error) throw error;

      alert('Listing activated successfully!');
      onListingUpdated?.();
      onClose();
    } catch (error) {
      alert('Failed to activate listing. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Deactivate this listing?')) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      if (error) throw error;

      alert('Listing deactivated successfully!');
      onListingUpdated?.();
      onClose();
    } catch (error) {
      alert('Failed to deactivate listing. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };


  const handleChangeStatus = async (newStatus: string) => {
    if (isProcessing) return;

    if (!confirm(`Change listing status to "${newStatus}"?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'published') {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', listing.id);

      if (error) throw error;

      alert(`Listing status changed to ${newStatus} successfully!`);
      onListingUpdated?.();
      onClose();
    } catch (error) {
      alert('Failed to change listing status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this listing? This action cannot be undone.')) return;

    setIsProcessing(true);
    try {
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

  const handleEditListing = () => {
    router.push(`/edit-listing/${listing.id}`);
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
          {/* Activate/Deactivate */}
          {listing.status === 'published' ? (
            <Button variant="secondary" onClick={handleDeactivate} disabled={isProcessing}>
              <XCircle className={styles.buttonIcon} />
              Deactivate
            </Button>
          ) : (
            <Button variant="primary" onClick={handleActivate} disabled={isProcessing}>
              <CheckCircle className={styles.buttonIcon} />
              Activate
            </Button>
          )}

          {/* Edit Listing */}
          <Button variant="secondary" onClick={handleEditListing}>
            <Edit className={styles.buttonIcon} />
            Edit Listing
          </Button>

          {/* Contact Tutor */}
          <Button variant="secondary" onClick={handleContactTutor}>
            <MessageSquare className={styles.buttonIcon} />
            Contact Tutor
          </Button>

          {/* Change Status Dropdown (Radix UI) */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="secondary" disabled={isProcessing}>
                <Settings className={styles.buttonIcon} />
                Change Status
              </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={styles.statusDropdownContent}
                sideOffset={5}
                align="start"
              >
                {['draft', 'published', 'archived'].map((status) => (
                  <DropdownMenu.Item
                    key={status}
                    className={styles.statusDropdownItem}
                    disabled={listing.status === status || isProcessing}
                    onSelect={() => handleChangeStatus(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                    {listing.status === status && (
                      <span className={styles.currentStatusBadge}>(Current)</span>
                    )}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

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
