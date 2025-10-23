'use client';

import Link from 'next/link';
import type { Listing } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './ListingCard.module.css';

interface ListingCardProps {
  listing: Listing;
  onDelete: (id: string) => void;
  onToggleStatus: (listing: Listing) => void;
  onDuplicate: (id: string) => void;
}

export default function ListingCard({ listing, onDelete, onToggleStatus, onDuplicate }: ListingCardProps) {
  // Use the same profile image logic as NavMenu (includes academic avatar fallback)
  const imageUrl = getProfileImageUrl({
    id: listing.profile_id,
    avatar_url: listing.avatar_url,
  });
  const isTemplate = listing.is_template === true;

  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <img src={imageUrl} alt={listing.full_name || listing.title} className={styles.image} />
        <div className={styles.badges}>
          {isTemplate && (
            <span className={styles.templateBadge}>
              Template
            </span>
          )}
          <span className={`${styles.statusBadge} ${styles[listing.status]}`}>
            {listing.status}
          </span>
        </div>
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{listing.title}</h3>
        <p className={styles.description}>{listing.description}</p>
        <div className={styles.meta}>
          <span>{listing.subjects?.join(', ')}</span>
          <span>£{listing.hourly_rate}/hr</span>
          <span>{listing.location_type}</span>
        </div>
        <div className={styles.stats}>
          <span>{listing.view_count || 0} views</span>
          <span>{listing.inquiry_count || 0} inquiries</span>
          <span>{listing.booking_count || 0} bookings</span>
        </div>

        {/* Templates: Show only Duplicate button */}
        {isTemplate ? (
          <div className={styles.actionsTemplate}>
            <Button variant="primary" size="md" fullWidth onClick={() => onDuplicate(listing.id)}>
              Duplicate
            </Button>
          </div>
        ) : (
          /* Regular listings: Show Edit, Publish/Unpublish, Delete */
          <div className={styles.actions}>
            <Link href={`/my-listings/${listing.id}/edit`}>
              <Button variant="secondary" size="sm" fullWidth>Edit</Button>
            </Link>
            <Button variant="secondary" size="sm" fullWidth onClick={() => onToggleStatus(listing)}>
              {listing.status === 'published' ? 'Unpublish' : 'Publish'}
            </Button>
            <Button variant="danger" size="sm" fullWidth onClick={() => onDelete(listing.id)}>
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
