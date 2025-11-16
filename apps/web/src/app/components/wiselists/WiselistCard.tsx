/**
 * Filename: WiselistCard.tsx
 * Purpose: Display wiselist in card format (v5.7)
 * Path: /app/components/wiselists/WiselistCard.tsx
 * Created: 2025-11-15
 */

'use client';

import Link from 'next/link';
import { Wiselist } from '@/types';
import { List, Lock, Globe, Users, Trash2, Share2 } from 'lucide-react';
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
  const isPublic = wiselist.visibility === 'public';
  const itemCount = wiselist.item_count || 0;
  const collabCount = wiselist.collaborator_count || 0;

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

  return (
    <Link href={`/wiselists/${wiselist.id}`} className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <List size={24} className={styles.icon} />
        </div>

        <div className={styles.headerInfo}>
          <h3 className={styles.title}>{wiselist.name}</h3>

          <div className={styles.meta}>
            <span className={styles.metaItem}>
              {isPublic ? (
                <>
                  <Globe size={14} />
                  Public
                </>
              ) : (
                <>
                  <Lock size={14} />
                  Private
                </>
              )}
            </span>

            <span className={styles.metaItem}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>

            {collabCount > 0 && (
              <span className={styles.metaItem}>
                <Users size={14} />
                {collabCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {wiselist.description && (
        <p className={styles.description}>{wiselist.description}</p>
      )}

      <div className={styles.actions}>
        {isPublic && (
          <button
            onClick={handleShare}
            className={styles.actionButton}
            title="Share wiselist"
          >
            <Share2 size={16} />
            Share
          </button>
        )}

        {onDelete && (
          <button
            onClick={handleDelete}
            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
            title="Delete wiselist"
          >
            <Trash2 size={16} />
            Delete
          </button>
        )}
      </div>
    </Link>
  );
}
