/*
 * Filename: RelatedListingsCard.tsx
 * Purpose: Displays horizontally scrolling related listings
 * Algorithm: Simple matching by subject + location
 */

'use client';

import { useState, useEffect } from 'react';
import Card from '@/app/components/ui/data-display/Card';
import { searchListings } from '@/lib/api/listings';
import type { ListingV41 } from '@/types/listing-v4.1';
import styles from './RelatedListingsCard.module.css';

interface RelatedListingsCardProps {
  listingId: string;
  currentSubjects?: string[];
  currentLocation?: string;
}

export default function RelatedListingsCard({
  listingId,
  currentSubjects = [],
  currentLocation,
}: RelatedListingsCardProps) {
  const [relatedListings, setRelatedListings] = useState<ListingV41[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRelated() {
      try {
        // Search for listings with matching subjects or location
        const results = await searchListings({
          filters: {
            subjects: currentSubjects,
            location_city: currentLocation,
          },
          limit: 10,
        });

        // Filter out current listing and only show published
        const filtered = results.listings.filter(
          (l) => l.id !== listingId && l.status === 'published'
        );
        setRelatedListings(filtered.slice(0, 8) as ListingV41[]); // Max 8 related
      } catch (error) {
        console.error('Failed to load related listings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRelated();
  }, [listingId, currentSubjects, currentLocation]);

  // Always show the card, but with empty message if no results
  if (isLoading || relatedListings.length === 0) {
    return (
      <Card className={styles.card}>
        <h4 className={styles.title}>You might also like</h4>
        <p className={styles.emptyMessage}>No matching profiles or listings yet.</p>
      </Card>
    );
  }

  return (
    <Card className={styles.card}>
      <h4 className={styles.title}>You might also like</h4>

      <div className={styles.scrollContainer}>
        {relatedListings.map((listing) => (
          <a
            key={listing.id}
            href={`/listings/${listing.id}/${listing.slug}`}
            className={styles.listingCard}
          >
            {/* Image */}
            <div className={styles.imageContainer}>
              {listing.hero_image_url ? (
                <img
                  src={listing.hero_image_url}
                  alt={listing.title}
                  className={styles.image}
                />
              ) : (
                <div className={styles.placeholderImage}>📚</div>
              )}
            </div>

            {/* Content */}
            <div className={styles.content}>
              <h5 className={styles.listingTitle}>{listing.title}</h5>
              <p className={styles.listingLocation}>
                {listing.location_city}
                {listing.location_country && `, ${listing.location_country}`}
              </p>
              <div className={styles.listingMeta}>
                <span className={styles.price}>
                  {listing.currency === 'GBP' && '£'}
                  {listing.hourly_rate || listing.package_price}
                  {listing.service_type !== 'study-package' && '/hr'}
                </span>
                {listing.average_rating && (
                  <span className={styles.rating}>
                    ★ {listing.average_rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </a>
        ))}

        {/* See More Link */}
        <a href="/marketplace" className={styles.seeMoreCard}>
          <div className={styles.seeMoreContent}>
            <span className={styles.seeMoreIcon}>→</span>
            <span className={styles.seeMoreText}>
              See all {currentSubjects[0] || 'tutoring'} listings
            </span>
          </div>
        </a>
      </div>
    </Card>
  );
}
