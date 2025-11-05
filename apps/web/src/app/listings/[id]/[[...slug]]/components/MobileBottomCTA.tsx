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
  const router = useRouter();
  const [isBooking, setIsBooking] = useState(false);

  const handleBookNow = async () => {
    setIsBooking(true);

    try {
      await createBooking({
        listing_id: listing.id,
        tutor_id: listing.profile_id || '',
        service_type: listing.service_type || 'one-to-one',
        session_duration: listing.session_duration,
        notes: '',
      });

      toast.success('Booking request sent!');
      router.push('/bookings');
    } catch (error) {
      console.error('Booking failed:', error);
      toast.error('Failed to create booking. Please try again.');
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
