/**
 * Filename: AvailabilityScheduleCard.tsx
 * Purpose: Structured availability display for public profiles (2-column layout)
 * Created: 2025-12-08
 *
 * Data Source: Account Professional Info (single source of truth)
 * - profile.professional_details.tutor.availability (AvailabilityPeriod[])
 * - profile.professional_details.tutor.unavailability (UnavailabilityPeriod[])
 *
 * Layout: 2-column display
 * - Left column: Availability Periods (recurring + one-time)
 * - Right column: Unavailability Periods
 */

import type { Profile } from '@/types';
import Card from '@/app/components/ui/data-display/Card';
import styles from './AvailabilityScheduleCard.module.css';

interface AvailabilityPeriod {
  id: string;
  type: 'recurring' | 'one-time';
  days?: string[];      // For recurring (e.g., ['Monday', 'Wednesday'])
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

interface AvailabilityScheduleCardProps {
  profile: Profile;
}

export function AvailabilityScheduleCard({ profile }: AvailabilityScheduleCardProps) {
  // Get professional details (supports legacy keys)
  const professionalDetails =
    profile.professional_details?.tutor ||
    profile.professional_details?.client ||
    profile.professional_details?.agent;

  const availability: AvailabilityPeriod[] = professionalDetails?.availability || [];
  const unavailability: UnavailabilityPeriod[] = professionalDetails?.unavailability || [];
  const firstName = profile.first_name || profile.full_name?.split(' ')[0] || profile.full_name;

  // Format availability period based on type
  const formatAvailabilityPeriod = (period: AvailabilityPeriod) => {
    if (period.type === 'recurring' && period.days) {
      return `Every ${period.days.join(', ')}, ${period.startTime} - ${period.endTime}`;
    }
    return `${period.fromDate}, ${period.startTime} - ${period.endTime}`;
  };

  // Format unavailability period
  const formatUnavailabilityPeriod = (period: UnavailabilityPeriod) => {
    return `${period.fromDate} - ${period.toDate}`;
  };

  // Separate recurring and one-time periods
  const recurringPeriods = availability.filter(p => p.type === 'recurring');
  const oneTimePeriods = availability.filter(p => p.type === 'one-time');

  return (
    <Card className={styles.card}>
      {/* Card Header with Light Teal Background */}
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Availability</h2>
      </div>

      {/* Card Content */}
      <div className={styles.cardContent}>
        <div className={styles.columnsContainer}>
          {/* Left Column: Availability Periods */}
          <div className={styles.column}>
          <h3 className={styles.columnTitle}>Available</h3>

          {availability.length > 0 ? (
            <>
              {/* Recurring Availability */}
              {recurringPeriods.length > 0 && (
                <div className={styles.periodGroup}>
                  <h4 className={styles.periodGroupTitle}>Recurring</h4>
                  <div className={styles.periodsList}>
                    {recurringPeriods.map((period) => (
                      <div key={period.id} className={styles.periodItem}>
                        <span className={styles.periodIcon}>✓</span>
                        <span className={styles.periodText}>
                          {formatAvailabilityPeriod(period)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* One-time Availability */}
              {oneTimePeriods.length > 0 && (
                <div className={styles.periodGroup}>
                  <h4 className={styles.periodGroupTitle}>One-time</h4>
                  <div className={styles.periodsList}>
                    {oneTimePeriods.map((period) => (
                      <div key={period.id} className={styles.periodItem}>
                        <span className={styles.periodIcon}>✓</span>
                        <span className={styles.periodText}>
                          {formatAvailabilityPeriod(period)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>
                {firstName} hasn&apos;t set their availability yet.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Unavailability Periods */}
        <div className={styles.column}>
          <h3 className={styles.columnTitle}>Not Available</h3>

          {unavailability.length > 0 ? (
            <div className={styles.periodsList}>
              {unavailability.map((period) => (
                <div key={period.id} className={styles.unavailableItem}>
                  <span className={styles.periodIconUnavailable}>×</span>
                  <span className={styles.periodText}>
                    {formatUnavailabilityPeriod(period)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>No blackout periods set.</p>
            </div>
          )}
        </div>
      </div>

      <p className={styles.note}>
        Final date & time selection will be done during booking.
      </p>
      </div>
    </Card>
  );
}
