/**
 * Filename: ProfileHeroSection.tsx
 * Purpose: Hero section for public profile with avatar, name, role, location, and CTAs
 * Created: 2025-11-12
 * Updated: 2025-11-16 - Added Free Help Now badge and CTA (v5.9)
 *
 * Layout: Light grey banner with avatar on left, info on right, CTAs bottom-right
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Share2, Gift, MapPin, Edit, Video, Sparkles } from 'lucide-react';
import type { Profile } from '@/types';
import toast from 'react-hot-toast';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { VideoModal } from '@/app/components/modals/VideoModal';
import styles from './ProfileHeroSection.module.css';

interface ProfileHeroSectionProps {
  profile: Profile;
  isOwnProfile: boolean;
}

export function ProfileHeroSection({ profile, isOwnProfile }: ProfileHeroSectionProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isCreatingFreeHelpSession, setIsCreatingFreeHelpSession] = useState(false);
  const { profile: currentUser } = useUserProfile();
  const router = useRouter();

  // v5.9: Check if tutor is offering free help
  const isFreeHelpAvailable = profile.available_free_help === true;

  // Get primary subject from professional details
  const getPrimarySubject = () => {
    const details = profile.professional_details?.tutor ||
                    profile.professional_details?.provider ||
                    profile.professional_details?.client ||
                    profile.professional_details?.agent;

    if (details?.subjects && details.subjects.length > 0) {
      return details.subjects[0];
    }
    return null;
  };

  const primarySubject = getPrimarySubject();

  // Handle Save button
  const handleSave = () => {
    if (!currentUser) {
      toast.error('Please login to save profiles');
      router.push('/login');
      return;
    }
    setIsSaved(!isSaved);
    toast.success(isSaved ? 'Profile removed from saved' : 'Profile saved!');
  };

  // Handle Share button
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.full_name} - ${profile.active_role}`,
          text: profile.bio || `Check out ${profile.full_name}'s profile on Tutorwise`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  // Handle Refer & Earn button
  const handleReferEarn = async () => {
    if (!currentUser) {
      toast.error('Please login to create a referral link');
      router.push('/login');
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
        {/* Avatar on left */}
        <div className={styles.avatarContainer}>
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name || 'User avatar'}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {profile.full_name?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Info in center */}
        <div className={styles.infoContainer}>
          {/* Line 1: Full Name */}
          <h1 className={styles.fullName}>
            {profile.full_name || 'Anonymous User'}
          </h1>

          {/* Line 2: Role | Edit | Free Help Badge */}
          <div className={styles.roleLine}>
            <span className={styles.roleLabel}>{roleLabel}</span>
            {isOwnProfile && (
              <>
                <span className={styles.separator}>|</span>
                <button
                  onClick={() => router.push('/account')}
                  className={styles.editLink}
                >
                  <Edit size={16} />
                  Edit
                </button>
              </>
            )}
            {/* v5.9: Free Help Now badge */}
            {!isOwnProfile && isFreeHelpAvailable && (
              <>
                <span className={styles.separator}>|</span>
                <span className={styles.freeHelpBadge}>
                  <Sparkles size={14} />
                  Free Help Now
                </span>
              </>
            )}
          </div>

          {/* Line 3: Subject specialisation */}
          {primarySubject && (
            <div className={styles.subjectLine}>
              {primarySubject}
            </div>
          )}

          {/* Line 4: Location */}
          {profile.city && (
            <div className={styles.locationLine}>
              <MapPin size={16} className={styles.locationIcon} />
              {profile.city}
            </div>
          )}
        </div>

        {/* CTAs on bottom-right */}
        <div className={styles.ctaContainer}>
          {/* v5.9: Get Free Help Now - Primary CTA when available */}
          {!isOwnProfile && isFreeHelpAvailable && (
            <button
              onClick={handleGetFreeHelp}
              className={styles.ctaButtonFreeHelp}
              disabled={isCreatingFreeHelpSession}
              title="Start free 30-minute session"
            >
              <Sparkles size={20} />
              {isCreatingFreeHelpSession ? 'Connecting...' : 'Get Free Help Now'}
            </button>
          )}

          {/* Watch Intro Button - Only show if bio_video_url exists */}
          {profile.bio_video_url && (
            <button
              onClick={() => setShowVideoModal(true)}
              className={styles.ctaButtonPrimary}
              title="Watch intro video"
            >
              <Video size={20} />
              Watch Intro
            </button>
          )}

          <button
            onClick={handleSave}
            className={`${styles.ctaButton} ${isSaved ? styles.ctaButtonActive : ''}`}
            title="Save profile"
          >
            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
            Save
          </button>

          <button
            onClick={handleShare}
            className={styles.ctaButton}
            title="Share profile"
          >
            <Share2 size={20} />
            Share
          </button>

          <button
            onClick={handleReferEarn}
            className={styles.ctaButtonPrimary}
            title="Refer & Earn"
          >
            <Gift size={20} />
            Refer & Earn
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
    </div>
  );
}
