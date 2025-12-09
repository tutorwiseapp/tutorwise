/**
 * Filename: SavedItemCard.tsx
 * Purpose: Display saved profile or listing item with Add to List and Unsave buttons
 * Created: 2025-12-09
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WiselistItem } from '@/types';
import getProfileImageUrl from '@/lib/utils/image';
import { slugify } from '@/lib/utils/slugify';
import Button from '@/app/components/ui/actions/Button';
import styles from './SavedItemCard.module.css';

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
  const [imageError, setImageError] = useState(false);

  // Determine if this is a profile or listing
  const isProfile = !!item.profile;
  const isListing = !!item.listing;

  // Get the appropriate data
  const profile = item.profile;
  const listing = item.listing;

  // Build the card details
  const name = isProfile
    ? profile?.full_name || 'Unknown'
    : listing?.title || 'Unknown Listing';

  const description = isProfile
    ? profile?.headline || profile?.bio || ''
    : listing?.description || '';

  const imageUrl = isProfile
    ? getProfileImageUrl({
        id: profile?.id || '',
        avatar_url: profile?.avatar_url,
      })
    : listing?.images?.[0]?.url || '/images/placeholder-listing.png';

  const linkUrl = isProfile
    ? `/public-profile/${profile?.id}/${profile?.slug || slugify(profile?.full_name || '')}`
    : `/listings/${listing?.id}/${listing?.slug || slugify(listing?.title || '')}`;

  const handleUnsave = () => {
    onUnsave(item.id, item.profile_id || undefined, item.listing_id || undefined);
  };

  const handleAddToList = () => {
    onAddToList(item.id);
  };

  return (
    <div className={styles.card}>
      <Link href={linkUrl} className={styles.cardLink}>
        <div className={styles.imageContainer}>
          {!imageError ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className={styles.image}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.imageFallback}>
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className={styles.content}>
          <h3 className={styles.title}>{name}</h3>
          {description && (
            <p className={styles.description}>
              {description.length > 100
                ? `${description.substring(0, 100)}...`
                : description}
            </p>
          )}
          <div className={styles.meta}>
            <span className={styles.type}>
              {isProfile ? 'Profile' : 'Listing'}
            </span>
            <span className={styles.date}>
              Saved {new Date(item.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>
        </div>
      </Link>

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={handleAddToList}>
          Add to List
        </Button>
        <Button variant="ghost" size="sm" onClick={handleUnsave}>
          Unsave
        </Button>
      </div>
    </div>
  );
}
