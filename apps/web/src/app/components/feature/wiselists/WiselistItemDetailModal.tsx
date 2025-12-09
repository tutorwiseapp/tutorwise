/**
 * Filename: WiselistItemDetailModal.tsx
 * Purpose: Modal for displaying complete wiselist item details (profile or listing)
 * Created: 2025-12-09
 * Specification: Uses HubDetailModal to show all item information in view-only mode
 */

'use client';

import React from 'react';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';
import type { WiselistItem } from '@/types';

interface WiselistItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WiselistItem | null;
}

export default function WiselistItemDetailModal({
  isOpen,
  onClose,
  item,
}: WiselistItemDetailModalProps) {
  // Safety check
  if (!item) {
    return null;
  }

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

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

  // Handle Profile Item
  if (item.profile) {
    const profile = item.profile;

    const sections: DetailSection[] = [
      {
        title: 'Profile Information',
        fields: [
          { label: 'Full Name', value: profile.full_name || 'Not specified' },
          { label: 'Email', value: profile.email || 'Not specified' },
          { label: 'Bio', value: profile.bio || 'Not specified' },
          { label: 'City', value: profile.city || 'Not specified' },
          { label: 'Country', value: profile.country || 'Not specified' },
          { label: 'Profile ID', value: profile.id },
        ],
      },
      {
        title: 'Wiselist Details',
        fields: [
          { label: 'Added to List', value: formatDateTime(item.created_at) },
          { label: 'Notes', value: item.notes || 'No notes added' },
        ],
      },
    ];

    return (
      <HubDetailModal
        isOpen={isOpen}
        onClose={onClose}
        title={profile.full_name || 'Profile Details'}
        subtitle={profile.email || undefined}
        sections={sections}
        actions={
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        }
      />
    );
  }

  // Handle Listing Item
  if (item.listing) {
    const listing = item.listing;

    const sections: DetailSection[] = [
      {
        title: 'Listing Information',
        fields: [
          { label: 'Title', value: listing.title },
          { label: 'Description', value: listing.description || 'Not specified' },
          { label: 'Hourly Rate', value: listing.hourly_rate ? `£${listing.hourly_rate}/hr` : 'Not specified' },
          { label: 'Listing ID', value: listing.id },
        ],
      },
      {
        title: 'Subjects & Levels',
        fields: [
          { label: 'Subjects', value: listing.subjects?.join(', ') || 'Not specified' },
          { label: 'Levels', value: listing.levels?.join(', ') || 'Not specified' },
        ],
      },
      {
        title: 'Wiselist Details',
        fields: [
          { label: 'Added to List', value: formatDateTime(item.created_at) },
          { label: 'Notes', value: item.notes || 'No notes added' },
        ],
      },
    ];

    return (
      <HubDetailModal
        isOpen={isOpen}
        onClose={onClose}
        title={listing.title}
        subtitle={listing.hourly_rate ? `£${listing.hourly_rate}/hr` : undefined}
        sections={sections}
        actions={
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        }
      />
    );
  }

  // Fallback (should never happen)
  return null;
}
