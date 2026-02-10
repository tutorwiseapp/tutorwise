/**
 * Filename: apps/web/src/app/components/feature/account/AccountHeroHeader.tsx
 * Purpose: Custom hero header for Account pages with profile display
 * Created: 2025-11-30
 * Updated: 2025-12-04 - Restored from commit 461fd8b
 * Updated: 2025-12-08 - Added credibility score badge next to role chip
 *
 * Features:
 * - 136px circular avatar on the left
 * - User's name, role badge, credibility score, and location
 * - Action buttons on the right (Build My Business + dropdown menu)
 * - Standard HubHeader height structure
 */
'use client';

import React from 'react';
import Image from 'next/image';
import { Award } from 'lucide-react';
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
  const caasScore = profile.caas_score || 0;

  return (
    <div className={styles.header}>
      <div className={styles.headerRow}>
        {/* Left: Avatar + Profile Info */}
        <div className={styles.profileSection}>
          {/* Avatar */}
          <div className={styles.avatarContainer}>
            <Image
              src={avatarUrl}
              alt={`${fullName}'s avatar`}
              className={styles.avatar}
              width={136}
              height={136}
            />
          </div>

          {/* Profile Info */}
          <div className={styles.profileInfo}>
            <h1 className={styles.fullName}>{fullName}</h1>

            <div className={styles.credibilityRow}>
              <span className={styles.credibilityBadge}>
                <Award size={14} />
                CaaS Score: {caasScore}/100
              </span>
            </div>

            <div className={styles.roleLocationRow}>
              <span className={styles.roleText}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
              <span className={styles.separator}>|</span>
              <span className={styles.locationText}>{location}</span>
            </div>
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
