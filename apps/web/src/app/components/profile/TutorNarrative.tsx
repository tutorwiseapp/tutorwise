'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './TutorNarrative.module.css';
import type { Profile } from '@/types';
import Button from '@/app/components/ui/Button';

interface TutorNarrativeProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function TutorNarrative({ profile, isEditable = false, onSave = () => {} }: TutorNarrativeProps) {
  const [editingField, setEditingField] = useState<'bio' | 'philosophy' | null>(null);
  const [bioValue, setBioValue] = useState(profile.bio || '');
  const [philosophyValue, setPhilosophyValue] = useState(profile.professional_details?.tutor?.qualifications || '');
  const bioTextareaRef = useRef<HTMLTextAreaElement>(null);
  const philosophyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local state when profile changes
  useEffect(() => {
    setBioValue(profile.bio || '');
    setPhilosophyValue(profile.professional_details?.tutor?.qualifications || '');
  }, [profile]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (editingField === 'bio' && bioTextareaRef.current) {
      bioTextareaRef.current.focus();
    } else if (editingField === 'philosophy' && philosophyTextareaRef.current) {
      philosophyTextareaRef.current.focus();
    }
  }, [editingField]);

  // Extract first name from full_name
  const firstName = profile.full_name
    ? profile.full_name.split(' ')[0]
    : 'Tutor';

  const handleSave = async (field: 'bio' | 'philosophy') => {
    if (field === 'bio') {
      await onSave({ bio: bioValue });
    } else if (field === 'philosophy') {
      await onSave({
        professional_details: {
          ...profile.professional_details,
          tutor: {
            ...profile.professional_details?.tutor,
            qualifications: philosophyValue,
          },
        },
      });
    }
    setEditingField(null);
  };

  const handleCancel = (field: 'bio' | 'philosophy') => {
    if (field === 'bio') {
      setBioValue(profile.bio || '');
    } else if (field === 'philosophy') {
      setPhilosophyValue(profile.professional_details?.tutor?.qualifications || '');
    }
    setEditingField(null);
  };

  return (
    <div className={styles.tutorNarrative}>
      {/* Introduction */}
      <div className={styles.section}>
        <h3 className={styles.title}>Hi, I&apos;m {firstName}</h3>
        {editingField === 'bio' ? (
          <div className={styles.editingContainer}>
            <textarea
              ref={bioTextareaRef}
              value={bioValue}
              onChange={(e) => setBioValue(e.target.value)}
              className={styles.textarea}
              rows={5}
            />
            <div className={styles.inlineActions}>
              <Button variant="secondary" size="small" onClick={() => handleCancel('bio')}>
                Cancel
              </Button>
              <Button variant="primary" size="small" onClick={() => handleSave('bio')}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p
            className={`${styles.text} ${isEditable ? styles.editable : ''}`}
            onClick={() => isEditable && setEditingField('bio')}
          >
            {profile.bio || 'Click to add your introduction...'}
          </p>
        )}
      </div>

      {/* Teaching Philosophy */}
      <div className={styles.section}>
        <h3 className={styles.title}>My Teaching Philosophy</h3>
        {editingField === 'philosophy' ? (
          <div className={styles.editingContainer}>
            <textarea
              ref={philosophyTextareaRef}
              value={philosophyValue}
              onChange={(e) => setPhilosophyValue(e.target.value)}
              className={styles.textarea}
              rows={5}
            />
            <div className={styles.inlineActions}>
              <Button variant="secondary" size="small" onClick={() => handleCancel('philosophy')}>
                Cancel
              </Button>
              <Button variant="primary" size="small" onClick={() => handleSave('philosophy')}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p
            className={`${styles.text} ${isEditable ? styles.editable : ''}`}
            onClick={() => isEditable && setEditingField('philosophy')}
          >
            {philosophyValue || 'Click to add your teaching philosophy...'}
          </p>
        )}
      </div>

      {/* Subjects & Specializations */}
      <div className={styles.section}>
        <h3 className={styles.title}>Subjects & Specializations</h3>
        <div className={styles.tagContainer}>
          {profile.professional_details?.tutor?.subjects?.map((subject) => (
            <span key={subject} className={styles.tag}>{subject}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
