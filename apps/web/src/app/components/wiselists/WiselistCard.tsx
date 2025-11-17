/**
 * Filename: WiselistCard.tsx
 * Purpose: Display wiselist in HubRowCard format (v5.7.1)
 * Path: /app/components/wiselists/WiselistCard.tsx
 * Created: 2025-11-15
 * Updated: 2025-11-17 - Redesigned to match HubRowCard v1 specification
 *
 * Follows hub-row-card-ui-design-v1.md section 2.6:
 * - NO icon (removed List icon from left column)
 * - 160px owner avatar column (left)
 * - 4-row content structure (right): Title + Badge, Description, Metadata, Collaborators
 * - Action dock (bottom): Edit + Share buttons
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Wiselist } from '@/types';
import { Lock, Globe, Edit2, Share2 } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './WiselistCard.module.css';

interface WiselistCardProps {
  wiselist: Wiselist;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
}

export default function WiselistCard({
  wiselist,
  onDelete,
  onShare,
}: WiselistCardProps) {
  const { profile } = useUserProfile();
  const isPublic = wiselist.visibility === 'public';
  const itemCount = wiselist.item_count || 0;
  const collabCount = wiselist.collaborator_count || 0;

  // Get owner avatar (current user for now, until we have owner data in the wiselist)
  const ownerAvatarUrl = profile ? getProfileImageUrl(profile) : '/images/default-avatar.png';

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm(`Delete "${wiselist.name}"? This action cannot be undone.`)) {
      onDelete?.(wiselist.id);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShare?.(wiselist.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `/wiselists/${wiselist.id}`;
  };

  return (
    <div className={styles.hubRowCard}>
      {/* Left Column: Owner Avatar (160px fixed) */}
      <div className={styles.avatarColumn}>
        <Link href={`/wiselists/${wiselist.id}`} className={styles.avatarLink}>
          <Image
            src={ownerAvatarUrl}
            alt={profile?.full_name || 'Owner'}
            width={160}
            height={160}
            className={styles.avatar}
          />
        </Link>
      </div>

      {/* Right Column: Content (4-row structure) */}
      <div className={styles.contentColumn}>
        {/* Row 1: Header (Title + Badge) */}
        <div className={styles.headerRow}>
          <Link href={`/wiselists/${wiselist.id}`} className={styles.titleLink}>
            <h3 className={styles.title}>{wiselist.name}</h3>
          </Link>
          <span className={`${styles.badge} ${isPublic ? styles.badgePublic : styles.badgePrivate}`}>
            {isPublic ? (
              <>
                <Globe size={12} />
                Public
              </>
            ) : (
              <>
                <Lock size={12} />
                Private
              </>
            )}
          </span>
        </div>

        {/* Row 2: Description */}
        {wiselist.description && (
          <p className={styles.description}>{wiselist.description}</p>
        )}

        {/* Row 3: Metadata (bullet-separated) */}
        <div className={styles.metadataRow}>
          <span>
            {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
          </span>
          <span className={styles.bullet}>•</span>
          <span>
            Updated {new Date(wiselist.updated_at || wiselist.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Row 4: Collaborators */}
        {collabCount > 0 && (
          <div className={styles.collaboratorsRow}>
            <span>Collaborators: {collabCount}</span>
          </div>
        )}

        {/* Action Dock */}
        <div className={styles.actionDock}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleEdit}
          >
            <Edit2 size={16} />
            Edit
          </Button>
          {isPublic && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleShare}
            >
              <Share2 size={16} />
              Share
            </Button>
          )}
          {onDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
