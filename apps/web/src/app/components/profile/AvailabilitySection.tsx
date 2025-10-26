'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './AvailabilitySection.module.css';
import type { Profile } from '@/types';
import Button from '@/app/components/ui/Button';

interface AvailabilitySectionProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function AvailabilitySection({ profile, isEditable = false, onSave = () => {} }: AvailabilitySectionProps) {
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [availabilityValue, setAvailabilityValue] = useState(
    (profile.professional_details?.tutor as any)?.availability?.join('\n') || ''
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const availability = (profile.professional_details?.tutor as any)?.availability || [];

  // Update local state when profile changes
  useEffect(() => {
    setAvailabilityValue((profile.professional_details?.tutor as any)?.availability?.join('\n') || '');
  }, [profile]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (editingAvailability && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingAvailability]);

  const handleSave = async () => {
    await onSave({
      professional_details: {
        ...profile.professional_details,
        tutor: {
          ...profile.professional_details?.tutor,
          availability: availabilityValue.split('\n').filter((line: string) => line.trim() !== ''),
        } as any,
      },
    });
    setEditingAvailability(false);
  };

  const handleCancel = () => {
    setAvailabilityValue((profile.professional_details?.tutor as any)?.availability?.join('\n') || '');
    setEditingAvailability(false);
  };

  return (
    <div className={styles.availabilitySection}>
      <div className={styles.available}>
        <h2 className={styles.title}>Available Time Slots</h2>
        {editingAvailability ? (
          <div className={styles.editingContainer}>
            <textarea
              ref={textareaRef}
              value={availabilityValue}
              onChange={(e) => setAvailabilityValue(e.target.value)}
              className={styles.textarea}
              rows={7}
              placeholder="Enter one time slot per line&#10;Example: Every Tuesday, 5:00 PM - 7:00 PM"
            />
            <div className={styles.inlineActions}>
              <Button variant="secondary" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`${styles.content} ${isEditable ? styles.editable : ''}`}
            onClick={() => isEditable && setEditingAvailability(true)}
          >
            {availability.length > 0 ? (
              <ul>
                {availability.map((slot: string, index: number) => (
                  <li key={index}>{slot}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.placeholder}>
                {isEditable ? 'Click to add available time slots...' : 'No availability specified.'}
              </p>
            )}
          </div>
        )}
      </div>
      <div className={styles.unavailable}>
        <h2 className={styles.title}>Unavailable Periods</h2>
        <ul>
          <li>25 Jul 2025 - 05 Sep 2025</li>
        </ul>
      </div>
    </div>
  );
}
