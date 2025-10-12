'use client';

import type { Listing } from '@tutorwise/shared-types';
import TutorCard from './TutorCard';
import styles from './MarketplaceGrid.module.css';

interface MarketplaceGridProps {
  listings: Listing[];
  isLoading: boolean;
  hasSearched: boolean;
}

export default function MarketplaceGrid({ listings, isLoading, hasSearched }: MarketplaceGridProps) {
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Finding the perfect tutors for you...</p>
        </div>
      </div>
    );
  }

  if (hasSearched && listings.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <svg
            className={styles.emptyIcon}
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h3 className={styles.emptyTitle}>No tutors found</h3>
          <p className={styles.emptyText}>
            Try adjusting your search criteria or browse our featured tutors below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gridHeader}>
        <h2 className={styles.resultCount}>
          {hasSearched
            ? `${listings.length} tutor${listings.length !== 1 ? 's' : ''} found`
            : 'Featured Tutors'}
        </h2>
      </div>

      <div className={styles.grid}>
        {listings.map((listing) => (
          <TutorCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
