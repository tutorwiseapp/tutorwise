/*
 * Filename: ListingAvailabilityCard.tsx
 * Purpose: Read-only display of listing availability (from v4.0 form)
 */

'use client';

import Card from '@/app/components/ui/Card';
import styles from './ListingAvailabilityCard.module.css';

interface AvailabilityPeriod {
  id: string;
  type: 'recurring' | 'one-time';
  days?: string[];
  fromDate: string;
  toDate?: string;
  startTime: string;
  endTime: string;
}

interface UnavailabilityPeriod {
  id: string;
  fromDate: string;
  toDate: string;
}

interface ListingAvailabilityCardProps {
  availability?: AvailabilityPeriod[];
  unavailability?: UnavailabilityPeriod[];
}

export default function ListingAvailabilityCard({
  availability = [],
  unavailability = [],
}: ListingAvailabilityCardProps) {
  const formatPeriod = (period: AvailabilityPeriod) => {
    if (period.type === 'recurring' && period.days) {
      return `Every ${period.days.join(', ')}, ${period.startTime} - ${period.endTime}`;
    }
    return `${period.fromDate}, ${period.startTime} - ${period.endTime}`;
  };

  const formatUnavailable = (period: UnavailabilityPeriod) => {
    return `${period.fromDate} - ${period.toDate}`;
  };

  if (availability.length === 0 && unavailability.length === 0) {
    return null; // Don't show card if no data
  }

  return (
    <Card className={styles.card}>
      <h4 className={styles.title}>This Listing&apos;s Availability</h4>

      {/* Availability Periods */}
      {availability.length > 0 && (
        <div className={styles.section}>
          <h5 className={styles.sectionTitle}>Available</h5>
          <div className={styles.periodsList}>
            {availability.map((period) => (
              <div key={period.id} className={styles.periodItem}>
                <span className={styles.periodIcon}>✓</span>
                <span className={styles.periodText}>{formatPeriod(period)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unavailability Periods */}
      {unavailability.length > 0 && (
        <div className={styles.section}>
          <h5 className={styles.sectionTitle}>Unavailable</h5>
          <div className={styles.periodsList}>
            {unavailability.map((period) => (
              <div key={period.id} className={styles.unavailableItem}>
                <span className={styles.periodIcon}>✕</span>
                <span className={styles.periodText}>{formatUnavailable(period)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className={styles.note}>
        💡 Final date & time selection will be done during booking.
      </p>
    </Card>
  );
}
