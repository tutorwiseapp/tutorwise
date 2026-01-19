/**
 * Filename: DeliveryModeSection.tsx
 * Purpose: Reusable delivery mode section (online/hybrid/in-person)
 * Usage: Both provider (I offer) and client (I prefer)
 * Created: 2026-01-19
 */

import { useQuery } from '@tanstack/react-query';
import { fetchFieldsForContext } from '@/lib/api/sharedFields';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import styles from './FormSections.module.css';

interface DeliveryModeSectionProps {
  deliveryMode: string;
  locationDetails?: string;
  onDeliveryModeChange: (mode: string) => void;
  onLocationDetailsChange?: (details: string) => void;
  label?: string;
  locationLabel?: string;
  required?: boolean;
  errors?: Record<string, string>;
}

export function DeliveryModeSection({
  deliveryMode,
  locationDetails = '',
  onDeliveryModeChange,
  onLocationDetailsChange,
  label = 'Delivery Mode',
  locationLabel = 'Location Details',
  required = true,
  errors = {},
}: DeliveryModeSectionProps) {
  const { activeRole } = useUserProfile();

  const listingContext = activeRole === 'tutor'
    ? 'listing.tutor'
    : activeRole === 'agent'
    ? 'listing.agent'
    : 'listing.client';

  const { data: contextFields = [] } = useQuery({
    queryKey: ['listing-fields', listingContext],
    queryFn: () => fetchFieldsForContext(listingContext),
    enabled: !!activeRole,
  });

  const deliveryModeOptions = getDeliveryModeOptions(contextFields);

  const showLocationDetails = deliveryMode === 'in_person' || deliveryMode === 'hybrid';

  return (
    <>
      <div className={styles.formSection}>
        <label className={styles.label}>
          {label} {required && <span className={styles.required}>*</span>}
        </label>
        <select
          value={deliveryMode}
          onChange={(e) => onDeliveryModeChange(e.target.value)}
          className={`${styles.select} ${errors.deliveryMode ? styles.inputError : ''}`}
        >
          <option value="">Select delivery mode...</option>
          {deliveryModeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.deliveryMode && (
          <p className={styles.errorText}>{errors.deliveryMode}</p>
        )}
      </div>

      {showLocationDetails && onLocationDetailsChange && (
        <div className={styles.formSection}>
          <label className={styles.label}>{locationLabel}</label>
          <input
            type="text"
            value={locationDetails}
            onChange={(e) => onLocationDetailsChange(e.target.value)}
            placeholder="e.g., Central London, willing to travel 5 miles"
            className={styles.input}
          />
          <p className={styles.helperText}>
            Specify your location or travel radius
          </p>
        </div>
      )}
    </>
  );
}

function getDeliveryModeOptions(fields: any[]) {
  const field = fields.find(f => f.shared_fields?.field_name === 'deliveryMode');
  if (!field?.shared_fields?.options) {
    return [
      { value: 'online', label: 'Online' },
      { value: 'in_person', label: 'In-person' },
      { value: 'hybrid', label: 'Hybrid (Online & In-person)' },
    ];
  }
  return field.shared_fields.options.map((opt: any) => ({
    value: String(opt.value),
    label: opt.label,
  }));
}
