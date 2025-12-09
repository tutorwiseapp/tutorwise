/**
 * Filename: SavedItemCard.tsx
 * Purpose: Display saved profile or listing item with Add to List and Unsave buttons
 * Created: 2025-12-09
 * Updated: 2025-12-09 - Migrated to HubDetailCard for consistent styling
 */

'use client';

import React from 'react';
import Link from 'next/link';
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
  // Determine if this is a profile or listing
  const isProfile = !!item.profile;

  // Get the appropriate data
  const profile = item.profile;
  const listing = item.listing;

  // Build the card details
  const name = isProfile
    ? profile?.full_name || 'Unknown'
    : listing?.title || 'Unknown Listing';

  const description = isProfile
    ? profile?.bio || ''
    : listing?.description || '';

  const imageUrl = isProfile
    ? getProfileImageUrl({
        id: profile?.id || '',
        avatar_url: profile?.avatar_url,
      })
    : listing?.images?.[0]?.url || null;

  const linkUrl = isProfile
    ? `/public-profile/${profile?.id}/${profile?.slug || slugify(profile?.full_name || '')}`
    : `/listings/${listing?.id}/${listing?.slug || slugify(listing?.title || '')}`;

  const handleUnsave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onUnsave(item.id, item.profile_id || undefined, item.listing_id || undefined);
  };

  const handleAddToList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToList(item.id);
  };

  // Format saved date
  const savedDate = new Date(item.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Build details array
  const details = [
    { label: 'Type', value: isProfile ? 'Profile' : 'Listing' },
    { label: 'Saved', value: savedDate },
  ];

  // Build actions array
  const actions = [
    <Button key="add" variant="secondary" size="sm" onClick={handleAddToList}>
      Add to List
    </Button>,
    <Button key="unsave" variant="ghost" size="sm" onClick={handleUnsave}>
      Unsave
    </Button>,
  ];

  return (
    <Link href={linkUrl} style={{ textDecoration: 'none', color: 'inherit' }}>
      <HubDetailCard
        image={{
          src: imageUrl,
          alt: name,
          fallbackChar: name.charAt(0).toUpperCase(),
        }}
        title={name}
        description={description}
        details={details}
        actions={actions}
      />
    </Link>
  );
}
