/*
 * Filename: MarketplaceOrganisationCard.tsx
 * Purpose: Public marketplace ORGANISATION card (uses MarketplaceCard shell)
 * Used in: /marketplace (public marketplace grid)
 *
 * IMPORTANT: This displays ORGANISATIONS (agencies, schools, companies)
 * - Shows: Organisation name, tagline, team stats, location
 * - Links to: /organisation/{slug} (organisation public profile)
 *
 * Design Pattern: Uses MarketplaceCard shell component
 * - Consistent with TutorProfileCard and MarketplaceListingCard
 * - Trust badges based on CaaS score
 * - Save functionality
 */

'use client';

import { useState, useEffect } from 'react';
import type { OrganisationProfile } from '@/types/marketplace';
import { quickSaveItem, isItemSaved } from '@/lib/api/wiselists';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import toast from 'react-hot-toast';
import { Building2 } from 'lucide-react';
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
  TrustBadge,
} from './MarketplaceCard';

interface OrganisationMarketplaceCardProps {
  organisation: OrganisationProfile;
}

export default function MarketplaceOrganisationCard({ organisation }: OrganisationMarketplaceCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { profile: currentUser } = useUserProfile();

  // Get trust badge based on CaaS score
  const getTrustBadge = () => {
    const score = organisation.caas_score || 0;
    if (score >= 90) return { label: 'Top 5%', color: '#10b981' }; // Green
    if (score >= 75) return { label: 'Top 10%', color: '#3b82f6' }; // Blue
    if (score >= 60) return { label: 'Verified', color: '#8b5cf6' }; // Purple
    return null;
  };

  const trustBadge = getTrustBadge();
  const rating = organisation.avg_rating ?? 0;

  // Check if organisation is saved on mount
  useEffect(() => {
    const checkSavedStatus = async () => {
      try {
        const saved = await isItemSaved({ organisationId: organisation.id });
        setIsSaved(saved);
      } catch (error) {
        console.error('Error checking saved status:', error);
      }
    };

    checkSavedStatus();
  }, [currentUser, organisation.id]);

  // Handle save/unsave
  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    try {
      const result = await quickSaveItem({ organisationId: organisation.id });
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
      console.error('Error saving organisation:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Image fallback for organisations without logo
  const imageFallback = (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        color: '#9ca3af',
      }}
    >
      <Building2 size={48} />
    </div>
  );

  // Badges array
  const badges = trustBadge ? [<TrustBadge key="trust" label={trustBadge.label} color={trustBadge.color} />] : [];

  // Format subjects display (matching profile/listing cards)
  const subjectsDisplay = organisation.subjects_offered && organisation.subjects_offered.length > 0
    ? `${organisation.subjects_offered.slice(0, 2).join(', ')}${organisation.subjects_offered.length > 2 ? ` +${organisation.subjects_offered.length - 2}` : ''}`
    : null;

  return (
    <MarketplaceCard
      href={`/organisation/${organisation.slug}`}
      imageUrl={organisation.avatar_url}
      imageFallback={imageFallback}
      badges={badges}
      onSave={handleSaveClick}
      isSaved={isSaved}
      isLoading={isLoading}
    >
      {/* Line 1: Organisation Name & Rating */}
      <CardRow>
        <CardName>{organisation.name}</CardName>
        <CardRating value={rating} />
      </CardRow>

      {/* Line 2: Subjects & Category */}
      <CardRow>
        <CardSubject>
          {subjectsDisplay || organisation.tagline || 'Education Organisation'}
        </CardSubject>
        {organisation.category && (
          <CardLevel>
            {organisation.category.charAt(0).toUpperCase() + organisation.category.slice(1)}
          </CardLevel>
        )}
      </CardRow>

      {/* Line 3: Location & Team Size */}
      <CardRow>
        <CardLocation>{organisation.location_city || 'Multiple Locations'}</CardLocation>
        <CardDeliveryMode>
          {organisation.total_tutors || 0} tutor{organisation.total_tutors !== 1 ? 's' : ''}
        </CardDeliveryMode>
      </CardRow>

      {/* Line 4: Tagline */}
      <CardRow>
        <CardPrice>
          {organisation.tagline ? (
            organisation.tagline.length > 20
              ? `${organisation.tagline.substring(0, 20)}...`
              : organisation.tagline
          ) : 'Expert Tutoring'}
        </CardPrice>
      </CardRow>
    </MarketplaceCard>
  );
}
