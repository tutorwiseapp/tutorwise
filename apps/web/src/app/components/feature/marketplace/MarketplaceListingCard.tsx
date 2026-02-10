/*
 * Filename: MarketplaceListingCard.tsx
 * Purpose: Public marketplace LISTING card (uses MarketplaceCard shell)
 * Used in: /marketplace (public marketplace grid)
 *
 * IMPORTANT: This displays SERVICE LISTINGS (not tutor profiles)
 * - Shows: Listing title, price, subjects, service details
 * - Links to: /listings/{id}/{slug} (listing detail page)
 *
 * Design Pattern: Uses MarketplaceCard shell component
 * - Consistent with TutorProfileCard and MarketplaceOrganisationCard
 * - Free Help/Trial badges, verification badges
 * - Category badges for courses/jobs
 * - Save functionality
 */

'use client';

import { useState, useEffect } from 'react';
import type { Listing } from '@tutorwise/shared-types';
import type { MatchScore } from '@/lib/services/matchScoring';
import { slugify } from '@/lib/utils/slugify';
import getProfileImageUrl from '@/lib/utils/image';
import { quickSaveItem, isItemSaved } from '@/lib/api/wiselists';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { MatchScoreBadge } from '@/app/components/ui/MatchScore';
import toast from 'react-hot-toast';
import MarketplaceCard, {
  CardRow,
  CardName,
  CardRating,
  CardSubject,
  CardLevel,
    CardDeliveryMode,
  CardPrice,
  CardBookLink,
  FreeHelpBadge,
  TrialBadge,
  VerificationBadges,
} from './MarketplaceCard';
import styles from './MarketplaceCard.module.css';

interface MarketplaceListingCardProps {
  listing: Listing;
  matchScore?: MatchScore; // Optional match score for personalized results
}

export default function MarketplaceListingCard({ listing, matchScore }: MarketplaceListingCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { profile: currentUser } = useUserProfile();

  // Use listing title for avatar initials, pass first subject for color mapping
  const imageUrl = getProfileImageUrl({
    id: listing.profile_id,
    avatar_url: listing.avatar_url,
    full_name: listing.title,
  }, true, listing.subjects?.[0]);

  // Use real rating value
  const rating = listing.average_rating ?? 0;

  // Check if listing is saved on mount
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

  // Handle save/unsave
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

  // Build badges array (priority: Free Help > Trial > Category > Verification)
  const badges = [];

  // Free Help Now badge (highest priority)
  if (listing.available_free_help) {
    badges.push(<FreeHelpBadge key="free-help" />);
  }
  // Free Trial badge (if no Free Help)
  else if (listing.free_trial) {
    badges.push(<TrialBadge key="trial" />);
  }

  // Listing Category Badge (Course/Job)
  if (listing.listing_category && listing.listing_category !== 'session') {
    badges.push(
      <div
        key="category"
        className={`${styles.categoryBadge} ${styles[`category${listing.listing_category.charAt(0).toUpperCase() + listing.listing_category.slice(1)}`]}`}
      >
        {listing.listing_category === 'course' && '📚 Course'}
        {listing.listing_category === 'job' && '💼 Job'}
      </div>
    );
  }

  // Verification Badges
  if (listing.identity_verified || listing.dbs_verified) {
    badges.push(
      <VerificationBadges
        key="verification"
        identityVerified={listing.identity_verified}
        dbsVerified={listing.dbs_verified}
      />
    );
  }

  return (
    <MarketplaceCard
      href={`/listings/${listing.id}/${slugify(listing.title)}`}
      imageUrl={imageUrl}
      badges={badges}
      onSave={handleSaveClick}
      isSaved={isSaved}
      isLoading={isLoading}
    >
      {/* Line 1: Listing Title & Rating */}
      <CardRow>
        <CardName>{listing.title}</CardName>
        <CardRating value={rating} />
      </CardRow>

      {/* Match Score Badge (if available) */}
      {matchScore && (
        <div className={styles.matchScoreRow}>
          <MatchScoreBadge score={matchScore} />
        </div>
      )}

      {/* Line 2: Subject & Level */}
      <CardRow>
        <CardSubject>
          {listing.subjects?.slice(0, 2).join(', ')}
          {listing.subjects && listing.subjects.length > 2 && ` +${listing.subjects.length - 2}`}
        </CardSubject>
        {listing.levels && listing.levels.length > 0 && (
          <CardLevel>{listing.levels[0]}</CardLevel>
        )}
      </CardRow>

      {/* Line 3: Tutor Name & Delivery Mode */}
      <CardRow>
        <CardBookLink href={`/public-profile/${listing.profile_id}`}>
          {listing.full_name || 'Tutor'}
        </CardBookLink>
        <CardDeliveryMode>
          {listing.delivery_mode && listing.delivery_mode.length > 0
            ? listing.delivery_mode.map(mode =>
                mode === 'online' ? 'Online' :
                mode === 'in_person' ? 'In Person' :
                mode === 'hybrid' ? 'Hybrid' : mode
              ).join(', ')
            : 'Not specified'}
        </CardDeliveryMode>
      </CardRow>

      {/* Line 4: Price & Instant Book Link */}
      <CardRow>
        <CardPrice>£{listing.hourly_rate}/hr</CardPrice>
        <CardBookLink href={`/listings/${listing.id}/${slugify(listing.title)}?action=book`}>
          Instant Book
        </CardBookLink>
      </CardRow>
    </MarketplaceCard>
  );
}
