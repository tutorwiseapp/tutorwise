/**
 * Filename: ProfileHeroSection.tsx
 * Purpose: Hero section for public profile with avatar, name, role, location, and CTAs
 * Created: 2025-11-12
 * Updated: 2025-11-16 - Added Free Help Now badge and CTA (v5.9)
 *
 * Layout: Light grey banner with avatar on left, info on right, CTAs bottom-right
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, Share2, Gift, MapPin, Edit, Video, Sparkles, Award } from 'lucide-react';
import type { Profile } from '@/types';
import toast from 'react-hot-toast';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { VideoModal } from '@/app/components/ui/feedback/VideoModal';
import { ShareModal } from '@/app/components/ui/feedback/ShareModal';
import { quickSaveItem, isItemSaved } from '@/lib/api/wiselists';
import { getInitials } from '@/lib/utils/initials';
import styles from './ProfileHeroSection.module.css';

interface ProfileHeroSectionProps {
  profile: Profile;
  isOwnProfile: boolean;
}

export function ProfileHeroSection({ profile, isOwnProfile }: ProfileHeroSectionProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isCreatingFreeHelpSession, setIsCreatingFreeHelpSession] = useState(false);
  const { profile: currentUser } = useUserProfile();
  const router = useRouter();

  // v5.9: Check if tutor is offering free help
  const isFreeHelpAvailable = profile.available_free_help === true;

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

  // Get primary subject from professional details
  const getPrimarySubject = () => {
    const details = profile.professional_details?.tutor ||
                    profile.professional_details?.client ||
                    profile.professional_details?.agent;

    if (details?.subjects && details.subjects.length > 0) {
      return details.subjects[0];
    }
    return null;
  };

  const primarySubject = getPrimarySubject();

  // Handle Save button - Quick save to "My Saves" wiselist
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await quickSaveItem({ profileId: profile.id });

      setIsSaved(result.saved);

      if (result.saved) {
        if (!currentUser) {
          toast.success('Saved! Sign in to sync across devices.');
        } else {
          toast.success('Profile saved to My Saves!');
        }
      } else {
        toast.success('Profile removed from My Saves');
      }
    } catch (error) {
      console.error('Error saving/unsaving profile:', error);
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
      // Conversion funnel: Drive signups with referral intent
      toast('Sign up to start earning 10% commission!', {
        icon: '🎁',
        duration: 4000,
      });
      router.push(`/signup?intent=refer&redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // Check if trying to refer self
    if (currentUser.id === profile.id) {
      toast.error('You cannot refer yourself');
      return;
    }

    if (!currentUser.referral_code) {
      toast.error('Referral code not found. Please contact support.');
      return;
    }

    try {
      const origin = window.location.origin;
      const profilePath = window.location.pathname;
      const contextualReferralUrl = `${origin}/a/${currentUser.referral_code}?redirect=${encodeURIComponent(profilePath)}`;

      await navigator.clipboard.writeText(contextualReferralUrl);
      toast.success('Referral link copied to clipboard! Share it to earn rewards.');
    } catch (error) {
      toast.error('Failed to copy referral link');
    }
  };

  // v5.9: Handle Get Free Help Now button
  const handleGetFreeHelp = async () => {
    if (!currentUser) {
      toast.error('Please login to start a free help session');
      router.push('/login');
      return;
    }

    // Check if trying to get help from self
    if (currentUser.id === profile.id) {
      toast.error('You cannot start a free help session with yourself');
      return;
    }

    setIsCreatingFreeHelpSession(true);
    try {
      const response = await fetch('/api/sessions/create-free-help-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorId: profile.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 410) {
          toast.error('This tutor is no longer offering free help');
        } else if (response.status === 429) {
          toast.error(data.error || 'Rate limit reached');
        } else {
          toast.error(data.error || 'Failed to create session');
        }
        return;
      }

      // Success! Redirect to meet link
      toast.success('Connecting you now! The tutor has been notified.');
      window.location.href = data.meetUrl;
    } catch (error) {
      console.error('Failed to create free help session:', error);
      toast.error('Failed to start session. Please try again.');
    } finally {
      setIsCreatingFreeHelpSession(false);
    }
  };

  const roleLabel = profile.active_role
    ? profile.active_role.charAt(0).toUpperCase() + profile.active_role.slice(1)
    : 'Member';

  return (
    <div className={styles.heroSection}>
      {/* Grey banner background */}
      <div className={styles.banner}>
        {/* Utility Actions (top-right) */}
        <div className={styles.utilityActions}>
          {/* Edit Button (only for own profile) */}
          {isOwnProfile && (
            <button
              onClick={() => router.push('/account')}
              className={styles.iconButton}
              aria-label="Edit profile"
              title="Edit profile"
            >
              <Edit size={20} />
            </button>
          )}

          <button
            onClick={handleSave}
            className={styles.iconButton}
            aria-label={isSaved ? 'Remove from saved' : 'Save profile'}
            title={isSaved ? 'Remove from saved' : 'Save profile'}
            disabled={isLoading}
          >
            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={handleShare}
            className={styles.iconButton}
            aria-label="Share profile"
            title="Share profile"
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* Avatar on left */}
        <div className={styles.avatarContainer}>
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name || 'User avatar'}
              className={styles.avatar}
              width={128}
              height={128}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {getInitials(profile.full_name || profile.email)}
            </div>
          )}

          {/* Video Play Badge - Always visible (grey when empty) */}
          <button
            onClick={profile.bio_video_url ? () => setShowVideoModal(true) : undefined}
            className={profile.bio_video_url ? styles.videoPlayBadge : styles.videoPlayBadgeEmpty}
            aria-label={profile.bio_video_url ? "Watch introduction video" : "No video available"}
            title={profile.bio_video_url ? "Watch introduction video" : "No video available"}
            disabled={!profile.bio_video_url}
          >
            <Video size={20} />
          </button>
        </div>

        {/* Info in center */}
        <div className={styles.infoContainer}>
          {/* Line 1: Full Name */}
          <h1 className={styles.fullName}>
            {profile.full_name || 'Anonymous User'}
          </h1>

          {/* Line 2: CaaS Score - Always show with consistent teal styling */}
          <div className={styles.credibilityBadge}>
            <span className={styles.scoreValue}>
              <Award size={16} />
              CaaS Score: {profile.caas_score || 0}/100
            </span>
            {profile.caas_score && profile.caas_score >= 80 && (
              <span className={styles.topBadge}>Top 10%</span>
            )}
          </div>

          {/* Line 3: Role | Location | Free Help Badge */}
          <div className={styles.roleLine}>
            <span className={styles.roleLabel}>{roleLabel}</span>

            {/* Add Location right after role */}
            {profile.city && (
              <>
                <span className={styles.separator}>|</span>
                <span className={styles.locationText}>
                  <MapPin size={16} className={styles.locationIcon} />
                  {profile.city}
                </span>
              </>
            )}

            {/* v5.9: Free Help Now badge - Always shown for tutors, active/inactive state */}
            {!isOwnProfile && profile.roles?.includes('tutor') && (
              <>
                <span className={styles.separator}>|</span>
                <span
                  className={`${styles.freeHelpBadge} ${
                    isFreeHelpAvailable ? styles.freeHelpBadgeActive : styles.freeHelpBadgeInactive
                  }`}
                  title={isFreeHelpAvailable ? 'Offering free help now!' : 'Free help not currently available'}
                >
                  <Sparkles size={14} />
                  Free Help Now
                </span>
              </>
            )}
          </div>

          {/* Line 4: Subject specialisation */}
          {primarySubject && (
            <div className={styles.subjectLine}>
              {primarySubject}
            </div>
          )}
        </div>

        {/* Primary CTA (bottom-right) - Always show Refer & Earn */}
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
      {profile.bio_video_url && (
        <VideoModal
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          videoUrl={profile.bio_video_url}
          title={`${profile.full_name}'s Introduction`}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`${profile.full_name} - ${profile.active_role}`}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        text={profile.bio || `Check out ${profile.full_name}'s profile on Tutorwise`}
      />
    </div>
  );
}
