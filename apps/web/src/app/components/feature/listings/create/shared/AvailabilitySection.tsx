/**
 * Filename: AvailabilitySection.tsx
 * Purpose: Reusable availability section (wrapper for existing components)
 * Usage: Both provider (when I'm available) and client (when I need sessions)
 * Created: 2026-01-19
 */

import AvailabilityFormSection from '@/app/components/feature/listings/AvailabilityFormSection';
import UnavailabilityFormSection from '@/app/components/feature/listings/UnavailabilityFormSection';
import type { AvailabilityPeriod } from '@tutorwise/shared-types';
import styles from './FormSections.module.css';

interface AvailabilitySectionProps {
  availability: AvailabilityPeriod[];
  unavailability?: Array<{ id: string; fromDate: string; toDate: string }>;
  onAvailabilityChange: (availability: AvailabilityPeriod[]) => void;
  onUnavailabilityChange?: (unavailability: any[]) => void;
  onLoadFromProfile?: () => void;
  showUnavailability?: boolean;
  errors?: Record<string, string>;
}

export function AvailabilitySection({
  availability,
  unavailability = [],
  onAvailabilityChange,
  onUnavailabilityChange,
  onLoadFromProfile,
  showUnavailability = true,
  errors = {},
}: AvailabilitySectionProps) {
  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: showUnavailability ? '1fr 1fr' : '1fr',
        gap: '1.5rem',
        marginBottom: '1rem'
      }}>
        {/* Left Column: Availability Periods */}
        <AvailabilityFormSection
          value={availability}
          onChange={onAvailabilityChange}
          onLoadFromProfile={onLoadFromProfile}
        />

        {/* Right Column: Unavailability Periods */}
        {showUnavailability && onUnavailabilityChange && (
          <UnavailabilityFormSection
            value={unavailability}
            onChange={onUnavailabilityChange}
          />
        )}
      </div>
      {errors.availability && <p className={styles.errorText}>{errors.availability}</p>}
    </div>
  );
}
