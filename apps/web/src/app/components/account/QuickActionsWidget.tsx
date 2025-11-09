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

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Copy,
  Share2,
  FileText,
  Users,
  MessageCircle,
  TrendingUp,
  Check,
} from 'lucide-react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import toast from 'react-hot-toast';
import styles from './QuickActionsWidget.module.css';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function QuickActionsWidget() {
  const { profile } = useUserProfile();
  const router = useRouter();
  const [copiedReferral, setCopiedReferral] = useState(false);

  if (!profile) {
    return null;
  }

  // Generate referral code (TODO: Replace with actual user referral code from profile)
  const referralCode = profile.referral_code || `TW-${profile.id.slice(0, 8).toUpperCase()}`;

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedReferral(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopiedReferral(false), 2000);
    } catch (error) {
      toast.error('Failed to copy referral code');
    }
  };

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
      id: 'create-listing',
      icon: <FileText size={18} />,
      label: 'Create Listing',
      description: 'Boost visibility with a new listing',
      onClick: () => router.push('/create-listing'),
      variant: 'primary',
    },
    {
      id: 'join-network',
      icon: <Users size={18} />,
      label: 'Grow Network',
      description: 'Connect with tutors and clients',
      onClick: () => router.push('/network'),
    },
    {
      id: 'messages',
      icon: <MessageCircle size={18} />,
      label: 'Messages',
      description: 'Chat with your connections',
      onClick: () => router.push('/messages'),
    },
    {
      id: 'boost-profile',
      icon: <TrendingUp size={18} />,
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

      {/* Referral Code Section */}
      <div className={styles.referralSection}>
        <div className={styles.referralHeader}>
          <span className={styles.referralLabel}>Your Referral Code</span>
          <span className={styles.referralBonus}>Earn £10/referral</span>
        </div>
        <button onClick={handleCopyReferral} className={styles.referralButton}>
          <span className={styles.referralCode}>{referralCode}</span>
          {copiedReferral ? (
            <Check size={18} className={styles.copiedIcon} />
          ) : (
            <Copy size={18} />
          )}
        </button>
      </div>

      {/* Share Profile */}
      <button onClick={handleShareProfile} className={styles.shareButton}>
        <Share2 size={18} />
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
            <div className={styles.actionIcon}>{action.icon}</div>
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
