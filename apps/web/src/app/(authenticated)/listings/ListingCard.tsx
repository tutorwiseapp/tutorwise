/*
 * Filename: src/app/(authenticated)/listings/ListingCard.tsx
 * Purpose: Horizontal listing card for hub view (SDD v3.6)
 * Created: 2025-11-03
 * Specification: SDD v3.6 - Horizontal card layout with 192x192 image
 */
'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Listing } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './ListingCard.module.css';

interface ListingCardProps {
  listing: Listing;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export default function ListingCard({
  listing,
  onDelete,
  onPublish,
  onUnpublish,
  onArchive,
  onDuplicate,
}: ListingCardProps) {
  const router = useRouter();
  const isTemplate = listing.is_template === true;

  // Use the same profile image logic as NavMenu (includes academic avatar fallback)
  const imageUrl = getProfileImageUrl({
    id: listing.profile_id,
    avatar_url: listing.avatar_url,
  });

  // Format price
  const formattedPrice = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(listing.hourly_rate || 0);

  // Get status badge styling
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'published':
        return styles.statusPublished;
      case 'draft':
        return styles.statusDraft;
      case 'archived':
        return styles.statusArchived;
      default:
        return styles.statusDraft;
    }
  };

  return (
    <div className={styles.card}>
      {/* Left: Image (192x192) */}
      <div className={styles.imageWrapper}>
        <Image
          src={imageUrl}
          alt={listing.full_name || listing.title}
          width={192}
          height={192}
          className={styles.image}
        />
        {isTemplate && (
          <div className={styles.templateBadge}>
            Template
          </div>
        )}
      </div>

      {/* Right: Content */}
      <div className={styles.content}>
        {/* Top Section: Title, Description, Meta */}
        <div className={styles.topSection}>
          <div className={styles.headerRow}>
            <h3 className={styles.title}>{listing.title}</h3>
            <span className={`${styles.statusBadge} ${getStatusColor(listing.status)}`}>
              {listing.status || 'draft'}
            </span>
          </div>

          <p className={styles.description}>
            {listing.description}
          </p>

          <div className={styles.meta}>
            <span className={styles.metaItem}>
              {listing.subjects?.join(', ') || 'No subjects'}
            </span>
            <span className={styles.metaDivider}>•</span>
            <span className={styles.metaItem}>
              {formattedPrice}/hr
            </span>
            <span className={styles.metaDivider}>•</span>
            <span className={styles.metaItem}>
              {listing.location_type || 'Not specified'}
            </span>
          </div>

          {!isTemplate && (
            <div className={styles.stats}>
              <span className={styles.statItem}>
                <span className={styles.statValue}>{listing.view_count || 0}</span> views
              </span>
              <span className={styles.statItem}>
                <span className={styles.statValue}>{listing.inquiry_count || 0}</span> inquiries
              </span>
              <span className={styles.statItem}>
                <span className={styles.statValue}>{listing.booking_count || 0}</span> bookings
              </span>
            </div>
          )}
        </div>

        {/* Bottom Section: Actions */}
        <div className={styles.actions}>
          {isTemplate ? (
            // Template: Only show Duplicate button
            <Button
              variant="primary"
              size="sm"
              onClick={() => onDuplicate(listing.id)}
            >
              Duplicate
            </Button>
          ) : (
            // Regular listing: Show all actions
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/edit-listing/${listing.id}`)}
              >
                Edit
              </Button>

              {listing.status === 'published' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onUnpublish(listing.id)}
                >
                  Unpublish
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onPublish(listing.id)}
                >
                  Publish
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onDuplicate(listing.id)}
              >
                Duplicate
              </Button>

              {listing.status !== 'archived' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onArchive(listing.id)}
                >
                  Archive
                </Button>
              )}

              <Button
                variant="danger"
                size="sm"
                onClick={() => onDelete(listing.id)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
