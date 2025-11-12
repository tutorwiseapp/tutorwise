/**
 * Filename: MobileBottomCTA.tsx
 * Purpose: Fixed bottom CTA bar for mobile devices
 * Created: 2025-11-12
 *
 * Shows primary CTA buttons (Send Message, Book Session) on mobile
 * Fixed to bottom of screen for easy access
 * Hidden on desktop (768px+)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Calendar } from 'lucide-react';
import type { Profile } from '@/types';
import toast from 'react-hot-toast';
import Button from '@/app/components/ui/Button';
import styles from './MobileBottomCTA.module.css';

interface MobileBottomCTAProps {
  profile: Profile;
  currentUser: Profile | null;
  isOwnProfile: boolean;
}

export function MobileBottomCTA({ profile, currentUser, isOwnProfile }: MobileBottomCTAProps) {
  const router = useRouter();
  const [isMessaging, setIsMessaging] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const handleSendMessage = async () => {
    if (!currentUser) {
      toast.error('Please login to send messages');
      router.push('/login');
      return;
    }

    setIsMessaging(true);
    try {
      router.push(`/messages?userId=${profile.id}`);
    } catch (error) {
      toast.error('Failed to open messages');
    } finally {
      setIsMessaging(false);
    }
  };

  const handleBookSession = async () => {
    if (!currentUser) {
      toast.error('Please login to book a session');
      router.push('/login');
      return;
    }

    setIsBooking(true);
    try {
      // TODO: Navigate to booking page when implemented
      toast.success('Booking feature coming soon!');
    } catch (error) {
      toast.error('Failed to start booking');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className={styles.mobileBottomCTA}>
      <div className={styles.ctaContainer}>
        <Button
          variant="secondary"
          onClick={handleSendMessage}
          disabled={isMessaging}
          className={styles.ctaButton}
        >
          <MessageCircle size={20} />
          Message
        </Button>

        <Button
          variant="primary"
          onClick={handleBookSession}
          disabled={isBooking}
          className={styles.ctaButton}
        >
          <Calendar size={20} />
          Book Session
        </Button>
      </div>
    </div>
  );
}
