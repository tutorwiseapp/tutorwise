/**
 * Filename: apps/web/src/app/components/public-profile/PublicActionCard.tsx
 * Purpose: Conversion-focused action card for public profiles (v4.8)
 * Created: 2025-11-10
 *
 * Features:
 * - Context-aware CTAs based on viewer auth state
 * - Own profile: "Edit My Profile" button
 * - Other profiles: "Book Session", "Connect", "Message", "Share Profile"
 * - Role-aware button visibility
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    // TODO: Implement share modal with referral link
    console.log('Share profile:', profile.full_name);
    alert('Share feature coming soon!');
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

      {/* Share Modal Placeholder */}
      {isShareModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsShareModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Share {profile.full_name}&apos;s Profile</h3>
            <p>Referral link feature coming in Phase 3</p>
            <Button onClick={() => setIsShareModalOpen(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
