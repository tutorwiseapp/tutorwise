/*
 * Filename: TutorProfileCard.tsx
 * Purpose: Public marketplace TUTOR PROFILE card (Airbnb-inspired design)
 * Used in: /marketplace (public marketplace grid)
 *
 * IMPORTANT: This displays TUTOR PROFILES (not service listings)
 * - Shows: Tutor name, bio, expertise, experience, rating
 * - Links to: /public-profile/{profile_id} (profile page)
 *
 * Design Pattern: Image-First Card (same visual style as MarketplaceListingCard)
 * - Large square profile image (1:1 aspect ratio)
 * - Overlay badges (Free Help, Verification)
 * - Compact 4-line info section
 * - Full card clickable to profile
 * - Save functionality with heart icon
 * - CSS Modules for styling (shared with MarketplaceListingCard)
 *
 * Key Features:
 * - Profile image with academic avatar fallback
 * - Verification badges (identity_verified, dbs_verified)
 * - Headline/bio display
 * - Rating display
 * - Number of services offered
 * - Wiselist save/unsave functionality
 *
 * Routing:
 * - Card click: /public-profile/{profile_id}
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import getProfileImageUrl from '@/lib/utils/image';
import { quickSaveItem, isItemSaved } from '@/lib/api/wiselists';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import toast from 'react-hot-toast';
import styles from './MarketplaceListingCard.module.css'; // Reuse same styles

interface TutorProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  identity_verified?: boolean;
  dbs_verified?: boolean;
  available_free_help?: boolean;
  listing_count?: number; // Number of published listings
  average_rating?: number;
  review_count?: number;
  subjects?: string[]; // Primary subjects taught
  levels?: string[]; // Primary levels taught
  location_types?: string[]; // Delivery modes (online, in_person, hybrid)
  min_hourly_rate?: number; // Minimum price across all listings
  max_hourly_rate?: number; // Maximum price across all listings
}

interface TutorProfileCardProps {
  profile: TutorProfile;
}

export default function TutorProfileCard({ profile }: TutorProfileCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { profile: currentUser } = useUserProfile();

  // Use the same profile image logic (includes teal initials fallback)
  const imageUrl = getProfileImageUrl({
    id: profile.id,
    avatar_url: profile.avatar_url,
    full_name: profile.full_name,
  });

  // Use real rating value, handle both undefined and 0
  const rating = profile.average_rating ?? 0;
  const reviewCount = profile.review_count ?? 0;
  const hasRating = rating > 0;

  // Format delivery modes: "Online, In Person" or "Online" or "+2 more"
  const deliveryModes = profile.location_types && profile.location_types.length > 0
    ? profile.location_types.slice(0, 2).map(type => {
        if (type === 'online') return 'Online';
        if (type === 'in_person') return 'In Person';
        if (type === 'hybrid') return 'Hybrid';
        return type;
      }).join(', ') + (profile.location_types.length > 2 ? ` +${profile.location_types.length - 2}` : '')
    : 'Available Online';

  // Format price range: "From £10/hr" or "£10-50/hr"
  const priceDisplay = profile.min_hourly_rate && profile.max_hourly_rate
    ? profile.min_hourly_rate === profile.max_hourly_rate
      ? `£${profile.min_hourly_rate}/hr`
      : `From £${profile.min_hourly_rate}/hr`
    : profile.min_hourly_rate
      ? `From £${profile.min_hourly_rate}/hr`
      : 'View Profile';

  // Check if profile is saved in "My Saves" wiselist on mount
  useEffect(() => {
    const checkSavedStatus = async () => {
      try {
        const saved = await isItemSaved({ profileId: profile.id });
        setIsSaved(saved);
      } catch (error) {
        console.error('Error checking saved status:', error);
      }
    };

    checkSavedStatus();
  }, [currentUser, profile.id]);

  // Handle quick save to "My Saves" on click
  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    try {
      const result = await quickSaveItem({ profileId: profile.id });
      setIsSaved(result.saved);

      if (result.saved) {
        if (!currentUser) {
          toast.success('Saved! Sign in to sync across devices.');
        } else {
          toast.success('Saved to My Saves!');
        }
      } else {
        toast.success('Removed from My Saves');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Link href={`/public-profile/${profile.id}`} className={styles.tutorCard}>
      {/* Image Section */}
      <div className={styles.imageContainer}>
        <Image
          src={imageUrl}
          alt={profile.full_name}
          className={styles.image}
          fill
          style={{ objectFit: 'cover' }}
        />

        {/* Free Help Now Badge - Top Priority */}
        {profile.available_free_help && (
          <div className={styles.freeHelpBadge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Free Help Now
          </div>
        )}

        {/* Verification Badges - Center */}
        {(profile.identity_verified || profile.dbs_verified) && (
          <div className={styles.verificationBadge}>
            {profile.identity_verified && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={styles.verificationIcon}
                aria-label="Government ID Verified"
              >
                <title>Government ID Verified</title>
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )}
            {profile.dbs_verified && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={styles.verificationIcon}
                aria-label="DBS Checked"
              >
                <title>DBS Checked</title>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        )}

        {/* Heart Save Icon - Right */}
        <button
          className={styles.saveButton}
          onClick={handleSaveClick}
          aria-label={isSaved ? "Remove from My Saves" : "Save to My Saves"}
          disabled={isLoading}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={isSaved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Content Section - Clean Airbnb Format (matches MarketplaceListingCard) */}
      <div className={styles.content}>
        {/* Line 1: Tutor Name & Rating */}
        <div className={styles.row}>
          <h3 className={styles.name}>{profile.full_name}</h3>
          <div className={styles.rating}>
            <svg
              className={styles.starIcon}
              width="12"
              height="12"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className={styles.ratingValue}>{rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Line 2: Subject & Level (matching listing card format) */}
        <div className={styles.row}>
          <div className={styles.subject}>
            {profile.subjects && profile.subjects.length > 0 ? (
              <>
                {profile.subjects.slice(0, 2).join(', ')}
                {profile.subjects.length > 2 && ` +${profile.subjects.length - 2}`}
              </>
            ) : (
              profile.bio?.substring(0, 50) || 'Experienced tutor'
            )}
          </div>
          {profile.levels && profile.levels.length > 0 && (
            <div className={styles.level}>{profile.levels[0]}</div>
          )}
        </div>

        {/* Line 3: Delivery Modes & Service Count */}
        <div className={styles.row}>
          <div className={styles.location}>
            {deliveryModes}
          </div>
          <div className={styles.deliveryMode}>
            {profile.listing_count || 0} service{profile.listing_count !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Line 4: Price Range & Instant Book Link */}
        <div className={styles.row}>
          <div className={styles.price}>
            {priceDisplay}
          </div>
          <Link
            href={`/public-profile/${profile.id}`}
            className={styles.bookLink}
            onClick={(e) => {
              e.stopPropagation(); // Prevent parent clicks
            }}
          >
            Instant Book
          </Link>
        </div>
      </div>
    </Link>
  );
}
