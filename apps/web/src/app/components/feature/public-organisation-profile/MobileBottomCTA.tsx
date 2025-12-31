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
import Button from '@/app/components/ui/actions/Button';
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

    // Check if trying to book with self
    if (currentUser.id === profile.id) {
      toast.error('You cannot book a session with yourself');
      return;
    }

    setIsBooking(true);
    try {
      // For now, create a simple direct booking and redirect to Stripe checkout
      // TODO: In future, add a booking modal for date/time selection

      // Generate session start time: 24 hours from now (default)
      const sessionStartTime = new Date();
      sessionStartTime.setHours(sessionStartTime.getHours() + 24);

      // Get hourly rate from professional details or use default
      const hourlyRate = profile.professional_details?.tutor?.hourly_rate || 50; // £50 default

      // Create booking entry
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutor_id: profile.id,
          service_name: `Session with ${profile.full_name}`,
          session_start_time: sessionStartTime.toISOString(),
          session_duration: 60, // 1 hour default
          amount: hourlyRate,
          listing_id: null, // No listing for profile bookings
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create booking');
      }

      const booking = await response.json();

      // Create Stripe checkout session
      const checkoutResponse = await fetch('/api/stripe/create-booking-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
      });

      if (!checkoutResponse.ok) {
        throw new Error('Failed to create payment session');
      }

      const { url } = await checkoutResponse.json();

      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error: any) {
      console.error('Booking failed:', error);
      toast.error(error.message || 'Failed to start booking');
      setIsBooking(false);
    }
    // Don't reset isBooking here - user is being redirected
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
