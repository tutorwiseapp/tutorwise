/**
 * Filename: apps/web/src/app/components/feature/account/HeroProfileCard.tsx
 * Purpose: Hero profile card with avatar, name, role, location (v4.7, v4.8)
 * Created: 2025-11-09
 * Updated: 2025-11-10 - Added readOnly mode for public profiles
 *
 * Features:
 * - Large avatar (192x192) with optional click-to-upload
 * - User's full name, role, and location
 * - Quick action: View Public Profile (editable mode only)
 * - Integrates with useImageUpload hook
 * - Supports readOnly mode for public profile viewing (v4.8)
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import getProfileImageUrl from '@/lib/utils/image';
import type { Profile } from '@/types';
import styles from './HeroProfileCard.module.css';

interface HeroProfileCardProps {
  readOnly?: boolean;
  profileData?: Profile; // For readOnly mode, pass profile directly
}

export function HeroProfileCard({ readOnly = false, profileData }: HeroProfileCardProps = {}) {
  // Always call the hook (React rules), but only use it in editable mode
  const contextData = useUserProfile();

  // Use provided profileData in readOnly mode, otherwise use context profile
  const profile = readOnly ? profileData : contextData?.profile;

  const { handleFileSelect: uploadImage, isUploading } = useImageUpload({
    onUploadSuccess: async () => {
      if (!readOnly && contextData?.refreshProfile) {
        await contextData.refreshProfile();
      }
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return; // No upload in readOnly mode

    const file = e.target.files?.[0];
    if (file && profile?.id) {
      await uploadImage(file, profile.id);
    }
  };

  // Early return if no profile data available
  if (!profile) {
    // In readOnly mode, if no profileData was passed, don't render anything
    if (readOnly) {
      console.warn('HeroProfileCard: No profileData provided in readOnly mode');
      return null;
    }
    // In editable mode, wait for context to load
    return null;
  }

  const avatarUrl = getProfileImageUrl(profile);
  const fullName = profile.full_name || 'User';
  const role = profile.active_role || 'member';
  const location = profile.country || 'Location not set';

  return (
    <div className={styles.heroCard}>
      {/* Avatar with optional Upload */}
      <div className={styles.avatarSection}>
        {readOnly ? (
          // Read-only mode: Just show avatar
          <div className={styles.avatarContainer}>
            <img
              src={avatarUrl}
              alt={`${fullName}'s avatar`}
              className={styles.avatar}
            />
          </div>
        ) : (
          // Editable mode: Avatar with upload
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
        )}
      </div>

      {/* Profile Details */}
      <div className={styles.profileDetails}>
        <h2 className={styles.fullName}>{fullName}</h2>

        <div className={styles.roleLocationRow}>
          <span className={styles.roleChip}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
          {!readOnly && profile.slug && (
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
  );
}
