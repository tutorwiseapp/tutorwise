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
      {/* Card 1: Tutor Info Card */}
      <Card className={styles.card}>
        <div className={styles.tutorInfoCard}>
          <div className={styles.tutorAvatarSection}>
            {tutorProfile.avatar_url ? (
              <img
                src={tutorProfile.avatar_url}
                alt={tutorProfile.full_name}
                className={styles.tutorAvatar}
              />
            ) : (
              <div className={styles.tutorAvatarPlaceholder}>
                {(tutorProfile.full_name || tutorProfile.first_name || 'T').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className={styles.tutorNameSection}>
            <h4 className={styles.tutorFullName}>
              {tutorProfile.full_name || `${tutorProfile.first_name} ${tutorProfile.last_name || ''}`.trim()}
            </h4>
            <p className={styles.tutorRole}>Professional Tutor</p>
          </div>
          <div className={styles.tutorActionSection}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const slug = tutorProfile.slug || tutorProfile.full_name?.toLowerCase().replace(/\s+/g, '-') || 'profile';
                window.location.href = `/public-profile/${tutorProfile.id}/${slug}`;
              }}
            >
              View Profile →
            </Button>
          </div>
        </div>
      </Card>

      {/* Card 2: Tutor Verification */}
      <TutorVerificationCard profile={tutorProfile} />

      {/* Card 3: Tutor Stats */}
      <TutorCredibleStats tutorStats={tutorStats} />

      {/* Card 4: Description */}
      <Card className={styles.card}>
        <h4 className={styles.cardTitle}>Description</h4>
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

      {/* Card 7: Cancellation Policy */}
      <Card className={styles.card}>
        <h4 className={styles.cardTitle}>Cancellation Policy</h4>
        <div className={styles.policyContent}>
          <div className={styles.policyItem}>
            <span className={styles.policyIcon}>✓</span>
            <p className={styles.policyText}>
              <strong>Free cancellation</strong> up to 24 hours before the session starts.
            </p>
          </div>
          <div className={styles.policyItem}>
            <span className={styles.policyIcon}>💰</span>
            <p className={styles.policyText}>
              <strong>Full refund</strong> if you cancel within the free cancellation period.
            </p>
          </div>
          <div className={styles.policyItem}>
            <span className={styles.policyIcon}>⚠️</span>
            <p className={styles.policyText}>
              <strong>50% refund</strong> if you cancel within 24 hours of the session.
            </p>
          </div>
          <div className={styles.policyItem}>
            <span className={styles.policyIcon}>✕</span>
            <p className={styles.policyText}>
              <strong>No refund</strong> if you cancel after the session has started.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
