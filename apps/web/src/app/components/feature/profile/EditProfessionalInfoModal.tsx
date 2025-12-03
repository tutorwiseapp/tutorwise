'use client';

import { useState, useEffect } from 'react';
import type { Profile } from '@/types';
import Modal from '@/app/components/ui/feedback/Modal';
import Button from '@/app/components/ui/actions/Button';
import FormGroup from '@/app/components/ui/forms/FormGroup';
import styles from './EditProfessionalInfoModal.module.css';

interface EditProfessionalInfoModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: Partial<Profile>) => void;
}

export default function EditProfessionalInfoModal({ profile, isOpen, onClose, onSave }: EditProfessionalInfoModalProps) {
  const [subjects, setSubjects] = useState(profile.professional_details?.tutor?.subjects?.join(', ') || '');
  const [experience, setExperience] = useState(profile.professional_details?.tutor?.experience || 0);
  const [qualifications, setQualifications] = useState(profile.professional_details?.tutor?.qualifications || '');

  useEffect(() => {
    setSubjects(profile.professional_details?.tutor?.subjects?.join(', ') || '');
    setExperience(profile.professional_details?.tutor?.experience || 0);
    setQualifications(profile.professional_details?.tutor?.qualifications || '');
  }, [profile]);

  const handleSave = () => {
    onSave({
      professional_details: {
        ...profile.professional_details,
        tutor: {
          ...profile.professional_details?.tutor,
          subjects: subjects.split(',').map(s => s.trim()),
          experience: Number(experience),
          qualifications,
        },
      },
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Professional Info">
      <div className={styles.modalContent}>
        <FormGroup label="Subject Specialisations (comma-separated)" htmlFor="subjects">
          <input
            id="subjects"
            type="text"
            value={subjects}
            onChange={(e) => setSubjects(e.target.value)}
          />
        </FormGroup>
        <FormGroup label="Teaching Experience (years)" htmlFor="experience">
          <input
            id="experience"
            type="number"
            value={experience}
            onChange={(e) => setExperience(Number(e.target.value))}
          />
        </FormGroup>
        <FormGroup label="Academic Qualifications" htmlFor="qualifications">
          <textarea
            id="qualifications"
            value={qualifications}
            onChange={(e) => setQualifications(e.target.value)}
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
