/**
 * Filename: WiselistItemCard.tsx
 * Purpose: Display wiselist item (profile or listing) in card format (v5.7)
 * Path: /app/components/wiselists/WiselistItemCard.tsx
 * Created: 2025-11-15
 *
 * Polymorphic component - handles both profile and listing items
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { WiselistItem } from '@/types';
import { X, MapPin, Clock } from 'lucide-react';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './WiselistItemCard.module.css';

interface WiselistItemCardProps {
  item: WiselistItem;
  onRemove?: (itemId: string) => void;
  canEdit?: boolean;
}

export default function WiselistItemCard({
  item,
  onRemove,
  canEdit = false,
}: WiselistItemCardProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm('Remove this item from the wiselist?')) {
      onRemove?.(item.id);
    }
  };

  // Render profile item
  if (item.profile) {
    const profile = item.profile;
    const avatarUrl = getProfileImageUrl(profile);
    const href = `/profile/${profile.slug || profile.id}`;

    return (
      <Link href={href} className={styles.card}>
        {canEdit && onRemove && (
          <button
            onClick={handleRemove}
            className={styles.removeButton}
            title="Remove from wiselist"
          >
            <X size={16} />
          </button>
        )}

        <div className={styles.avatarWrapper}>
          <Image
            src={avatarUrl}
            alt={profile.full_name || 'Profile'}
            width={80}
            height={80}
            className={styles.avatar}
          />
        </div>

        <div className={styles.content}>
          <h3 className={styles.title}>{profile.full_name || 'Unknown'}</h3>

          {profile.bio && (
            <p className={styles.bio}>{profile.bio}</p>
          )}

          {profile.city && (
            <div className={styles.meta}>
              <MapPin size={14} />
              {profile.city}
            </div>
          )}

          {item.notes && (
            <div className={styles.notes}>
              <p className={styles.notesLabel}>Note:</p>
              <p className={styles.notesText}>{item.notes}</p>
            </div>
          )}

          {item.added_by && (
            <p className={styles.addedBy}>
              Added by {item.added_by.full_name || 'Unknown'}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // Render listing item
  if (item.listing) {
    const listing = item.listing;
    const href = `/marketplace/${listing.slug || listing.id}`;

    return (
      <Link href={href} className={styles.card}>
        {canEdit && onRemove && (
          <button
            onClick={handleRemove}
            className={styles.removeButton}
            title="Remove from wiselist"
          >
            <X size={16} />
          </button>
        )}

        <div className={styles.content}>
          <div className={styles.listingHeader}>
            <h3 className={styles.title}>{listing.title}</h3>
            {listing.hourly_rate && (
              <span className={styles.price}>£{listing.hourly_rate}/hr</span>
            )}
          </div>

          <div className={styles.tags}>
            {listing.subjects?.[0] && (
              <span className={styles.tagPrimary}>{listing.subjects[0]}</span>
            )}
            {listing.levels?.[0] && (
              <span className={styles.tagSecondary}>{listing.levels[0]}</span>
            )}
          </div>

          {listing.description && (
            <p className={styles.description}>{listing.description}</p>
          )}

          {item.notes && (
            <div className={styles.notes}>
              <p className={styles.notesLabel}>Note:</p>
              <p className={styles.notesText}>{item.notes}</p>
            </div>
          )}

          {item.added_by && (
            <p className={styles.addedBy}>
              Added by {item.added_by.full_name || 'Unknown'}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // Fallback (should never happen)
  return null;
}
