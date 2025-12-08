'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Listing } from '@tutorwise/shared-types';
import { slugify } from '@/lib/utils/slugify';
import getProfileImageUrl from '@/lib/utils/image';
import WiselistSelectionModal from '@/app/components/feature/wiselists/WiselistSelectionModal';
import styles from './TutorCard.module.css';

interface TutorCardProps {
  listing: Listing;
}

export default function TutorCard({ listing }: TutorCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Use the same profile image logic as NavMenu (includes academic avatar fallback)
  const imageUrl = getProfileImageUrl({
    id: listing.profile_id,
    avatar_url: listing.avatar_url,
  });

  // Calculate rating display (placeholder for now)
  const rating = 4.8; // TODO: Get actual rating from reviews
  const reviewCount = 24; // TODO: Get actual review count

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSaveModal(true);
  };

  return (
    <div className={styles.tutorCard}>
      <Link href={`/listings/${listing.id}/${slugify(listing.title)}`} className={styles.cardLink}>
        {/* Image Section */}
        <div className={styles.imageContainer}>
          <Image
            src={imageUrl}
            alt={listing.full_name || listing.title}
            className={styles.image}
            fill
            style={{ objectFit: 'cover' }}
          />

          {/* v5.9: Free Help Now Badge - Top Priority */}
          {listing.available_free_help && (
            <div className={styles.freeHelpBadge}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Free Help Now
            </div>
          )}

          {/* Free Trial Badge - Left (lower priority) */}
          {!listing.available_free_help && listing.free_trial && (
            <div className={styles.trialBadge}>Free Trial</div>
          )}

          {/* Heart Save Icon - Right */}
          <button
            className={styles.saveButton}
            onClick={handleSaveClick}
            aria-label="Save to wiselist"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        {/* Content Section - Clean Airbnb Format */}
        <div className={styles.content}>
          {/* Line 1: Tutor Name & Rating */}
          <div className={styles.row}>
            <h3 className={styles.name}>{listing.full_name || listing.title}</h3>
            <div className={styles.rating}>
              <svg
                className={styles.starIcon}
                width="12"
                height="12"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className={styles.ratingValue}>{rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Line 2: Subject & Level */}
          <div className={styles.row}>
            <div className={styles.subject}>
              {listing.subjects?.slice(0, 2).join(', ')}
              {listing.subjects && listing.subjects.length > 2 && ` +${listing.subjects.length - 2}`}
            </div>
            {listing.levels && listing.levels.length > 0 && (
              <div className={styles.level}>{listing.levels[0]}</div>
            )}
          </div>

          {/* Line 3: Location & Delivery Mode */}
          <div className={styles.row}>
            <div className={styles.location}>
              {listing.location_city || 'Available Online'}
            </div>
            <div className={styles.deliveryMode}>
              {listing.location_type === 'online' ? 'Online' :
               listing.location_type === 'in_person' ? 'In Person' :
               'Hybrid'}
            </div>
          </div>

          {/* Line 4: Price & Instant Book Link */}
          <div className={styles.row}>
            <div className={styles.price}>
              £{listing.hourly_rate}
              <span className={styles.priceUnit}> / hour</span>
            </div>
            <div
              className={`${styles.bookLink} ${styles.bookLinkDisabled}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // TODO: Implement instant booking flow
                console.log('Instant book tutor:', listing.id);
              }}
            >
              Instant Book
            </div>
          </div>
        </div>
      </Link>

      {/* Wiselist Selection Modal */}
      {showSaveModal && (
        <WiselistSelectionModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          targetType="listing"
          targetId={listing.id}
          targetName={listing.title}
        />
      )}
    </div>
  );
}
