/**
 * Filename: apps/web/src/app/components/resources/embeds/ListingGrid.tsx
 * Purpose: MDX component for embedding filtered listing grids in resource articles
 * Created: 2026-01-16
 *
 * Usage in MDX:
 * <ListingGrid subjects={["Maths"]} levels={["GCSE"]} limit={3} />
 * <ListingGrid subjects={["Physics", "Chemistry"]} levels={["A-Level"]} locationTypes={["online"]} columns={2} title="Top A-Level Science Tutors" />
 */

'use client';

import { useState, useEffect } from 'react';
import MarketplaceListingCard from '@/app/components/feature/marketplace/MarketplaceListingCard';
import { useSignalTracking } from './useSignalTracking';
import type { Listing } from '@tutorwise/shared-types';
import styles from './ListingGrid.module.css';

interface ListingGridProps {
  subjects?: string[];
  levels?: string[];
  locationTypes?: ('online' | 'in_person' | 'hybrid')[];
  maxPrice?: number;
  limit?: number;
  columns?: 1 | 2 | 3;
  title?: string;
  articleId?: string; // Optionally passed from MDX context
}

/**
 * ListingGrid Component
 *
 * Embeds a grid of filtered listings in resource articles.
 * Creates signal_content_embeds entries and tracks signal-based attribution.
 */
export default function ListingGrid({
  subjects = [],
  levels = [],
  locationTypes = [],
  maxPrice,
  limit = 3,
  columns = 3,
  title,
  articleId,
}: ListingGridProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get article ID from URL if not provided
  const currentArticleId =
    articleId ||
    (typeof window !== 'undefined' ? window.location.pathname.split('/resources/')[1]?.split('/')[0] : '');

  const { trackEvent } = useSignalTracking(currentArticleId || '', 'listing_grid', 'article', 0);

  // Fetch listings on mount
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query params
        const params = new URLSearchParams();
        if (subjects.length > 0) params.append('subjects', subjects.join(','));
        if (levels.length > 0) params.append('levels', levels.join(','));
        if (locationTypes.length > 0) params.append('location_type', locationTypes[0]); // API supports single value
        if (maxPrice) params.append('max_price', maxPrice.toString());
        params.append('limit', limit.toString());

        const response = await fetch(`/api/marketplace/search?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to load listings');
        }

        const data = await response.json();
        setListings(data.listings || []);

        // Create resource_listing_links entries for each listing
        if (currentArticleId && data.listings?.length > 0) {
          await createResourceListingLinks(currentArticleId, data.listings);
        }
      } catch (err) {
        console.error('[ListingGrid] Error fetching listings:', err);
        setError('Unable to load listings');
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [subjects, levels, locationTypes, maxPrice, limit, currentArticleId]);

  // Create resource_listing_links entries
  const createResourceListingLinks = async (articleId: string, fetchedListings: Listing[]) => {
    try {
      const promises = fetchedListings.map(async (listing, index) => {
        const response = await fetch('/api/resources/listing-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleId: articleId,
            listingId: listing.id,
            linkType: 'manual_embed',
            positionInArticle: index,
          }),
        });

        if (!response.ok) {
          console.warn('[ListingGrid] Failed to create resource_listing_link for:', listing.id);
        }
      });

      await Promise.all(promises);
    } catch (err) {
      console.error('[ListingGrid] Error creating resource_listing_links:', err);
    }
  };

  // Track click when user clicks a listing card
  const handleListingClick = (listing: Listing) => {
    if (currentArticleId && listing.id) {
      trackEvent({
        eventType: 'click',
        targetType: 'listing',
        targetId: listing.id,
        metadata: {
          context: 'embed_listing_grid',
        },
      });

      // Increment click_count in signal_content_embeds (via view)
      fetch('/api/resources/listing-links/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: currentArticleId,
          listingId: listing.id,
        }),
      }).catch((err) => console.error('[ListingGrid] Error incrementing click count:', err));

      if (process.env.NODE_ENV === 'development') {
        console.log('[ListingGrid] Attribution tracked:', {
          articleId: currentArticleId,
          listingId: listing.id,
          context: 'embed_listing_grid',
        });
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.gridContainer}>
        {title && <h3 className={styles.gridTitle}>{title}</h3>}
        <div className={styles.loadingGrid}>
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonImage}></div>
              <div className={styles.skeletonText}></div>
              <div className={styles.skeletonText}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.gridContainer}>
        {title && <h3 className={styles.gridTitle}>{title}</h3>}
        <div className={styles.errorCard}>
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  // No results
  if (listings.length === 0) {
    return (
      <div className={styles.gridContainer}>
        {title && <h3 className={styles.gridTitle}>{title}</h3>}
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No listings found matching your criteria.</p>
        </div>
      </div>
    );
  }

  // Success: Render listings grid
  return (
    <div className={styles.gridContainer}>
      {title && <h3 className={styles.gridTitle}>{title}</h3>}

      <div className={`${styles.grid} ${styles[`grid${columns}Col`]}`}>
        {listings.map((listing) => (
          <div key={listing.id} onClick={() => handleListingClick(listing)}>
            <MarketplaceListingCard listing={listing} />
          </div>
        ))}
      </div>

      {listings.length > 0 && (
        <div className={styles.gridFooter}>
          <a href="/marketplace" className={styles.viewMoreLink}>
            View All Listings →
          </a>
        </div>
      )}
    </div>
  );
}
