/**
 * Filename: AvailabilityCard.tsx
 * Purpose: Availability and Unavailability display for public profiles
 * Created: 2025-11-12
 *
 * Layout: 2-column display
 * - Left column: Availability Periods (when they're available)
 * - Right column: Unavailability Periods (when they're not available)
 */

import type { Profile } from '@/types';
import Card from '@/app/components/ui/data-display/Card';
import styles from './AvailabilityCard.module.css';

interface AvailabilityCardProps {
  profile: Profile;
}

export function AvailabilityCard({ profile }: AvailabilityCardProps) {
  const role = profile.active_role || profile.roles?.[0];

  // Get professional details (supports legacy keys)
  const professionalDetails =
    profile.professional_details?.tutor ||
    profile.professional_details?.client ||
    profile.professional_details?.agent;

  const availability = professionalDetails?.availability;
  const unavailability = professionalDetails?.unavailability;

  // Check if there's any availability/unavailability data
  const hasAvailability = availability && (
    Array.isArray(availability) ? availability.length > 0 : Object.keys(availability).length > 0
  );
  const hasUnavailability = unavailability && (
    Array.isArray(unavailability) ? unavailability.length > 0 : Object.keys(unavailability).length > 0
  );

  // If no availability data at all, don't render the card
  if (!hasAvailability && !hasUnavailability) {
    return null;
  }

  const firstName = profile.first_name || profile.full_name?.split(' ')[0] || profile.full_name;

  return (
    <Card className={styles.availabilityCard}>
      {/* Header with light teal background */}
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Availability</h2>
      </div>

      {/* Content wrapper for padding */}
      <div className={styles.cardContent}>
        <div className={styles.columnsContainer}>
        {/* Left Column: Availability Periods */}
        <div className={styles.column}>
          <h3 className={styles.columnTitle}>Available</h3>
          {hasAvailability ? (
            <AvailabilityDisplay data={availability} />
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
          {hasUnavailability ? (
            <UnavailabilityDisplay data={unavailability} />
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>No blackout periods set.</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </Card>
  );
}

// ============================================================
// AVAILABILITY DISPLAY
// ============================================================
function AvailabilityDisplay({ data }: { data: any }) {
  // Handle array format (e.g., ["Monday 9am-5pm", "Tuesday 9am-5pm"])
  if (Array.isArray(data)) {
    return (
      <ul className={styles.periodsList}>
        {data.map((period: string, index: number) => (
          <li key={index} className={styles.periodItem}>
            <span className={styles.periodIcon}>✓</span>
            {period}
          </li>
        ))}
      </ul>
    );
  }

  // Handle object format (e.g., { monday: "9am-5pm", tuesday: "9am-5pm" })
  if (typeof data === 'object' && data !== null) {
    const entries = Object.entries(data).filter(([_, value]) => value);

    if (entries.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No specific times set.</p>
        </div>
      );
    }

    return (
      <ul className={styles.periodsList}>
        {entries.map(([day, time]) => (
          <li key={day} className={styles.periodItem}>
            <span className={styles.periodIcon}>✓</span>
            <span className={styles.dayName}>
              {day.charAt(0).toUpperCase() + day.slice(1)}:
            </span>{' '}
            {time as string}
          </li>
        ))}
      </ul>
    );
  }

  // Handle string format (e.g., "Weekdays 9am-5pm")
  if (typeof data === 'string') {
    return (
      <ul className={styles.periodsList}>
        <li className={styles.periodItem}>
          <span className={styles.periodIcon}>✓</span>
          {data}
        </li>
      </ul>
    );
  }

  return null;
}

// ============================================================
// UNAVAILABILITY DISPLAY
// ============================================================
function UnavailabilityDisplay({ data }: { data: any }) {
  // Handle array format (e.g., ["Dec 20-27", "Jan 1-5"])
  if (Array.isArray(data)) {
    return (
      <ul className={styles.periodsList}>
        {data.map((period: string, index: number) => (
          <li key={index} className={styles.periodItem}>
            <span className={styles.periodIconUnavailable}>×</span>
            {period}
          </li>
        ))}
      </ul>
    );
  }

  // Handle object format (e.g., { holiday: "Dec 20-27", vacation: "Jan 1-5" })
  if (typeof data === 'object' && data !== null) {
    const entries = Object.entries(data).filter(([_, value]) => value);

    if (entries.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No blackout periods.</p>
        </div>
      );
    }

    return (
      <ul className={styles.periodsList}>
        {entries.map(([label, period]) => (
          <li key={label} className={styles.periodItem}>
            <span className={styles.periodIconUnavailable}>×</span>
            <span className={styles.dayName}>
              {label.charAt(0).toUpperCase() + label.slice(1)}:
            </span>{' '}
            {period as string}
          </li>
        ))}
      </ul>
    );
  }

  // Handle string format (e.g., "Holidays: Dec 20 - Jan 5")
  if (typeof data === 'string') {
    return (
      <ul className={styles.periodsList}>
        <li className={styles.periodItem}>
          <span className={styles.periodIconUnavailable}>×</span>
          {data}
        </li>
      </ul>
    );
  }

  return null;
}
