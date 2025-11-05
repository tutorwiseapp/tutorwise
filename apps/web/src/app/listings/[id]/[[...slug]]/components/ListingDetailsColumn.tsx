/*
 * Filename: ListingDetailsColumn.tsx
 * Purpose: Main content column wrapper - holds all detail cards
 */

'use client';

import type { ListingV41 } from '@/types/listing-v4.1';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import TutorVerificationCard from './TutorVerificationCard';
import TutorCredibleStats from './TutorCredibleStats';
import ListingAvailabilityCard from './ListingAvailabilityCard';
import styles from './ListingDetailsColumn.module.css';

interface ListingDetailsColumnProps {
  listing: ListingV41;
  tutorProfile: any;
  tutorStats: {
    sessionsTaught: number;
    totalReviews: number;
    averageRating: number;
    responseTimeHours: number;
    responseRate: number;
  };
}

export default function ListingDetailsColumn({
  listing,
  tutorProfile,
  tutorStats,
}: ListingDetailsColumnProps) {
  return (
    <div className={styles.columnContainer}>
      {/* Card 1: Tutor Info */}
      <Card className={styles.card}>
        <div className={styles.tutorHeader}>
          <div className={styles.avatarSection}>
            {tutorProfile.avatar_url && (
              <img
                src={tutorProfile.avatar_url}
                alt={tutorProfile.full_name}
                className={styles.avatar}
              />
            )}
            <div>
              <h4 className={styles.tutorName}>{listing.title}</h4>
              <p className={styles.tutorSubtitle}>
                with {tutorProfile.full_name || tutorProfile.first_name}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.location.href = `/profile/${tutorProfile.id}`}
          >
            View Profile →
          </Button>
        </div>
      </Card>

      {/* Card 2: Tutor Verification */}
      <TutorVerificationCard profile={tutorProfile} />

      {/* Card 3: Tutor Stats */}
      <TutorCredibleStats tutorStats={tutorStats} />

      {/* Card 4: Description */}
      <Card className={styles.card}>
        <h4 className={styles.cardTitle}>About this session</h4>
        <p className={styles.description}>{listing.description}</p>

        {/* Subjects */}
        {listing.subjects && listing.subjects.length > 0 && (
          <div className={styles.metaSection}>
            <h5 className={styles.metaTitle}>Subjects Covered</h5>
            <div className={styles.tagGrid}>
              {listing.subjects.map((subject, idx) => (
                <span key={idx} className={styles.tag}>
                  {subject}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Education Levels */}
        {listing.levels && listing.levels.length > 0 && (
          <div className={styles.metaSection}>
            <h5 className={styles.metaTitle}>Education Levels</h5>
            <div className={styles.tagGrid}>
              {listing.levels.map((level, idx) => (
                <span key={idx} className={styles.tag}>
                  {level}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Card 5: Availability */}
      <ListingAvailabilityCard
        availability={listing.availability}
        unavailability={listing.unavailability}
      />

      {/* Card 6: Reviews (Placeholder) */}
      <Card className={styles.card}>
        <h4 className={styles.cardTitle}>Reviews ({tutorStats.totalReviews})</h4>

        {tutorStats.totalReviews === 0 ? (
          <p className={styles.noReviews}>No reviews yet. Be the first to book!</p>
        ) : (
          <>
            <div className={styles.reviewsPreview}>
              <p className={styles.reviewPlaceholder}>
                ⭐ Reviews feature coming soon (Reviews v4.2)
              </p>
            </div>
            <Button variant="secondary" fullWidth>
              Show all {tutorStats.totalReviews} reviews
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
