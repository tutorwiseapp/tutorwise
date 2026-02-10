/**
 * Filename: OrganisationHeroSection.tsx
 * Purpose: Hero section for public organisation profile with logo, name, stats, and CTAs
 * Created: 2025-12-31
 *
 * Layout: Light grey banner with logo on left, info on right, CTAs bottom-right
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, Share2, Edit, Award, Users, Star, MapPin, Building2, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { ShareModal } from '@/app/components/ui/feedback/ShareModal';
import { quickSaveItem, isItemSaved } from '@/lib/api/wiselists';
import { getInitials } from '@/lib/utils/initials';
import styles from './OrganisationHeroSection.module.css';

interface OrganisationHeroSectionProps {
  organisation: any;
  isOwner: boolean;
}

export function OrganisationHeroSection({ organisation, isOwner }: OrganisationHeroSectionProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { profile: currentUser } = useUserProfile();
  const router = useRouter();

  // Get organisation initials for fallback avatar
  const _orgInitials = getInitials(organisation.name);

  // Check if organisation is saved in "My Saves" wiselist on mount
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

  // Handle Save button - Quick save to "My Saves" wiselist
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await quickSaveItem({ organisationId: organisation.id });

      setIsSaved(result.saved);

      if (result.saved) {
        if (!currentUser) {
          toast.success('Saved! Sign in to sync across devices.');
        } else {
          toast.success('Organisation saved to My Saves!');
        }
      } else {
        toast.success('Organisation removed from My Saves');
      }
    } catch (error) {
      console.error('Error saving/unsaving organisation:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Share button
  const handleShare = () => {
    setShowShareModal(true);
  };

  // Handle Edit button (for owners)
  const handleEdit = () => {
    router.push(`/organisations?tab=info`);
  };

  // Handle Join Team CTA (removed - now in GetInTouchCard)
  // const handleJoinTeam = () => {
  //   router.push(`/organisation/${organisation.slug}/join`);
  // };

  // Handle Book Session CTA (removed - now in GetInTouchCard)
  // const handleBookSession = () => {
  //   // Scroll to team members section or show booking modal
  //   const teamSection = document.getElementById('team-members');
  //   if (teamSection) {
  //     teamSection.scrollIntoView({ behavior: 'smooth' });
  //   }
  // };

  // Format CaaS score for display
  const getCaaSBadge = () => {
    const score = organisation.caas_score || 0;
    if (score >= 90) return { label: 'Top 5%', color: '#006c67' };
    if (score >= 80) return { label: 'Top 10%', color: '#006c67' };
    if (score >= 70) return { label: 'Verified', color: '#006c67' };
    return null;
  };

  const caasBadge = getCaaSBadge();

  return (
    <>
      <div className={styles.heroContainer}>
        {/* Left: Organisation Logo */}
        <div className={styles.logoSection}>
          {organisation.logo_url || organisation.avatar_url ? (
            <Image
              src={organisation.logo_url || organisation.avatar_url}
              alt={`${organisation.name} logo`}
              width={160}
              height={160}
              className={styles.logo}
              priority
            />
          ) : (
            <div className={styles.logoFallback}>
              <Building2 size={64} />
            </div>
          )}

          {/* Video Play Badge (if video_intro_url exists) */}
          {organisation.video_intro_url && (
            <button className={styles.videoPlayBadge} aria-label="Watch introduction video">
              <span>▶</span>
            </button>
          )}
        </div>

        {/* Center: Organisation Info */}
        <div className={styles.infoSection}>
          {/* Organisation Name */}
          <h1 className={styles.orgName}>{organisation.name}</h1>

          {/* Trust Badge & Stats Row */}
          <div className={styles.badgeRow}>
            {/* CaaS Trust Badge */}
            {caasBadge && (
              <div className={styles.trustBadge} style={{ backgroundColor: caasBadge.color }}>
                <Award size={14} />
                <span>{caasBadge.label} Rated</span>
              </div>
            )}

            {/* Team Size */}
            {organisation.total_tutors > 0 && (
              <div className={styles.statPill}>
                <Users size={14} />
                <span>{organisation.total_tutors} Expert Tutor{organisation.total_tutors !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Average Rating */}
            {organisation.avg_rating > 0 && (
              <div className={styles.statPill}>
                <Star size={14} fill="currentColor" />
                <span>{organisation.avg_rating.toFixed(1)} ({organisation.total_reviews} reviews)</span>
              </div>
            )}

            {/* Location */}
            {organisation.location_city && (
              <div className={styles.statPill}>
                <MapPin size={14} />
                <span>{organisation.location_city}</span>
              </div>
            )}
          </div>

          {/* Tagline */}
          {organisation.tagline && (
            <p className={styles.tagline}>{organisation.tagline}</p>
          )}

          {/* Subjects Offered Pills */}
          {organisation.unique_subjects && organisation.unique_subjects.length > 0 && (
            <div className={styles.subjectsRow}>
              {organisation.unique_subjects.slice(0, 5).map((subject: string) => (
                <span key={subject} className={styles.subjectPill}>
                  {subject}
                </span>
              ))}
              {organisation.unique_subjects.length > 5 && (
                <span className={styles.subjectPill}>
                  +{organisation.unique_subjects.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Utility Buttons (top-right, positioned absolutely) */}
        <div className={styles.utilityButtons}>
          {/* Edit Button (only for owners) */}
          {isOwner && (
            <button
              className={styles.utilityButton}
              onClick={handleEdit}
              aria-label="Edit organisation"
              title="Edit organisation"
            >
              <Edit size={20} />
            </button>
          )}

          {/* Save Button */}
          <button
            className={styles.utilityButton}
            onClick={handleSave}
            aria-label={isSaved ? 'Remove from saved' : 'Save organisation'}
            title={isSaved ? 'Remove from saved' : 'Save organisation'}
            disabled={isLoading}
          >
            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
          </button>

          {/* Share Button */}
          <button
            className={styles.utilityButton}
            onClick={handleShare}
            aria-label="Share organisation"
            title="Share organisation"
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* Right: Referral CTA */}
        <div className={styles.ctaSection}>
          {/* Referral CTA */}
          <button
            className={styles.referralButton}
            onClick={() => router.push(`/organisation/${organisation.slug}/join?ref=hero`)}
          >
            <Gift size={20} />
            Refer & Earn 10%
          </button>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          isOpen={true}
          url={`${window.location.origin}/organisation/${organisation.slug}`}
          title={`Check out ${organisation.name} on Tutorwise`}
          text={organisation.tagline || organisation.bio?.substring(0, 100)}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
