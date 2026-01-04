/**
 * Filename: ListingHeroSection.tsx
 * Purpose: Hero section for listing page with tutor avatar, name, listing title, and CTAs
 * Created: 2025-12-09
 * Adapted from: ProfileHeroSection.tsx
 *
 * Layout: Light grey banner with tutor avatar on left, listing info on right, CTAs bottom-right
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Share2, Gift, MapPin, Video, Edit } from 'lucide-react';
import type { ListingV41 } from '@/types/listing-v4.1';
import toast from 'react-hot-toast';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { ShareModal } from '@/app/components/ui/feedback/ShareModal';
import { VideoModal } from '@/app/components/ui/feedback/VideoModal';
import StatusBadge from '@/app/components/ui/data-display/StatusBadge';
import { quickSaveItem, isItemSaved } from '@/lib/api/wiselists';
import { getInitials } from '@/lib/utils/initials';
import styles from './ListingHeroSection.module.css';

interface ListingHeroSectionProps {
  listing: ListingV41;
  tutorProfile: any;
  tutorStats: {
    sessionsTaught: number;
    totalReviews: number;
    averageRating: number;
    responseTimeHours: number;
    responseRate: number;
  };
  isOwnListing?: boolean;
}

export default function ListingHeroSection({ listing, tutorProfile, tutorStats, isOwnListing = false }: ListingHeroSectionProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const { profile: currentUser } = useUserProfile();
  const router = useRouter();

  // Check if listing is saved in "My Saves" wiselist on mount
  useEffect(() => {
    const checkSavedStatus = async () => {
      try {
        const saved = await isItemSaved({ listingId: listing.id });
        setIsSaved(saved);
      } catch (error) {
        console.error('Error checking saved status:', error);
      }
    };

    checkSavedStatus();
  }, [currentUser, listing.id]);

  // Handle Save button - Quick save to "My Saves" wiselist
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await quickSaveItem({ listingId: listing.id });

      setIsSaved(result.saved);

      if (result.saved) {
        if (!currentUser) {
          toast.success('Saved! Sign in to sync across devices.');
        } else {
          toast.success('Listing saved to My Saves!');
        }
      } else {
        toast.success('Listing removed from My Saves');
      }
    } catch (error) {
      console.error('Error saving/unsaving listing:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Share button - Open share modal
  const handleShare = () => {
    setShowShareModal(true);
  };

  // Handle Refer & Earn button
  const handleReferEarn = async () => {
    if (!currentUser) {
      toast('Sign up to start earning 10% commission!', {
        icon: '🎁',
        duration: 4000,
      });
      router.push(`/signup?intent=refer&redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // Check if trying to refer own listing
    if (currentUser.id === listing.profile_id) {
      toast.error('You cannot refer your own listing');
      return;
    }

    if (!currentUser.referral_code) {
      toast.error('Referral code not found. Please contact support.');
      return;
    }

    try {
      const origin = window.location.origin;
      const listingPath = window.location.pathname;
      const contextualReferralUrl = `${origin}/a/${currentUser.referral_code}?redirect=${encodeURIComponent(listingPath)}`;

      await navigator.clipboard.writeText(contextualReferralUrl);
      toast.success('Referral link copied to clipboard! Share it to earn rewards.');
    } catch (error) {
      toast.error('Failed to copy referral link');
    }
  };

  // Format price display based on service type
  const formatPrice = () => {
    const currencySymbol = '£'; // Default to GBP, could be dynamic based on country

    // Check different price fields based on service type
    if (listing.service_type === 'study-package' && listing.package_price) {
      return `${currencySymbol}${listing.package_price}`;
    }

    if (listing.service_type === 'group-session' && listing.group_price_per_person) {
      return `${currencySymbol}${listing.group_price_per_person}/person`;
    }

    // Default to hourly_rate for one-to-one and workshop
    if (listing.hourly_rate) {
      return `${currencySymbol}${listing.hourly_rate}/hr`;
    }

    return null;
  };

  const priceDisplay = formatPrice();

  return (
    <div className={styles.heroSection}>
      {/* Grey banner background */}
      <div className={styles.banner}>
        {/* Utility Actions (top-right) */}
        <div className={styles.utilityActions}>
          {/* Edit Button (only for listing owner) */}
          {isOwnListing && (
            <button
              onClick={() => router.push(`/listings?edit=${listing.id}`)}
              className={styles.iconButton}
              aria-label="Edit listing"
              title="Edit listing"
            >
              <Edit size={20} />
            </button>
          )}

          <button
            onClick={handleSave}
            className={styles.iconButton}
            aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
            title={isSaved ? 'Remove from saved' : 'Save listing'}
            disabled={isLoading}
          >
            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={handleShare}
            className={styles.iconButton}
            aria-label="Share listing"
            title="Share listing"
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* Tutor Avatar on left */}
        <div className={styles.avatarContainer}>
          {tutorProfile.avatar_url ? (
            <Image
              src={tutorProfile.avatar_url}
              alt={tutorProfile.full_name || 'Tutor avatar'}
              className={styles.avatar}
              width={192}
              height={192}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {getInitials(listing.title, true)}
            </div>
          )}

          {/* Video Play Badge - Always visible (grey when empty) */}
          <button
            onClick={tutorProfile.bio_video_url ? () => setShowVideoModal(true) : undefined}
            className={tutorProfile.bio_video_url ? styles.videoPlayBadge : styles.videoPlayBadgeEmpty}
            aria-label={tutorProfile.bio_video_url ? "Watch introduction video" : "No video available"}
            title={tutorProfile.bio_video_url ? "Watch introduction video" : "No video available"}
            disabled={!tutorProfile.bio_video_url}
          >
            <Video size={20} />
          </button>
        </div>

        {/* Info in center */}
        <div className={styles.infoContainer}>
          {/* Line 1: Listing Title */}
          <h1 className={styles.listingTitle}>
            {listing.title}
          </h1>

          {/* Line 2: Tutor Name - Clickable link to profile */}
          <Link
            href={`/public-profile/${tutorProfile.id}`}
            className={styles.tutorNameLink}
          >
            <h2 className={styles.tutorName}>
              {tutorProfile.full_name || 'Anonymous Tutor'}
            </h2>
          </Link>

          {/* Line 3: Service Type Badge | Price | Location | Rating */}
          <div className={styles.roleLine}>
            <StatusBadge status={
              listing.service_type === 'one-to-one' ? 'One-to-One' :
              listing.service_type === 'group-session' ? 'Group Session' :
              listing.service_type === 'workshop' ? 'Workshop' :
              listing.service_type === 'study-package' ? 'Study Package' :
              'One-to-One'
            } />

            {priceDisplay && (
              <>
                <span className={styles.separator}>|</span>
                <span className={styles.priceHighlight}>{priceDisplay}</span>
              </>
            )}

            {/* Location - Always show */}
            <span className={styles.separator}>|</span>
            <span className={styles.locationLabel}>
              <MapPin size={16} className={styles.locationIcon} />
              {listing.location_city
                ? `${listing.location_city}${listing.location_country ? `, ${listing.location_country}` : ''}`
                : listing.location_type === 'online'
                ? 'Online'
                : listing.location_type === 'in_person'
                ? 'In Person'
                : listing.location_type === 'hybrid'
                ? 'Hybrid'
                : 'No Location'}
            </span>

            {/* Rating - Always show */}
            <span className={styles.separator}>|</span>
            {tutorStats.averageRating > 0 ? (
              <div className={styles.rating}>
                <span className={styles.ratingIcon}>★</span>
                <span className={styles.ratingValue}>
                  {tutorStats.averageRating.toFixed(1)}
                </span>
                <span className={styles.reviewCount}>
                  ({tutorStats.totalReviews} {tutorStats.totalReviews === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            ) : (
              <span className={styles.reviewLabel}>No Reviews</span>
            )}
          </div>
        </div>

        {/* Primary CTA (bottom-right) - Refer & Earn */}
        <div className={styles.primaryCTA}>
          <button
            onClick={handleReferEarn}
            className={styles.referButton}
            title="Refer & Earn 10% commission"
          >
            <Gift size={20} />
            Refer & Earn 10%
          </button>
        </div>
      </div>

      {/* Video Modal */}
      {tutorProfile.bio_video_url && (
        <VideoModal
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          videoUrl={tutorProfile.bio_video_url}
          title={`${tutorProfile.full_name}'s Introduction`}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={listing.title}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        text={listing.description || `Check out this listing on Tutorwise`}
      />
    </div>
  );
}
