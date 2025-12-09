/**
 * Filename: ListingDetailsCard.tsx
 * Purpose: Display listing description and details
 * Created: 2025-12-09
 * Updated: 2025-12-09 - Added subjects, levels, objectives, prerequisites
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

      {/* Description */}
      <div className={styles.descriptionContent}>
        <p className={styles.descriptionText}>{listing.description}</p>
      </div>

      {/* Subjects Covered */}
      {listing.subjects && listing.subjects.length > 0 && (
        <div className={styles.metadataSection}>
          <h3 className={styles.sectionTitle}>Subjects Covered</h3>
          <div className={styles.badgeContainer}>
            {listing.subjects.map((subject, index) => (
              <span key={index} className={`${styles.badge} ${styles.badgeSubject}`}>
                {subject}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Education Levels */}
      {listing.levels && listing.levels.length > 0 && (
        <div className={styles.metadataSection}>
          <h3 className={styles.sectionTitle}>Education Levels</h3>
          <div className={styles.badgeContainer}>
            {listing.levels.map((level, index) => (
              <span key={index} className={`${styles.badge} ${styles.badgeLevel}`}>
                {level}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Learning Objectives (if teaching_experience field contains objectives) */}
      {listing.teaching_experience && (
        <div className={styles.metadataSection}>
          <h3 className={styles.sectionTitle}>What You'll Learn</h3>
          <p className={styles.metadataText}>{listing.teaching_experience}</p>
        </div>
      )}

      {/* Specializations / Prerequisites */}
      {listing.specializations && listing.specializations.length > 0 && (
        <div className={styles.metadataSection}>
          <h3 className={styles.sectionTitle}>Specializations</h3>
          <div className={styles.badgeContainer}>
            {listing.specializations.map((spec, index) => (
              <span key={index} className={`${styles.badge} ${styles.badgeSpec}`}>
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
