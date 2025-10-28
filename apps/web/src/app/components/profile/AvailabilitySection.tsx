'use client';

import styles from './AvailabilitySection.module.css';
import type { Profile } from '@/types';
import {
  formatAvailabilityPeriod,
  formatUnavailabilityPeriod,
  groupAvailabilityByType,
  type AvailabilityPeriod,
  type UnavailabilityPeriod
} from '@/lib/utils/formatAvailability';

interface AvailabilitySectionProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function AvailabilitySection({ profile, isEditable = false, onSave = () => {} }: AvailabilitySectionProps) {
  // Get role-specific availability data
  const getRoleData = () => {
    const roles = profile.roles || [];
    if (roles.includes('provider')) {
      return profile.professional_details?.provider || profile.professional_details?.tutor;
    } else if (roles.includes('seeker')) {
      return profile.professional_details?.seeker || profile.professional_details?.client;
    } else if (roles.includes('agent')) {
      return profile.professional_details?.agent;
    }
    return null;
  };

  const roleData = getRoleData();
  const availabilityPeriods = (roleData as any)?.availability as AvailabilityPeriod[] || [];
  const unavailabilityPeriods = (roleData as any)?.unavailability as UnavailabilityPeriod[] || [];

  const { recurring, oneTime } = groupAvailabilityByType(availabilityPeriods);

  return (
    <div className={styles.availabilitySection}>
      <div className={styles.available}>
        <h2 className={styles.title}>Available Time Slots</h2>
        <div className={styles.content}>
          {availabilityPeriods.length > 0 ? (
            <>
              {recurring.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Recurring Availability</h4>
                  <ul>
                    {recurring.map((period) => (
                      <li key={period.id}>{formatAvailabilityPeriod(period)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {oneTime.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>One-time Availability</h4>
                  <ul>
                    {oneTime.map((period) => (
                      <li key={period.id}>{formatAvailabilityPeriod(period)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className={styles.placeholder}>No availability specified.</p>
          )}
        </div>
      </div>
      <div className={styles.unavailable}>
        <h2 className={styles.title}>Unavailable Periods</h2>
        <div className={styles.content}>
          {unavailabilityPeriods.length > 0 ? (
            <ul>
              {unavailabilityPeriods.map((period) => (
                <li key={period.id}>{formatUnavailabilityPeriod(period)}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.placeholder}>No unavailable periods specified.</p>
          )}
        </div>
      </div>
    </div>
  );
}
