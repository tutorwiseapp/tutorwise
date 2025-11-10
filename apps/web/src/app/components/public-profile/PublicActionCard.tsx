/**
 * Filename: apps/web/src/app/components/public-profile/PublicActionCard.tsx
 * Purpose: Conversion-focused action card for public profiles (v4.8)
 * Created: 2025-11-10
 * Updated: 2025-11-10 - Phase 3: Implemented Share Profile with referral tracking
 *
 * Features:
 * - Context-aware CTAs based on viewer auth state
 * - Own profile: "Edit My Profile" button
 * - Other profiles: "Book Session", "Connect", "Message", "Share Profile"
 * - Role-aware button visibility
 * - Functional Share Profile modal with referral link generation and copy
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, X } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import type { Profile } from '@/types';
import styles from './PublicActionCard.module.css';

interface PublicActionCardProps {
  profile: Profile; // Profile being viewed
  currentUser?: Profile | null; // Current logged-in user (if any)
  isOwnProfile: boolean;
}

export function PublicActionCard({ profile, currentUser, isOwnProfile }: PublicActionCardProps) {
  const router = useRouter();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Generate referral link using current user's referral code
  const getReferralLink = () => {
    if (!currentUser?.referral_code) return null;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    // Use /a/[referral_id] route (referral_id is actually the referral_code)
    return `${baseUrl}/a/${currentUser.referral_code}?redirect=/public-profile/${profile.id}/${profile.slug}`;
  };

  const handleCopyLink = async () => {
    const link = getReferralLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  // If viewing own profile, show edit button
  if (isOwnProfile) {
    return (
      <div className={styles.actionCard}>
        <h3 className={styles.title}>Manage Profile</h3>
        <div className={styles.actions}>
          <Button
            variant="primary"
            fullWidth
            onClick={() => router.push('/account/personal-info')}
          >
            Edit My Profile
          </Button>
        </div>
      </div>
    );
  }

  // Viewing another user's profile
  const handleBookSession = () => {
    // TODO: Implement booking flow
    console.log('Book session with:', profile.full_name);
    alert('Booking feature coming soon!');
  };

  const handleConnect = () => {
    // TODO: Implement connection request
    console.log('Connect with:', profile.full_name);
    alert('Connection feature coming soon!');
  };

  const handleMessage = () => {
    // TODO: Implement messaging
    console.log('Message:', profile.full_name);
    alert('Messaging feature coming soon!');
  };

  const handleShareProfile = () => {
    setIsShareModalOpen(true);
  };

  return (
    <div className={styles.actionCard}>
      <h3 className={styles.title}>Connect</h3>
      <div className={styles.actions}>
        {/* Primary CTA: Book Session (for tutors/agents) */}
        {(profile.active_role === 'tutor' || profile.active_role === 'agent') && (
          <Button
            variant="primary"
            fullWidth
            onClick={handleBookSession}
          >
            Book a Session
          </Button>
        )}

        {/* Secondary CTA: Connect */}
        <Button
          variant="secondary"
          fullWidth
          onClick={handleConnect}
        >
          Connect
        </Button>

        {/* Tertiary CTAs */}
        <Button
          variant="ghost"
          fullWidth
          onClick={handleMessage}
        >
          Message
        </Button>

        <Button
          variant="ghost"
          fullWidth
          onClick={handleShareProfile}
        >
          Share Profile
        </Button>
      </div>

      {/* Share Profile Modal */}
      {isShareModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsShareModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Share {profile.full_name}&apos;s Profile</h3>
              <button
                className={styles.closeButton}
                onClick={() => setIsShareModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {currentUser?.referral_code ? (
              <>
                <p className={styles.modalDescription}>
                  Share this profile and earn rewards when people sign up through your referral link!
                </p>
                <div className={styles.linkContainer}>
                  <input
                    type="text"
                    value={getReferralLink() || ''}
                    readOnly
                    className={styles.linkInput}
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <Button
                    variant={isCopied ? 'secondary' : 'primary'}
                    onClick={handleCopyLink}
                    className={styles.copyButton}
                  >
                    {isCopied ? (
                      <>
                        <Check size={16} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.modalDescription}>
                  You need to be signed in to generate a referral link.
                </p>
                <Button onClick={() => router.push('/login')}>Sign In</Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
