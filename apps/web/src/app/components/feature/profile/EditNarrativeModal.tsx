'use client';

import { useState, useEffect } from 'react';
import type { Profile } from '@/types';
import Modal from '@/app/components/ui/feedback/Modal';
import Button from '@/app/components/ui/actions/Button';
import FormGroup from '@/app/components/ui/forms/FormGroup';
import styles from './EditNarrativeModal.module.css';

interface EditNarrativeModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: Partial<Profile>) => void;
}

export default function EditNarrativeModal({ profile, isOpen, onClose, onSave }: EditNarrativeModalProps) {
  const [bio, setBio] = useState(profile.bio || '');
  const [teachingPhilosophy, setTeachingPhilosophy] = useState(profile.professional_details?.tutor?.qualifications || '');

  useEffect(() => {
    setBio(profile.bio || '');
    setTeachingPhilosophy(profile.professional_details?.tutor?.qualifications || '');
  }, [profile]);

  const handleSave = () => {
    onSave({
      bio,
      professional_details: {
        ...profile.professional_details,
        tutor: {
          ...profile.professional_details?.tutor,
          qualifications: teachingPhilosophy,
        },
      },
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Narrative">
      <div className={styles.modalContent}>
        <FormGroup label="About (Public Bio)" htmlFor="bio">
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
          />
        </FormGroup>
        <FormGroup label="Teaching Philosophy" htmlFor="teachingPhilosophy">
          <textarea
            id="teachingPhilosophy"
            value={teachingPhilosophy}
            onChange={(e) => setTeachingPhilosophy(e.target.value)}
            rows={5}
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
