/*
 * Filename: MobileBottomCTA.tsx
 * Purpose: Fixed bottom CTA bar for mobile (Airbnb pattern)
 * Only visible on mobile/tablet, hidden on desktop
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ListingV41 } from '@/types/listing-v4.1';
import Button from '@/app/components/ui/Button';
import toast from 'react-hot-toast';
import { createBooking } from '@/lib/api/bookings';
import styles from './MobileBottomCTA.module.css';

interface MobileBottomCTAProps {
  listing: ListingV41;
}

export default function MobileBottomCTA({ listing }: MobileBottomCTAProps) {
  const [isBooking, setIsBooking] = useState(false);
  const router = useRouter();

  const handleBookNow = async () => {
    setIsBooking(true);

    try {
      // Generate session start time: 24 hours from now (default booking time)
      const sessionStartTime = new Date();
      sessionStartTime.setHours(sessionStartTime.getHours() + 24);

      // Determine amount based on service type
      let amount = listing.hourly_rate || 0;
      if (listing.service_type === 'study-package') {
        amount = listing.package_price || listing.hourly_rate || 0;
      } else if (listing.service_type === 'workshop') {
        amount = listing.package_price || listing.hourly_rate || 0;
      }

      // Create booking entry
      await createBooking({
        listing_id: listing.id,
        tutor_id: listing.profile_id || '',
        service_name: listing.title,
        session_start_time: sessionStartTime.toISOString(),
        session_duration: listing.session_duration || 60,
        amount: amount,
      });

      toast.success('Booking created successfully! Redirecting to your bookings...');

      // Redirect to bookings page after short delay
      setTimeout(() => {
        router.push('/bookings');
      }, 1500);
    } catch (error: any) {
      console.error('Booking failed:', error);

      // Redirect to login if not authenticated
      if (error.message === 'Not authenticated') {
        toast.error('Please login to book this service');
        router.push('/login');
      } else {
        toast.error('Failed to create booking. Please try again.');
      }
    } finally {
      setIsBooking(false);
    }
  };

  // Format price display
  const formatPrice = () => {
    if (listing.service_type === 'study-package') {
      return `${listing.currency === 'GBP' ? '£' : '$'}${listing.package_price || listing.hourly_rate}`;
    }
    return `${listing.currency === 'GBP' ? '£' : '$'}${listing.hourly_rate}/hr`;
  };

  return (
    <div className={styles.bottomCTA}>
      <div className={styles.content}>
        {/* Left: Price */}
        <div className={styles.priceSection}>
          <span className={styles.price}>{formatPrice()}</span>
          {listing.instant_booking_enabled && (
            <span className={styles.instantBadge}>⚡ Instant</span>
          )}
        </div>

        {/* Right: Book Now button */}
        <Button
          variant="primary"
          onClick={handleBookNow}
          disabled={isBooking}
          className={styles.bookButton}
        >
          {isBooking ? 'Processing...' : 'Book Now'}
        </Button>
      </div>
    </div>
  );
}
