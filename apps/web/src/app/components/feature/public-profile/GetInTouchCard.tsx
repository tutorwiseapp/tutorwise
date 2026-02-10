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
}

export function GetInTouchCard({ profile, currentUser }: GetInTouchCardProps) {
  const router = useRouter();
  const [isBooking, setIsBooking] = useState(false);
  const [isCreatingFreeHelpSession, setIsCreatingFreeHelpSession] = useState(false);

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

      // Create booking entry (direct profile booking - no listing_id)
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutor_id: profile.id,
          service_name: `Session with ${profile.full_name}`,
          session_start_time: sessionStartTime.toISOString(),
          session_duration: 60, // 1 hour default
          amount: hourlyRate,
          // No listing_id for direct profile bookings
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create booking');
      }

      const { booking } = await response.json();

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
      toast.error(error.message || 'Failed to initiate booking');
      setIsBooking(false);
    }
    // Don't reset isBooking here - user is being redirected
  };

  const handleContact = async () => {
    if (!currentUser) {
      toast.error('Please login to send messages');
      router.push('/login');
      return;
    }

    // Check if trying to message self
    if (currentUser.id === profile.id) {
      toast.error('You cannot send messages to yourself');
      return;
    }

    try {
      // Navigate to messages page with this user
      router.push(`/messages?userId=${profile.id}`);
    } catch (_error) {
      toast.error('Failed to open messages');
    }
  };

  const handleConnect = async () => {
    if (!currentUser) {
      toast.error('Please login to connect');
      router.push('/login');
      return;
    }

    // Check if trying to connect to self
    if (currentUser.id === profile.id) {
      toast.error('You cannot connect to yourself');
      return;
    }

    try {
      const response = await fetch('/api/network/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_ids: [profile.id],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error.includes('already connected')) {
          toast.error('You are already connected with this user');
        } else if (data.error.includes('pending request')) {
          toast.error('You already have a pending connection request with this user');
        } else {
          toast.error(data.error || 'Failed to send connection request');
        }
        return;
      }

      toast.success('Connection request sent!');
    } catch (error) {
      console.error('Failed to send connection request:', error);
      toast.error('Failed to send connection request. Please try again.');
    }
  };

  // Handle Get Free Help Now button
  const handleGetFreeHelp = async () => {
    // Check if free help is available
    if (!profile.available_free_help) {
      return; // Do nothing - button will show disabled state with message
    }

    // Check if user is logged in
    if (!currentUser) {
      toast.error('Please login to start a free help session');
      router.push('/login');
      return;
    }

    // Check if trying to get help from self
    if (currentUser.id === profile.id) {
      toast.error('You cannot start a free help session with yourself');
      return;
    }

    setIsCreatingFreeHelpSession(true);
    try {
      const response = await fetch('/api/sessions/create-free-help-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorId: profile.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 410) {
          toast.error('This tutor is no longer offering free help');
        } else if (response.status === 429) {
          toast.error(data.error || 'Rate limit reached');
        } else {
          toast.error(data.error || 'Failed to create session');
        }
        return;
      }

      // Success! Redirect to meet link
      toast.success('Connecting you now! The tutor has been notified.');
      window.location.href = data.meetUrl;
    } catch (error) {
      console.error('Failed to create free help session:', error);
      toast.error('Failed to start session. Please try again.');
    } finally {
      setIsCreatingFreeHelpSession(false);
    }
  };

  // Always show card
  return (
    <Card className={styles.getInTouchCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Get in Touch</h3>
      </div>

      <div className={styles.cardContent}>
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
          <button
            onClick={handleContact}
            className={styles.ctaButton}
          >
            <span className={styles.ctaIcon}></span>
            <span className={styles.ctaText}>Contact</span>
          </button>

          <button
            onClick={handleConnect}
            className={styles.ctaButton}
          >
            <span className={styles.ctaIcon}></span>
            <span className={styles.ctaText}>Connect</span>
          </button>
        </div>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Get Free Help Now - Always visible, at bottom */}
        <div className={styles.freeHelpContainer}>
          <button
            onClick={handleGetFreeHelp}
            disabled={!profile.available_free_help || isCreatingFreeHelpSession}
            className={styles.freeHelpButton}
          >
            {isCreatingFreeHelpSession ? 'Connecting...' : 'Get Free Help Now'}
          </button>
          {!profile.available_free_help && (
            <div className={styles.tooltip}>
              This user is not offering free help currently
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
