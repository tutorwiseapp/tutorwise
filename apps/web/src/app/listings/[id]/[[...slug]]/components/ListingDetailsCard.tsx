/**
 * Filename: ListingDetailsCard.tsx
 * Purpose: Display listing description and details
 * Created: 2025-12-09
 * Adapted from: AboutCard.tsx
 */

import type { ListingV41 } from '@/types/listing-v4.1';
import Card from '@/app/components/ui/data-display/Card';
import styles from './ListingDetailsCard.module.css';

interface ListingDetailsCardProps {
  listing: ListingV41;
}

export function ListingDetailsCard({ listing }: ListingDetailsCardProps) {
  // If no description, show empty state
  if (!listing.description) {
    return (
      <Card className={styles.detailsCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>About This Listing</h2>
        </div>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            No description available for this listing.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.detailsCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>About This Listing</h2>
      </div>
      <div className={styles.descriptionContent}>
        <p className={styles.descriptionText}>{listing.description}</p>
      </div>
    </Card>
  );
}
