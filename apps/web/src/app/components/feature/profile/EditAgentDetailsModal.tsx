'use client';

import { useState, useEffect } from 'react';
import type { Profile } from '@/types';
import Modal from '@/app/components/ui/feedback/Modal';
import Button from '@/app/components/ui/actions/Button';
import FormGroup from '@/app/components/ui/forms/FormGroup';
import styles from './EditAgentDetailsModal.module.css';

interface EditAgentDetailsModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: Partial<Profile>) => void;
}

export default function EditAgentDetailsModal({ profile, isOpen, onClose, onSave }: EditAgentDetailsModalProps) {
  const [bio, setBio] = useState(profile.bio || '');
  const [categories, setCategories] = useState(profile.categories || '');
  const [achievements, setAchievements] = useState(profile.achievements || '');

  useEffect(() => {
    setBio(profile.bio || '');
    setCategories(profile.categories || '');
    setAchievements(profile.achievements || '');
  }, [profile]);

  const handleSave = () => {
    onSave({
      bio,
      categories,
      achievements,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Agent Details">
      <div className={styles.modalContent}>
        <FormGroup label="About" htmlFor="bio">
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
          />
        </FormGroup>
        <FormGroup label="Specialties (comma-separated)" htmlFor="categories">
          <input
            id="categories"
            type="text"
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
          />
        </FormGroup>
        <FormGroup label="Achievements" htmlFor="achievements">
          <textarea
            id="achievements"
            value={achievements}
            onChange={(e) => setAchievements(e.target.value)}
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
