'use client';

import { useState, useEffect } from 'react';
import type { Profile } from '@/types';
import Modal from '@/app/components/ui/Modal';
import Button from '@/app/components/ui/Button';
import FormGroup from '@/app/components/ui/form/FormGroup';
import styles from './EditAvailabilityModal.module.css';

interface EditAvailabilityModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: Partial<Profile>) => void;
}

export default function EditAvailabilityModal({ profile, isOpen, onClose, onSave }: EditAvailabilityModalProps) {
  const [availability, setAvailability] = useState(profile.professional_details?.tutor?.availability?.join('\n') || '');

  useEffect(() => {
    setAvailability(profile.professional_details?.tutor?.availability?.join('\n') || '');
  }, [profile]);

  const handleSave = () => {
    onSave({
      professional_details: {
        ...profile.professional_details,
        tutor: {
          ...profile.professional_details?.tutor,
          availability: availability.split('\n').filter(line => line.trim() !== ''),
        },
      },
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Availability">
      <div className={styles.modalContent}>
        <FormGroup 
          label="Available Time Slots" 
          htmlFor="availability"
          description="Enter one time slot per line. For example: 'Every Tuesday, 5:00 PM - 7:00 PM'"
        >
          <textarea
            id="availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            rows={7}
          />
        </FormGroup>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
}
