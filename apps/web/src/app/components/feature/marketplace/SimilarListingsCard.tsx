/*
 * Filename: SimilarListingsCard.tsx
 * Purpose: Horizontally scrolling similar listings rail using MarketplaceListingCard
 * Used on: Listing detail page, public tutor profile, AI agent profile
 * Algorithm: Subject + location matching via searchListings API
 */

'use client';

import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Listing } from '@tutorwise/shared-types';
import Card from '@/app/components/ui/data-display/Card';
import { searchListings } from '@/lib/api/listings';
import MarketplaceListingCard from './MarketplaceListingCard';
import styles from './SimilarListingsCard.module.css';

interface SimilarListingsCardProps {
  /** Exclude a specific listing by ID (pass the current listing on listing detail pages) */
  excludeListingId?: string;
  currentSubjects?: string[];
  currentLocation?: string;
}

export default function SimilarListingsCard({
  excludeListingId,
  currentSubjects = [],
  currentLocation,
}: SimilarListingsCardProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRelated() {
      try {
        const results = await searchListings({
          filters: {
            subjects: currentSubjects,
            location_city: currentLocation,
          },
          limit: 10,
        });

        const filtered = results.listings.filter(
          (l) => (!excludeListingId || l.id !== excludeListingId) && l.status === 'published'
        );
        setListings(filtered.slice(0, 8) as Listing[]);
      } catch (error) {
        console.error('Failed to load similar listings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRelated();
  }, [excludeListingId, currentSubjects, currentLocation]);

  const seeAllLabel = currentSubjects[0] || 'tutoring';

  return (
    <Card className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>You might also like</h2>
        {!isLoading && listings.length > 0 && (
          <a href="/marketplace" className={styles.seeAllLink}>
            See all {seeAllLabel} listings
            <ArrowRight size={13} />
          </a>
        )}
      </div>

      {isLoading || listings.length === 0 ? (
        <p className={styles.emptyMessage}>No matching listings yet.</p>
      ) : (
        <div className={styles.cardContent}>
          <div className={styles.scrollContainer}>
            {listings.map((listing) => (
              <div key={listing.id} className={styles.cardWrapper}>
                <MarketplaceListingCard listing={listing} />
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
