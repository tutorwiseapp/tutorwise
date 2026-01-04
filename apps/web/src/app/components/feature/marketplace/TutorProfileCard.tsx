/*
 * Filename: TutorProfileCard.tsx
 * Purpose: Public marketplace TUTOR PROFILE card (uses MarketplaceCard shell)
 * Used in: /marketplace (public marketplace grid)
 *
 * IMPORTANT: This displays TUTOR PROFILES (not service listings)
 * - Shows: Tutor name, bio, expertise, experience, rating
 * - Links to: /public-profile/{profile_id} (profile page)
 *
 * Design Pattern: Uses MarketplaceCard shell component
 * - Consistent with MarketplaceListingCard and MarketplaceOrganisationCard
 * - Verification badges
 * - Save functionality
 */

'use client';

import { useState, useEffect } from 'react';
import getProfileImageUrl from '@/lib/utils/image';
import { quickSaveItem, isItemSaved } from '@/lib/api/wiselists';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import toast from 'react-hot-toast';
import MarketplaceCard, {
  CardRow,
  CardName,
  CardRating,
  CardSubject,
  CardLevel,
  CardLocation,
  CardDeliveryMode,
  CardPrice,
  CardBookLink,
  FreeHelpBadge,
  VerificationBadges,
} from './MarketplaceCard';

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

  // Use real rating value
  const rating = profile.average_rating ?? 0;

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

  // Check if profile is saved on mount
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

  // Handle save/unsave
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

  // Build badges array
  const badges = [];
  if (profile.available_free_help) {
    badges.push(<FreeHelpBadge key="free-help" />);
  }
  if (profile.identity_verified || profile.dbs_verified) {
    badges.push(
      <VerificationBadges
        key="verification"
        identityVerified={profile.identity_verified}
        dbsVerified={profile.dbs_verified}
      />
    );
  }

  return (
    <MarketplaceCard
      href={`/public-profile/${profile.id}`}
      imageUrl={imageUrl}
      badges={badges}
      onSave={handleSaveClick}
      isSaved={isSaved}
      isLoading={isLoading}
    >
      {/* Line 1: Tutor Name & Rating */}
      <CardRow>
        <CardName>{profile.full_name}</CardName>
        <CardRating value={rating} />
      </CardRow>

      {/* Line 2: Subject & Level */}
      <CardRow>
        <CardSubject>
          {profile.subjects && profile.subjects.length > 0 ? (
            <>
              {profile.subjects.slice(0, 2).join(', ')}
              {profile.subjects.length > 2 && ` +${profile.subjects.length - 2}`}
            </>
          ) : (
            profile.bio?.substring(0, 50) || 'Experienced tutor'
          )}
        </CardSubject>
        {profile.levels && profile.levels.length > 0 && (
          <CardLevel>{profile.levels[0]}</CardLevel>
        )}
      </CardRow>

      {/* Line 3: Delivery Modes & Service Count */}
      <CardRow>
        <CardLocation>{deliveryModes}</CardLocation>
        <CardDeliveryMode>
          {profile.listing_count || 0} service{profile.listing_count !== 1 ? 's' : ''}
        </CardDeliveryMode>
      </CardRow>

      {/* Line 4: Price Range & Instant Book Link */}
      <CardRow>
        <CardPrice>{priceDisplay}</CardPrice>
        <CardBookLink href={`/public-profile/${profile.id}`}>Instant Book</CardBookLink>
      </CardRow>
    </MarketplaceCard>
  );
}
