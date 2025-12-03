/**
 * Filename: GetInTouchCard.tsx
 * Purpose: Get in Touch card for public profile sidebar
 * Created: 2025-11-12
 * Updated: 2025-11-12 - Redesigned to match listing page ActionCard layout
 *
 * Layout:
 * - Book Session (full width, primary, no icon)
 * - Divider
 * - Contact (left) and Connect (right) with emoji icons
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';
import Card from '@/app/components/ui/data-display/Card';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './GetInTouchCard.module.css';

interface GetInTouchCardProps {
  profile: Profile;
  currentUser: Profile | null;
  isOwnProfile: boolean;
}

export function GetInTouchCard({ profile, currentUser, isOwnProfile }: GetInTouchCardProps) {
  const router = useRouter();
  const [isBooking, setIsBooking] = useState(false);

  const handleBookSession = async () => {
    if (!currentUser) {
      toast.error('Please login to book a session');
      router.push('/login');
      return;
    }

    setIsBooking(true);
    try {
      // Navigate to booking flow
      toast.success('Booking feature coming soon!');
      // TODO: Implement booking flow
      // router.push(`/book/${profile.id}`);
    } catch (error) {
      toast.error('Failed to initiate booking');
    } finally {
      setIsBooking(false);
    }
  };

  const handleContact = async () => {
    if (!currentUser) {
      toast.error('Please login to send messages');
      router.push('/login');
      return;
    }

    try {
      // Navigate to messages page with this user
      router.push(`/messages?userId=${profile.id}`);
    } catch (error) {
      toast.error('Failed to open messages');
    }
  };

  const handleConnect = () => {
    if (!currentUser) {
      toast.error('Please login to connect');
      router.push('/login');
      return;
    }

    toast.success('Connect feature coming soon!');
    // TODO: Implement connect functionality
  };

  return (
    <Card className={styles.getInTouchCard}>
      <h3 className={styles.cardTitle}>Get in Touch</h3>

      {/* Primary CTA: Book Session - full width, no icon */}
      <Button
        variant="primary"
        fullWidth
        onClick={handleBookSession}
        disabled={isBooking}
        className={styles.primaryButton}
      >
        {isBooking ? 'Processing...' : 'Book Session'}
      </Button>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Secondary CTAs: Contact and Connect */}
      <div className={styles.ctaGrid}>
        <button onClick={handleContact} className={styles.ctaButton}>
          <span className={styles.ctaIcon}>💬</span>
          <span className={styles.ctaText}>Contact</span>
        </button>

        <button onClick={handleConnect} className={styles.ctaButton}>
          <span className={styles.ctaIcon}>🔗</span>
          <span className={styles.ctaText}>Connect</span>
        </button>
      </div>
    </Card>
  );
}
