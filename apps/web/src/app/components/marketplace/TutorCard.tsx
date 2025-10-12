'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Listing } from '@tutorwise/shared-types';
import { slugify } from '@/lib/utils/slugify';
import styles from './TutorCard.module.css';

interface TutorCardProps {
  listing: Listing;
}

export default function TutorCard({ listing }: TutorCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Get the first image or use a placeholder
  const imageUrl = listing.images && listing.images.length > 0
    ? listing.images[0]
    : null;

  // Calculate rating display (placeholder for now)
  const rating = 4.8; // TODO: Get actual rating from reviews
  const reviewCount = 24; // TODO: Get actual review count

  // Check if saved in localStorage on mount
  useState(() => {
    const savedTutors = localStorage.getItem('savedTutors');
    if (savedTutors) {
      const saved = JSON.parse(savedTutors);
      setIsSaved(saved.includes(listing.id));
    }
  });

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const savedTutors = localStorage.getItem('savedTutors');
    let saved = savedTutors ? JSON.parse(savedTutors) : [];

    if (isSaved) {
      saved = saved.filter((id: string) => id !== listing.id);
    } else {
      saved.push(listing.id);
    }

    localStorage.setItem('savedTutors', JSON.stringify(saved));
    setIsSaved(!isSaved);
  };

  return (
    <div className={styles.tutorCard}>
      <Link href={`/tutor/${listing.id}/${slugify(listing.title)}`} className={styles.cardLink}>
        {/* Image Section */}
        <div className={styles.imageContainer}>
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={listing.title}
              className={styles.image}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.imagePlaceholder}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          )}

          {/* Free Trial Badge - Left */}
          {listing.free_trial && (
            <div className={styles.trialBadge}>Free Trial</div>
          )}

          {/* Heart Save Icon - Right */}
          <button
            className={styles.saveButton}
            onClick={handleSaveToggle}
            aria-label={isSaved ? 'Remove from saved' : 'Save tutor'}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={isSaved ? 'currentColor' : 'none'}
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
          {/* Line 1: Name & Rating */}
          <div className={styles.row}>
            <h3 className={styles.name}>{listing.title}</h3>
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
    </div>
  );
}
