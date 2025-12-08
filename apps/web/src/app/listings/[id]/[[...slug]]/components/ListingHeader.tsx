/*
 * Filename: ListingHeader.tsx
 * Purpose: Displays listing title and metadata bar (reviews, location, save, share)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ListingV41 } from '@/types/listing-v4.1';
import StatusBadge from '@/app/components/ui/data-display/StatusBadge';
import toast from 'react-hot-toast';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import styles from './ListingHeader.module.css';

interface ListingHeaderProps {
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

export default function ListingHeader({ listing, tutorProfile, tutorStats }: ListingHeaderProps) {
  const [isSaved, setIsSaved] = useState(false);
  const { profile } = useUserProfile();
  const router = useRouter();

  const handleSave = () => {
    // TODO: Implement wishlist/save functionality
    setIsSaved(!isSaved);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: listing.description || '',
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Phase 4: Contextual referral link (SDD v4.3, Section 3.2)
  // Format #2: /a/[code]?redirect=/listings/[id]
  const handleReferEarn = async () => {
    // Check if user is logged in
    if (!profile) {
      toast.error('Please login to create a referral link');
      router.push('/login');
      return;
    }

    // Check if trying to refer own listing
    if (profile.id === listing.profile_id) {
      toast.error('You cannot refer your own listing');
      return;
    }

    // Check if user has referral code
    if (!profile.referral_code) {
      toast.error('Referral code not found. Please contact support.');
      return;
    }

    try {
      // Generate contextual referral link (Format #2)
      const origin = window.location.origin;
      const listingPath = window.location.pathname; // e.g., /listings/123/slug
      const contextualReferralUrl = `${origin}/a/${profile.referral_code}?redirect=${encodeURIComponent(listingPath)}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(contextualReferralUrl);

      toast.success('Contextual referral link copied! Share it to earn 10% commission on bookings.');
    } catch (error) {
      console.error('Failed to copy referral link:', error);
      toast.error('Failed to copy referral link. Please try again.');
    }
  };

  const formatRating = (rating: number) => {
    return rating > 0 ? rating.toFixed(1) : 'New';
  };

  return (
    <div className={styles.header}>
      {/* Title */}
      <h1 className={styles.title}>{listing.title}</h1>

      {/* Metadata Bar */}
      <div className={styles.metadataBar}>
        {/* Left side: Rating, Reviews, Location */}
        <div className={styles.leftMetadata}>
          {/* Rating */}
          {tutorStats.averageRating > 0 && (
            <div className={styles.rating}>
              <span className={styles.ratingIcon}>★</span>
              <span className={styles.ratingValue}>{formatRating(tutorStats.averageRating)}</span>
            </div>
          )}

          {/* Reviews Count */}
          {tutorStats.totalReviews > 0 && (
            <>
              <span className={styles.separator}>·</span>
              <a href="#reviews" className={styles.reviewsLink}>
                {tutorStats.totalReviews} {tutorStats.totalReviews === 1 ? 'review' : 'reviews'}
              </a>
            </>
          )}

          {/* Location */}
          {listing.location_city && (
            <>
              <span className={styles.separator}>·</span>
              <span className={styles.location}>
                {listing.location_city}
                {listing.location_country && `, ${listing.location_country}`}
              </span>
            </>
          )}

          {/* Service Type Badge */}
          <span className={styles.separator}>·</span>
          <StatusBadge status={
            listing.service_type === 'one-to-one' ? 'One-to-One' :
            listing.service_type === 'group-session' ? 'Group Session' :
            listing.service_type === 'workshop' ? 'Workshop' :
            listing.service_type === 'study-package' ? 'Study Package' :
            'One-to-One'
          } />
        </div>

        {/* Right side: Save, Share & Refer buttons */}
        <div className={styles.rightMetadata}>
          {/* Save Button */}
          <button
            onClick={handleSave}
            className={`${styles.actionButton} ${isSaved ? styles.saved : ''}`}
            aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
          >
            <span className={styles.icon}>{isSaved ? '❤️' : '♡'}</span>
            <span className={styles.actionText}>Save</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className={styles.actionButton}
            aria-label="Share listing"
          >
            <span className={styles.icon}>⤴</span>
            <span className={styles.actionText}>Share</span>
          </button>

          {/* Refer & Earn Button */}
          <button
            onClick={handleReferEarn}
            className={styles.referButton}
            aria-label="Copy contextual referral link to earn 10% commission"
          >
            <span className={styles.icon}>🎁</span>
            <span className={styles.actionText}>Refer & Earn</span>
          </button>
        </div>
      </div>
    </div>
  );
}
