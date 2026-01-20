/**
 * Filename: SavedItemCard.tsx
 * Purpose: Display saved profile or listing item with HubDetailCard layout
 * Created: 2025-12-09
 * Updated: 2025-12-09 - Refactored to match BookingCard implementation pattern
 * Design: Uses HubDetailCard component with imageHref for consistent hub layout
 */

'use client';

import React from 'react';
import { WiselistItem } from '@/types';
import getProfileImageUrl from '@/lib/utils/image';
import { slugify } from '@/lib/utils/slugify';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import Button from '@/app/components/ui/actions/Button';

interface SavedItemCardProps {
  item: WiselistItem;
  onAddToList: (itemId: string) => void;
  onUnsave: (itemId: string, profileId?: string, listingId?: string) => void;
}

export default function SavedItemCard({
  item,
  onAddToList,
  onUnsave,
}: SavedItemCardProps) {
  // Determine if this is a profile or listing (Migration 106: Use cached_type if available)
  const isProfile = item.cached_type === 'profile' || (!!item.profile && !item.listing);

  // Get the appropriate data (Migration 106: Fallback to cached fields if source deleted)
  const profile = item.profile;
  const listing = item.listing;

  // Build the card details (Migration 106: Use cached fields with fallback)
  const name = isProfile
    ? (profile?.full_name || item.cached_title || 'Unknown Profile')
    : (listing?.title || item.cached_title || 'Unknown Listing');

  const description = isProfile
    ? (profile?.bio || '')
    : (listing?.description || '');

  // Migration 106: Use cached avatar and subjects with fallback
  const imageUrl = isProfile
    ? getProfileImageUrl({
        id: profile?.id || item.profile_id || '',
        avatar_url: profile?.avatar_url || item.cached_avatar_url,
        full_name: profile?.full_name || item.cached_title, // Use profile name for initials
      })
    : getProfileImageUrl({
        id: listing?.profile_id || '',
        avatar_url: listing?.images?.[0]?.url,
        full_name: listing?.title || item.cached_title, // Use listing title for initials
      }, true, listing?.subjects?.[0] || item.cached_subjects?.[0]); // Migration 106: Use cached subject if listing deleted

  // Migration 106: Show "(deleted)" indicator if source no longer exists
  const isDeleted = isProfile ? !profile : !listing;
  const deletedIndicator = isDeleted ? ' (deleted)' : '';

  const linkUrl = isProfile
    ? (profile?.id ? `/public-profile/${profile.id}/${profile.slug || slugify(profile.full_name || '')}` : '#')
    : (listing?.id ? `/listings/${listing.id}/${listing.slug || slugify(listing.title || '')}` : '#');

  const handleUnsave = () => {
    onUnsave(item.id, item.profile_id || undefined, item.listing_id || undefined);
  };

  const handleAddToList = () => {
    onAddToList(item.id);
  };

  // Format saved date
  const savedDate = new Date(item.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Format added by
  const addedBy = item.added_by?.full_name || 'You';

  // Determine status badge
  const getStatusVariant = (): 'success' | 'warning' | 'error' | 'neutral' | 'info' => {
    // For saved items, we use 'success' to indicate "Saved"
    return 'success';
  };

  // Build details grid - 3x3 grid (9 fields) matching BookingCard pattern
  // Migration 106: Use cached fields if profile/listing deleted
  const details = isProfile ? [
    // Row 1
    { label: 'Type', value: 'Profile' },
    { label: 'Saved', value: savedDate },
    { label: 'Added By', value: addedBy },
    // Row 2 - Migration 106: Fallback to cached_active_role
    { label: 'Role', value: profile?.active_role || item.cached_active_role || 'N/A' },
    { label: 'Location', value: profile?.city || 'N/A' },
    { label: 'Status', value: isDeleted ? 'Deleted' : 'Active' },
    // Row 3
    { label: 'Verified', value: 'Yes' },
    { label: 'Rating', value: 'N/A' },
    { label: 'ID', value: (
      <span
        title={profile?.id || ''}
        style={{
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: 'help'
        }}
      >
        {profile?.id || 'N/A'}
      </span>
    )},
  ] : [
    // Row 1
    { label: 'Type', value: 'Listing' },
    { label: 'Saved', value: savedDate },
    { label: 'Added By', value: addedBy },
    // Row 2 - Migration 106: Fallback to cached fields
    { label: 'Rate', value: listing?.hourly_rate ? `£${listing.hourly_rate}/hr` : 'N/A' },
    { label: 'Type', value: listing?.delivery_mode?.[0] || 'N/A' },
    { label: 'Subject', value: listing?.subjects?.[0] || item.cached_subjects?.[0] || 'N/A' },
    // Row 3 - Migration 106: Show tutor name and deleted status
    { label: 'Level', value: listing?.levels?.[0] || 'N/A' },
    { label: 'Status', value: isDeleted ? 'Deleted' : 'Active' },
    { label: 'ID', value: (
      <span
        title={listing?.id || ''}
        style={{
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: 'help'
        }}
      >
        {listing?.id || 'N/A'}
      </span>
    )},
  ];

  // Build actions - matching BookingCard button pattern
  const actions = (
    <>
      <Button variant="secondary" size="sm" onClick={handleAddToList}>
        Add to List
      </Button>
      <Button variant="ghost" size="sm" onClick={handleUnsave}>
        Unsave
      </Button>
    </>
  );

  return (
    <HubDetailCard
      image={{
        src: imageUrl,
        alt: name,
        fallbackChar: name.substring(0, 2).toUpperCase() || '?',
      }}
      title={name + deletedIndicator}
      titleHref={isDeleted ? undefined : linkUrl}
      status={{
        label: 'Saved',
        variant: getStatusVariant(),
      }}
      description={description}
      details={details}
      actions={actions}
      imageHref={isDeleted ? undefined : linkUrl}
    />
  );
}
