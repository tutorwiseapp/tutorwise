/**
 * Filename: apps/web/src/app/components/account/QuickActionsWidget.tsx
 * Purpose: Quick actions widget with viral growth features (v4.7)
 * Created: 2025-11-09
 *
 * Features:
 * - Copy referral code (viral growth)
 * - Share public profile (social viral)
 * - Quick links to create listings, join network, send messages
 * - Boost profile visibility CTAs
 */
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import toast from 'react-hot-toast';
import styles from './QuickActionsWidget.module.css';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function QuickActionsWidget() {
  const { profile } = useUserProfile();
  const router = useRouter();

  if (!profile) {
    return null;
  }

  const handleShareProfile = async () => {
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

  const actions: QuickAction[] = [
    {
      id: 'join-network',
      label: 'Grow Network',
      description: 'Connect with tutors and clients',
      onClick: () => router.push('/network'),
    },
    {
      id: 'boost-profile',
      label: 'Boost Profile',
      description: 'Get more visibility',
      onClick: () => {
        // TODO: Implement profile boost feature
        toast('Coming soon: Boost your profile!', { icon: '🚀' });
      },
    },
  ];

  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>Quick Actions</h3>

      {/* Share Profile */}
      <button onClick={handleShareProfile} className={styles.shareButton}>
        <span>Share Your Profile</span>
      </button>

      {/* Action Buttons */}
      <div className={styles.actionsGrid}>
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`${styles.actionButton} ${
              action.variant === 'primary' ? styles.actionButtonPrimary : ''
            }`}
          >
            <div className={styles.actionContent}>
              <div className={styles.actionLabel}>{action.label}</div>
              <div className={styles.actionDescription}>{action.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
