'use client';

import type { MarketplaceItem } from '@/types/marketplace';
import { isProfile, isListing, isOrganisation, isAITutor } from '@/types/marketplace';
import MarketplaceListingCard from './MarketplaceListingCard';
import TutorProfileCard from './TutorProfileCard';
import MarketplaceOrganisationCard from './MarketplaceOrganisationCard';
import AITutorMarketplaceCard from './AITutorMarketplaceCard';
import styles from './MarketplaceGrid.module.css';

interface MarketplaceGridProps {
  items: MarketplaceItem[]; // Unified: profiles + listings
  isLoading: boolean;
  isLoadingMore: boolean;
  hasSearched: boolean;
  hasMore: boolean;
  total: number;
  onLoadMore: () => void;
}

export default function MarketplaceGrid({
  items = [], // Default to empty array
  isLoading,
  isLoadingMore,
  hasSearched,
  hasMore,
  total,
  onLoadMore
}: MarketplaceGridProps) {

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

  if (hasSearched && items.length === 0) {
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
          <h3 className={styles.emptyTitle}>No exact matches found</h3>
          <p className={styles.emptyText}>
            We couldn&apos;t find tutors matching your exact criteria, but here are some similar options that might interest you. Try broadening your search or explore our featured tutors below.
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
            ? `${items.length}${total > items.length ? `+ of ${total}` : ''} result${items.length !== 1 ? 's' : ''} found`
            : 'Featured Tutors & Services'}
        </h2>
      </div>

      <div className={styles.grid}>
        {items.map((item) => {
          // Render appropriate card based on item type
          if (isProfile(item)) {
            return <TutorProfileCard key={`profile-${item.data.id}`} profile={item.data} />;
          } else if (isListing(item)) {
            return <MarketplaceListingCard key={`listing-${item.data.id}`} listing={item.data} />;
          } else if (isOrganisation(item)) {
            return <MarketplaceOrganisationCard key={`organisation-${item.data.id}`} organisation={item.data} />;
          } else if (isAITutor(item)) {
            return <AITutorMarketplaceCard key={`ai-tutor-${item.data.id}`} aiTutor={item.data} />;
          }
          return null;
        })}
      </div>

      {/* Load More Button - Airbnb style */}
      {hasMore && !isLoading && items.length > 0 && (
        <div className={styles.loadMoreContainer}>
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className={styles.loadMoreButton}
          >
            {isLoadingMore ? (
              <>
                <div className={styles.loadMoreSpinner}></div>
                <span>Loading...</span>
              </>
            ) : (
              <span>Load more</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
