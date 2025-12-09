/*
 * Filename: MarketplaceListingCard.tsx
 * Purpose: Public marketplace LISTING card (Airbnb-inspired design)
 * Used in: /marketplace (public marketplace grid)
 *
 * IMPORTANT: This displays SERVICE LISTINGS (not tutor profiles)
 * - Shows: Listing title, price, subjects, service details
 * - Links to: /listings/{id}/{slug} (listing detail page)
 *
 * Design Pattern: Image-First Card
 * - Large square profile image (1:1 aspect ratio)
 * - Overlay badges (Free Help, Trial, Verification, Save)
 * - Compact 4-line info section
 * - Separate clickable areas: image → listing, name → profile, instant book → booking
 * - Save functionality with heart icon
 * - CSS Modules for styling (MarketplaceListingCard.module.css)
 *
 * Key Features:
 * - Profile image with academic avatar fallback
 * - Free Help Now badge (priority over Trial badge)
 * - Verification badges (identity_verified, dbs_verified)
 * - Wiselist save/unsave functionality
 * - Rating display (placeholder)
 * - Instant Book link
 *
 * Routing:
 * - Image click: /listings/{id}/{slug}
 * - Name click: /public-profile/{profile_id}
 * - Instant Book: /listings/{id}/{slug}?action=book
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Listing } from '@tutorwise/shared-types';
import { slugify } from '@/lib/utils/slugify';
import getProfileImageUrl from '@/lib/utils/image';
import { quickSaveItem, isItemSaved } from '@/lib/api/wiselists';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import toast from 'react-hot-toast';
import styles from './MarketplaceListingCard.module.css';

interface MarketplaceListingCardProps {
  listing: Listing;
}

export default function MarketplaceListingCard({ listing }: MarketplaceListingCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { profile: currentUser } = useUserProfile();

  // Use the same profile image logic as NavMenu (includes academic avatar fallback)
  const imageUrl = getProfileImageUrl({
    id: listing.profile_id,
    avatar_url: listing.avatar_url,
  });

  // Calculate rating display (placeholder for now)
  const rating = 4.8; // TODO: Get actual rating from reviews
  const reviewCount = 24; // TODO: Get actual review count

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

  // Handle quick save to "My Saves" on click
  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    try {
      const result = await quickSaveItem({ listingId: listing.id });
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
      console.error('Error saving listing:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.tutorCard}>
      {/* Image Section - Clickable to listing */}
      <Link href={`/listings/${listing.id}/${slugify(listing.title)}`} className={styles.imageLink}>
        <div className={styles.imageContainer}>
          <Image
            src={imageUrl}
            alt={listing.full_name || listing.title}
            className={styles.image}
            fill
            style={{ objectFit: 'cover' }}
          />

          {/* v5.9: Free Help Now Badge - Top Priority */}
          {listing.available_free_help && (
            <div className={styles.freeHelpBadge}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Free Help Now
            </div>
          )}

          {/* Free Trial Badge - Left (lower priority) */}
          {!listing.available_free_help && listing.free_trial && (
            <div className={styles.trialBadge}>Free Trial</div>
          )}

          {/* Verification Badges - Center */}
          {(listing.identity_verified || listing.dbs_verified) && (
            <div className={styles.verificationBadge}>
              {listing.identity_verified && (
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
              {listing.dbs_verified && (
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
      </Link>

      {/* Content Section - Clean Airbnb Format */}
      <div className={styles.content}>
          {/* Line 1: Tutor Name & Rating */}
          <div className={styles.row}>
            <Link
              href={`/public-profile/${listing.profile_id}`}
              className={styles.nameLink}
            >
              <h3 className={styles.name}>{listing.full_name || listing.title}</h3>
            </Link>
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

          {/* Line 2: Subject & Level */}
          <div className={styles.row}>
            <div className={styles.subject}>
              {listing.subjects?.slice(0, 2).join(', ')}
              {listing.subjects && listing.subjects.length > 2 && ` +${listing.subjects.length - 2}`}
            </div>
            {listing.levels && listing.levels.length > 0 && (
              <div className={styles.level}>{listing.levels[0]}</div>
            )}
          </div>

          {/* Line 3: Location & Delivery Mode */}
          <div className={styles.row}>
            <div className={styles.location}>
              {listing.location_city || 'Available Online'}
            </div>
            <div className={styles.deliveryMode}>
              {listing.location_type === 'online' ? 'Online' :
               listing.location_type === 'in_person' ? 'In Person' :
               'Hybrid'}
            </div>
          </div>

          {/* Line 4: Price & Instant Book Link */}
          <div className={styles.row}>
            <div className={styles.price}>
              £{listing.hourly_rate}
              <span className={styles.priceUnit}> / hour</span>
            </div>
            <Link
              href={`/listings/${listing.id}/${slugify(listing.title)}?action=book`}
              className={styles.bookLink}
              onClick={(e) => {
                e.stopPropagation(); // Prevent parent clicks
              }}
            >
              Instant Book
            </Link>
          </div>
        </div>
    </div>
  );
}
