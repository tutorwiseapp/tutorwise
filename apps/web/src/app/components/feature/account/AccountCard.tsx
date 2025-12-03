/**
 * Filename: apps/web/src/app/components/feature/account/AccountCard.tsx
 * Purpose: Unified account card for sidebar (v2 design system)
 * Created: 2025-11-19
 * Updated: 2025-11-19 - Luxury spacing optimization
 * Design: Combines profile, completeness, and quick actions into one card
 *
 * Features:
 * - Profile section: 160x160 avatar, 20px name, role, location
 * - Profile completeness: Progress bar with percentage
 * - Quick actions: Share Your Profile (primary), Grow Your Network, Boost Your Profile
 * - Luxury spacing: 24px profile padding, 20px section padding, 14px 20px button padding
 * - Teal header (#E6F0F0)
 * - NO ICONS (clean professional look)
 */
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import getProfileImageUrl from '@/lib/utils/image';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import type { Profile } from '@/types';
import toast from 'react-hot-toast';
import styles from './AccountCard.module.css';

interface Section {
  id: string;
  label: string;
  completed: boolean;
  action: string;
  route: string;
}

function calculateCompleteness(profile: Profile): { score: number; sections: Section[] } {
  const sections: Section[] = [];

  // Personal Info (20%)
  const hasPersonalInfo = !!(
    profile.first_name &&
    profile.last_name &&
    profile.email &&
    profile.phone &&
    profile.country
  );
  sections.push({
    id: 'personal',
    label: 'Personal Information',
    completed: hasPersonalInfo,
    action: 'Complete personal info',
    route: '/account/personal-info',
  });

  // Professional Info (30%)
  const role = profile.active_role;
  let hasProfessionalInfo = false;

  if (role === 'tutor') {
    hasProfessionalInfo = !!(
      profile.bio &&
      profile.professional_details?.tutor?.subjects?.length &&
      profile.professional_details?.tutor?.key_stages?.length
    );
  } else if (role === 'agent') {
    hasProfessionalInfo = !!(
      profile.bio &&
      profile.professional_details?.agent?.agency_name &&
      profile.professional_details?.agent?.services?.length
    );
  } else if (role === 'client') {
    hasProfessionalInfo = !!(
      profile.bio &&
      profile.professional_details?.client?.subjects?.length &&
      profile.professional_details?.client?.learning_goals?.length
    );
  }

  sections.push({
    id: 'professional',
    label: 'Professional Details',
    completed: hasProfessionalInfo,
    action: 'Add professional info',
    route: '/account/professional',
  });

  // Profile Picture (10%)
  const hasAvatar = !!(profile.avatar_url && profile.avatar_url !== '/default-avatar.png');
  sections.push({
    id: 'avatar',
    label: 'Profile Picture',
    completed: hasAvatar,
    action: 'Upload profile picture',
    route: '/account/personal-info',
  });

  // Listings (20% - only for tutors/agents)
  if (role === 'tutor' || role === 'agent') {
    const hasListings = false; // TODO: Check if user has active listings via API
    sections.push({
      id: 'listings',
      label: 'Active Listing',
      completed: hasListings,
      action: 'Create your first listing',
      route: '/create-listing',
    });
  }

  // Network Connections (20%)
  const hasConnections = false; // TODO: Check if user has connections via API
  sections.push({
    id: 'network',
    label: 'Network Connections',
    completed: hasConnections,
    action: 'Connect with others',
    route: '/network',
  });

  // Calculate score
  const completedCount = sections.filter((s) => s.completed).length;
  const score = Math.round((completedCount / sections.length) * 100);

  return { score, sections };
}

export default function AccountCard() {
  const { profile, refreshProfile } = useUserProfile();
  const router = useRouter();

  const { handleFileSelect: uploadImage, isUploading } = useImageUpload({
    onUploadSuccess: async () => {
      if (refreshProfile) {
        await refreshProfile();
      }
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profile?.id) {
      await uploadImage(file, profile.id);
    }
  };

  const { score } = useMemo(() => {
    if (!profile) return { score: 0, sections: [] };
    return calculateCompleteness(profile);
  }, [profile]);

  const handleShareProfile = async () => {
    if (!profile) return;

    const profileUrl = `${window.location.origin}/public-profile/${profile.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.full_name || 'User'} - Tutorwise`,
          text: `Check out my profile on Tutorwise!`,
          url: profileUrl,
        });
      } catch (error) {
        // User cancelled share, do nothing
      }
    } else {
      // Fallback: Copy link
      try {
        await navigator.clipboard.writeText(profileUrl);
        toast.success('Profile link copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy link');
      }
    }
  };

  if (!profile) {
    return null;
  }

  const avatarUrl = getProfileImageUrl(profile);
  const fullName = profile.full_name || 'User';
  const role = profile.active_role || 'member';
  const location = profile.country || 'Location not set';

  return (
    <HubComplexCard>
      {/* Teal Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>Your Account</h3>
      </div>

      {/* Profile Section */}
      <div className={styles.profileSection}>
        {/* Avatar with Upload */}
        <label htmlFor="avatar-upload" className={styles.avatarWrapper}>
          <div className={styles.avatarContainer}>
            <img
              src={avatarUrl}
              alt={`${fullName}'s avatar`}
              className={styles.avatar}
            />
            <div className={`${styles.avatarOverlay} ${isUploading ? styles.uploading : ''}`}>
              {isUploading ? (
                <>
                  <Loader2 className={styles.spinnerIcon} size={24} />
                  <span className={styles.overlayText}>Uploading...</span>
                </>
              ) : (
                <span className={styles.overlayText}>Change Photo</span>
              )}
            </div>
          </div>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className={styles.fileInput}
            aria-label="Upload profile picture"
          />
        </label>

        {/* Profile Details */}
        <div className={styles.profileDetails}>
          <h2 className={styles.fullName}>{fullName}</h2>

          <div className={styles.roleLocationRow}>
            <span className={styles.roleChip}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
            {profile.slug && (
              <Link
                href={`/public-profile/${profile.id}/${profile.slug}`}
                className={styles.viewLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                View
              </Link>
            )}
          </div>

          <div className={styles.locationRow}>
            <span className={styles.locationText}>{location}</span>
          </div>
        </div>
      </div>

      {/* Profile Completeness Section */}
      <div className={styles.completenessSection}>
        <div className={styles.completenessHeader}>
          <span className={styles.completenessTitle}>Profile Completeness</span>
          <span className={styles.scoreChip}>{score}%</span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${score}%` }}
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
          />
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className={styles.actionsSection}>
        <h4 className={styles.actionsTitle}>Quick Actions</h4>

        {/* Primary Button - Share Profile */}
        <button onClick={handleShareProfile} className={styles.primaryButton}>
          Share Your Profile
        </button>

        {/* Secondary Buttons */}
        <button
          onClick={() => router.push('/network')}
          className={styles.secondaryButton}
        >
          Grow Your Network
        </button>

        <button
          onClick={() => {
            toast('Coming soon: Boost your profile!', { icon: '🚀' });
          }}
          className={styles.secondaryButton}
        >
          Boost Your Profile
        </button>
      </div>
    </HubComplexCard>
  );
}
