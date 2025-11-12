/**
 * Filename: GetInTouchCard.tsx
 * Purpose: Get in Touch card for public profile sidebar
 * Created: 2025-11-12
 *
 * CTAs:
 * - Send Message (secondary)
 * - Book Session (primary)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import { MessageCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './GetInTouchCard.module.css';

interface GetInTouchCardProps {
  profile: Profile;
  currentUser: Profile | null;
  isOwnProfile: boolean;
}

export function GetInTouchCard({ profile, currentUser, isOwnProfile }: GetInTouchCardProps) {
  const router = useRouter();
  const [isMessaging, setIsMessaging] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Don't show the card if viewing own profile
  if (isOwnProfile) {
    return null;
  }

  const handleSendMessage = async () => {
    if (!currentUser) {
      toast.error('Please login to send messages');
      router.push('/login');
      return;
    }

    setIsMessaging(true);
    try {
      // Navigate to messages page with this user
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
      // Navigate to booking flow (implementation depends on booking system)
      // For now, show a toast
      toast.success('Booking feature coming soon!');
      // TODO: Implement booking flow
      // router.push(`/book/${profile.id}`);
    } catch (error) {
      toast.error('Failed to initiate booking');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <Card className={styles.getInTouchCard}>
      <h3 className={styles.cardTitle}>Get in Touch</h3>

      <div className={styles.buttonsContainer}>
        <Button
          variant="secondary"
          onClick={handleSendMessage}
          disabled={isMessaging}
          className={styles.button}
        >
          <MessageCircle size={20} />
          Send Message
        </Button>

        <Button
          variant="primary"
          onClick={handleBookSession}
          disabled={isBooking}
          className={styles.button}
        >
          <Calendar size={20} />
          Book Session
        </Button>
      </div>
    </Card>
  );
}
