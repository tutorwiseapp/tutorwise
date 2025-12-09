/**
 * Filename: WiselistItemCard.tsx
 * Purpose: Display wiselist item (profile or listing) in card format (v5.7)
 * Path: /app/components/wiselists/WiselistItemCard.tsx
 * Created: 2025-11-15
 * Updated: 2025-12-09 - Added bulk mode, Add to List, Unsave actions
 *
 * Polymorphic component - handles both profile and listing items
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { WiselistItem } from '@/types';
import { X, MapPin, Plus, Heart } from 'lucide-react';
import getProfileImageUrl from '@/lib/utils/image';
import Button from '@/app/components/ui/actions/Button';
import styles from './WiselistItemCard.module.css';

interface WiselistItemCardProps {
  item: WiselistItem;
  onRemove?: (itemId: string) => void;
  canEdit?: boolean;
  // New props for detail page
  isMySaves?: boolean;
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onAddToList?: () => void;
  onUnsave?: () => void;
}

export default function WiselistItemCard({
  item,
  onRemove,
  canEdit = false,
  isMySaves = false,
  bulkMode = false,
  isSelected = false,
  onToggleSelect,
  onAddToList,
  onUnsave,
}: WiselistItemCardProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm('Remove this item from the wiselist?')) {
      onRemove?.(item.id);
    }
  };

  const handleAddToList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToList?.();
  };

  const handleUnsave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onUnsave?.();
  };

  // Render profile item
  if (item.profile) {
    const profile = item.profile;
    const avatarUrl = getProfileImageUrl(profile);
    const href = `/profile/${profile.slug || profile.id}`;

    return (
      <div className={`${styles.card} ${bulkMode ? styles.bulkMode : ''} ${isSelected ? styles.selected : ''}`}>
        {/* Bulk Mode Checkbox */}
        {bulkMode && (
          <div className={styles.checkbox}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className={styles.checkboxInput}
            />
          </div>
        )}

        <Link href={href} className={styles.cardLink}>
          {canEdit && onRemove && !isMySaves && !bulkMode && (
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
          </div>
        </Link>

        {/* Actions for My Saves */}
        {!bulkMode && isMySaves && (
          <div className={styles.actions}>
            <Button variant="secondary" size="sm" onClick={handleAddToList}>
              <Plus size={16} />
              Add to List
            </Button>
            <Button variant="ghost" size="sm" onClick={handleUnsave}>
              <Heart size={16} fill="currentColor" />
              Unsave
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Render listing item
  if (item.listing) {
    const listing = item.listing;
    const href = `/marketplace/${listing.slug || listing.id}`;

    return (
      <div className={`${styles.card} ${bulkMode ? styles.bulkMode : ''} ${isSelected ? styles.selected : ''}`}>
        {/* Bulk Mode Checkbox */}
        {bulkMode && (
          <div className={styles.checkbox}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className={styles.checkboxInput}
            />
          </div>
        )}

        <Link href={href} className={styles.cardLink}>
          {canEdit && onRemove && !isMySaves && !bulkMode && (
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
          </div>
        </Link>

        {/* Actions for My Saves */}
        {!bulkMode && isMySaves && (
          <div className={styles.actions}>
            <Button variant="secondary" size="sm" onClick={handleAddToList}>
              <Plus size={16} />
              Add to List
            </Button>
            <Button variant="ghost" size="sm" onClick={handleUnsave}>
              <Heart size={16} fill="currentColor" />
              Unsave
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Fallback (should never happen)
  return null;
}
