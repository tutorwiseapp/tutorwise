/**
 * Filename: apps/web/src/app/components/feature/account/AccountHeroHeader.tsx
 * Purpose: Custom hero header for Account pages with profile display
 * Created: 2025-11-30
 * Updated: 2025-11-30 - Initial creation
 *
 * Features:
 * - 120px circular avatar on the left
 * - User's name, role badge, "View" link, and location
 * - Action buttons on the right (Build My Business + dropdown menu)
 * - Standard HubHeader height structure
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './AccountHeroHeader.module.css';

interface AccountHeroHeaderProps {
  actions?: React.ReactNode;
}

export default function AccountHeroHeader({ actions }: AccountHeroHeaderProps) {
  const { profile } = useUserProfile();

  if (!profile) {
    return (
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.loadingText}>Loading...</div>
        </div>
      </div>
    );
  }

  const avatarUrl = getProfileImageUrl(profile);
  const fullName = profile.full_name || 'User';
  const role = profile.active_role || 'member';
  const location = profile.country || 'Location not set';

  return (
    <div className={styles.header}>
      <div className={styles.headerRow}>
        {/* Left: Avatar + Profile Info */}
        <div className={styles.profileSection}>
          {/* Avatar */}
          <div className={styles.avatarContainer}>
            <img
              src={avatarUrl}
              alt={`${fullName}'s avatar`}
              className={styles.avatar}
            />
          </div>

          {/* Profile Info */}
          <div className={styles.profileInfo}>
            <h1 className={styles.fullName}>{fullName}</h1>

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

            <p className={styles.location}>{location}</p>
          </div>
        </div>

        {/* Right: Action Buttons */}
        {actions && (
          <div className={styles.actionsSection}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
