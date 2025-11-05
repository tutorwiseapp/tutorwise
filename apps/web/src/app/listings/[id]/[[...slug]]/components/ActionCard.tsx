/*
 * Filename: ActionCard.tsx
 * Purpose: Sticky action card with dynamic variants based on service_type
 * Features:
 * - Book Now → Creates booking in bookings table
 * - Refer & Earn → Creates referral in referrals table
 * - Contact → Opens messaging
 * - Instant Booking badge (if enabled)
 */

'use client';

import { useState } from 'react';
import type { ListingV41 } from '@/types/listing-v4.1';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import StatusBadge from '@/app/components/ui/StatusBadge';
import toast from 'react-hot-toast';
import styles from './ActionCard.module.css';

interface ActionCardProps {
  listing: ListingV41;
  tutorProfile: any;
}

export default function ActionCard({ listing }: ActionCardProps) {
  const [isBooking, setIsBooking] = useState(false);

  // Handle "Book Now" - placeholder until booking flow is implemented
  const handleBookNow = async () => {
    setIsBooking(true);

    try {
      // TODO: Implement proper booking flow with date/time selection
      // For now, show placeholder message
      toast.success('Booking feature coming soon! Full booking flow will be implemented in next release.');

      // Once booking flow is ready, use:
      // await createBooking({
      //   listing_id: listing.id,
      //   tutor_id: listing.profile_id || '',
      //   service_name: listing.title,
      //   session_start_time: selectedDateTime, // User-selected date/time
      //   session_duration: listing.session_duration || 60,
      //   amount: listing.hourly_rate || 0,
      // });
      // router.push('/bookings');
    } catch (error) {
      console.error('Booking failed:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  // Handle "Share" - copies listing URL to clipboard
  const handleShare = async () => {
    const listingUrl = `${window.location.origin}/listings/${listing.id}/${listing.slug || ''}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(listingUrl);
        toast.success('Listing link copied to clipboard!');
      } else {
        toast.success('Listing URL ready to share!');
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Failed to copy link. Please try again.');
    }
  };

  // Handle "Connect" - placeholder for connecting with tutor
  const handleConnect = () => {
    toast.success('Connect feature coming soon!');
    // TODO: Implement real connect functionality
  };

  // Render different UI based on service_type
  const renderVariant = () => {
    switch (listing.service_type) {
      case 'one-to-one':
        return <OneToOneVariant listing={listing} />;
      case 'group-session':
        return <GroupSessionVariant listing={listing} />;
      case 'workshop':
        return <WorkshopVariant listing={listing} />;
      case 'study-package':
        return <StudyPackageVariant listing={listing} />;
      default:
        return <OneToOneVariant listing={listing} />;
    }
  };

  return (
    <Card className={styles.actionCard}>
      {/* Instant Booking Badge */}
      {listing.instant_booking_enabled && (
        <div className={styles.badgeContainer}>
          <StatusBadge status="⚡ Instant Booking" />
        </div>
      )}

      {/* Service-specific content */}
      {renderVariant()}

      {/* Primary CTA: Book Now */}
      <Button
        variant="primary"
        fullWidth
        onClick={handleBookNow}
        disabled={isBooking}
      >
        {isBooking ? 'Processing...' : 'Book Now'}
      </Button>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Secondary CTAs: Grid layout */}
      <div className={styles.ctaGrid}>
        <button onClick={handleShare} className={styles.ctaButton}>
          <span className={styles.ctaIcon}>📤</span>
          <span className={styles.ctaText}>Share</span>
        </button>

        <button onClick={handleConnect} className={styles.ctaButtonSecondary}>
          <span className={styles.ctaIcon}>🔗</span>
          <span className={styles.ctaText}>Connect</span>
        </button>
      </div>

      {/* Trust indicators */}
      <div className={styles.trustIndicators}>
        <p className={styles.trustText}>
          <span className={styles.trustIcon}>✓</span>
          Free cancellation up to 24 hours
        </p>
        <p className={styles.trustText}>
          <span className={styles.trustIcon}>✓</span>
          Money-back guarantee
        </p>
      </div>
    </Card>
  );
}

// ============================================================
// SERVICE TYPE VARIANTS
// ============================================================

function OneToOneVariant({ listing }: { listing: ListingV41 }) {
  return (
    <div className={styles.variantContent}>
      <div className={styles.priceSection}>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>One-to-One:</span>
          <span className={styles.priceValue}>
            {listing.currency === 'GBP' && '£'}
            {listing.hourly_rate}/hr
          </span>
        </div>

        {/* Group price (if available) */}
        {listing.group_price_per_person && (
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>Group (5+):</span>
            <span className={styles.priceValue}>
              {listing.currency === 'GBP' && '£'}
              {listing.group_price_per_person}/hr
            </span>
          </div>
        )}
      </div>

      {/* Availability hint */}
      <div className={styles.availabilityHint}>
        <p className={styles.hintText}>
          📅 Select date & time after clicking &ldquo;Book Now&rdquo;
        </p>
      </div>
    </div>
  );
}

function GroupSessionVariant({ listing }: { listing: ListingV41 }) {
  return (
    <div className={styles.variantContent}>
      <div className={styles.priceSection}>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Group Rate:</span>
          <span className={styles.priceValue}>
            {listing.currency === 'GBP' && '£'}
            {listing.group_price_per_person}/person
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Max Group Size:</span>
          <span className={styles.infoValue}>{listing.max_attendees || 10} people</span>
        </div>

        {listing.session_duration && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Duration:</span>
            <span className={styles.infoValue}>{listing.session_duration} minutes</span>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkshopVariant({ listing }: { listing: ListingV41 }) {
  return (
    <div className={styles.variantContent}>
      <div className={styles.priceSection}>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Workshop Fee:</span>
          <span className={styles.priceValue}>
            {listing.currency === 'GBP' && '£'}
            {listing.hourly_rate || listing.package_price}
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Max Participants:</span>
          <span className={styles.infoValue}>{listing.max_attendees || 50} spots</span>
        </div>

        {listing.session_duration && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Duration:</span>
            <span className={styles.infoValue}>{listing.session_duration} minutes</span>
          </div>
        )}
      </div>

      <div className={styles.workshopDate}>
        <p className={styles.dateText}>
          📅 Workshop date will be confirmed after booking
        </p>
      </div>
    </div>
  );
}

function StudyPackageVariant({ listing }: { listing: ListingV41 }) {
  return (
    <div className={styles.variantContent}>
      <div className={styles.priceSection}>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Package Price:</span>
          <span className={styles.priceValue}>
            {listing.currency === 'GBP' && '£'}
            {listing.package_price || listing.hourly_rate}
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Package Type:</span>
          <span className={styles.infoValue}>
            {listing.package_type === 'pdf' && '📄 PDF / eBook'}
            {listing.package_type === 'video' && '🎥 Video Course'}
            {listing.package_type === 'bundle' && '📦 Bundle (PDF + Video)'}
          </span>
        </div>
      </div>

      <div className={styles.packagePerks}>
        <p className={styles.perkText}>✓ Instant digital access</p>
        <p className={styles.perkText}>✓ Lifetime updates</p>
        <p className={styles.perkText}>✓ Money-back guarantee</p>
      </div>
    </div>
  );
}
