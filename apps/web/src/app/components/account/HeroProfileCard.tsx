/**
 * Filename: apps/web/src/app/components/account/HeroProfileCard.tsx
 * Purpose: Hero profile card with avatar, name, role, location (v4.7)
 * Created: 2025-11-09
 *
 * Features:
 * - Large avatar (192x192) with click-to-upload
 * - User's full name, role, and location
 * - Quick action: View Public Profile
 * - Integrates with useImageUpload hook
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, ExternalLink, Loader2 } from 'lucide-react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import styles from './HeroProfileCard.module.css';

export function HeroProfileCard() {
  const { profile, refreshProfile } = useUserProfile();

  const { handleFileSelect: uploadImage, isUploading } = useImageUpload({
    onUploadSuccess: async () => {
      await refreshProfile();
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profile?.id) {
      await uploadImage(file, profile.id);
    }
  };

  if (!profile) {
    return null;
  }

  const avatarUrl = profile.avatar_url || '/default-avatar.png';
  const fullName = profile.full_name || 'User';
  const role = profile.active_role || 'member';
  const location = profile.country || 'Location not set';

  return (
    <div className={styles.heroCard}>
      {/* Avatar with Upload */}
      <div className={styles.avatarSection}>
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
                <>
                  <Camera className={styles.cameraIcon} size={24} />
                  <span className={styles.overlayText}>Change Photo</span>
                </>
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
      </div>

      {/* Profile Details */}
      <div className={styles.profileDetails}>
        <h2 className={styles.fullName}>{fullName}</h2>

        <div className={styles.roleLocationRow}>
          <span className={styles.roleChip}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
          <Link
            href={`/public-profile/${profile.id}`}
            className={styles.viewLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            View
          </Link>
        </div>

        <div className={styles.locationRow}>
          <span className={styles.locationText}>{location}</span>
        </div>
      </div>
    </div>
  );
}
