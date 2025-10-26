'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './ProfessionalInfoSection.module.css';
import type { Profile } from '@/types';
import Button from '@/app/components/ui/Button';

interface ProfessionalInfoSectionProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function ProfessionalInfoSection({ profile, isEditable = false, onSave = () => {} }: ProfessionalInfoSectionProps) {
  const [editingField, setEditingField] = useState<'subjects' | 'experience' | 'qualifications' | null>(null);
  const [subjectsValue, setSubjectsValue] = useState(profile.professional_details?.tutor?.subjects?.join(', ') || '');
  const [experienceValue, setExperienceValue] = useState(profile.professional_details?.tutor?.experience || 0);
  const [qualificationsValue, setQualificationsValue] = useState(profile.professional_details?.tutor?.qualifications || '');

  const subjectsInputRef = useRef<HTMLInputElement>(null);
  const experienceInputRef = useRef<HTMLInputElement>(null);
  const qualificationsTextareaRef = useRef<HTMLTextAreaElement>(null);

  const tutorDetails = profile.professional_details?.tutor;

  // Update local state when profile changes
  useEffect(() => {
    setSubjectsValue(profile.professional_details?.tutor?.subjects?.join(', ') || '');
    setExperienceValue(profile.professional_details?.tutor?.experience || 0);
    setQualificationsValue(profile.professional_details?.tutor?.qualifications || '');
  }, [profile]);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editingField === 'subjects' && subjectsInputRef.current) {
      subjectsInputRef.current.focus();
    } else if (editingField === 'experience' && experienceInputRef.current) {
      experienceInputRef.current.focus();
    } else if (editingField === 'qualifications' && qualificationsTextareaRef.current) {
      qualificationsTextareaRef.current.focus();
    }
  }, [editingField]);

  const handleSave = async (field: 'subjects' | 'experience' | 'qualifications') => {
    const updates: any = {
      professional_details: {
        ...profile.professional_details,
        tutor: {
          ...profile.professional_details?.tutor,
        },
      },
    };

    if (field === 'subjects') {
      updates.professional_details.tutor.subjects = subjectsValue.split(',').map(s => s.trim());
    } else if (field === 'experience') {
      updates.professional_details.tutor.experience = Number(experienceValue);
    } else if (field === 'qualifications') {
      updates.professional_details.tutor.qualifications = qualificationsValue;
    }

    await onSave(updates);
    setEditingField(null);
  };

  const handleCancel = (field: 'subjects' | 'experience' | 'qualifications') => {
    if (field === 'subjects') {
      setSubjectsValue(profile.professional_details?.tutor?.subjects?.join(', ') || '');
    } else if (field === 'experience') {
      setExperienceValue(profile.professional_details?.tutor?.experience || 0);
    } else if (field === 'qualifications') {
      setQualificationsValue(profile.professional_details?.tutor?.qualifications || '');
    }
    setEditingField(null);
  };

  return (
    <div className={styles.professionalInfoSection}>
      <h2 className={styles.title}>Professional Info</h2>
      <table className={styles.table}>
        <tbody>
          <tr>
            <td className={styles.label}>Subject Specialisations</td>
            <td className={styles.value}>
              {editingField === 'subjects' ? (
                <div className={styles.editingContainer}>
                  <input
                    ref={subjectsInputRef}
                    type="text"
                    value={subjectsValue}
                    onChange={(e) => setSubjectsValue(e.target.value)}
                    className={styles.input}
                    placeholder="Enter subjects separated by commas"
                  />
                  <div className={styles.inlineActions}>
                    <Button variant="secondary" size="small" onClick={() => handleCancel('subjects')}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="small" onClick={() => handleSave('subjects')}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <span
                  className={isEditable ? styles.editable : ''}
                  onClick={() => isEditable && setEditingField('subjects')}
                >
                  {tutorDetails?.subjects?.join(', ') || (isEditable ? 'Click to add subjects...' : 'N/A')}
                </span>
              )}
            </td>
          </tr>
          <tr>
            <td className={styles.label}>Key Stage</td>
            <td className={styles.value}>Secondary Education (KS4) - Age 14 to 16</td>
          </tr>
          <tr>
            <td className={styles.label}>Teaching Experience</td>
            <td className={styles.value}>
              {editingField === 'experience' ? (
                <div className={styles.editingContainer}>
                  <input
                    ref={experienceInputRef}
                    type="number"
                    value={experienceValue}
                    onChange={(e) => setExperienceValue(Number(e.target.value))}
                    className={styles.input}
                    placeholder="Years of experience"
                  />
                  <div className={styles.inlineActions}>
                    <Button variant="secondary" size="small" onClick={() => handleCancel('experience')}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="small" onClick={() => handleSave('experience')}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <span
                  className={isEditable ? styles.editable : ''}
                  onClick={() => isEditable && setEditingField('experience')}
                >
                  {tutorDetails?.experience ? `${tutorDetails.experience} years` : (isEditable ? 'Click to add experience...' : 'N/A')}
                </span>
              )}
            </td>
          </tr>
          <tr>
            <td className={styles.label}>Tutoring Experience</td>
            <td className={styles.value}>Experienced Tutor (3-5 years)</td>
          </tr>
          <tr>
            <td className={styles.label}>Academic Qualifications</td>
            <td className={styles.value}>
              {editingField === 'qualifications' ? (
                <div className={styles.editingContainer}>
                  <textarea
                    ref={qualificationsTextareaRef}
                    value={qualificationsValue}
                    onChange={(e) => setQualificationsValue(e.target.value)}
                    className={styles.textarea}
                    rows={3}
                    placeholder="Enter your qualifications"
                  />
                  <div className={styles.inlineActions}>
                    <Button variant="secondary" size="small" onClick={() => handleCancel('qualifications')}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="small" onClick={() => handleSave('qualifications')}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <span
                  className={isEditable ? styles.editable : ''}
                  onClick={() => isEditable && setEditingField('qualifications')}
                >
                  {tutorDetails?.qualifications || (isEditable ? 'Click to add qualifications...' : 'N/A')}
                </span>
              )}
            </td>
          </tr>
          <tr>
            <td className={styles.label}>Professional Qualifications</td>
            <td className={styles.value}>QTS</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
