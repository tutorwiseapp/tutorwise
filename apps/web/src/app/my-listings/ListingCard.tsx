'use client';

import Link from 'next/link';
import type { Listing } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';
import styles from './ListingCard.module.css';

interface ListingCardProps {
  listing: Listing;
  onDelete: (id: string) => void;
  onToggleStatus: (listing: Listing) => void;
}

export default function ListingCard({ listing, onDelete, onToggleStatus }: ListingCardProps) {
  const imageUrl = listing.images?.[0];

  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        {imageUrl ? (
          <img src={imageUrl} alt={listing.title} className={styles.image} />
        ) : (
          <div className={styles.imagePlaceholder}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor" />
            </svg>
          </div>
        )}
        <span className={`${styles.statusBadge} ${styles[listing.status]}`}>
          {listing.status}
        </span>
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
        <div className={styles.actions}>
          <Link href={`/my-listings/${listing.id}/edit`}>
            <Button variant="outline" size="sm" fullWidth>Edit</Button>
          </Link>
          <Button variant="outline" size="sm" fullWidth onClick={() => onToggleStatus(listing)}>
            {listing.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
          <Button variant="danger" size="sm" fullWidth onClick={() => onDelete(listing.id)}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
