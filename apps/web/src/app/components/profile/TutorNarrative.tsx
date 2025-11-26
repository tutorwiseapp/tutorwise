'use client';

import styles from './TutorNarrative.module.css';
import type { Profile } from '@/types';

interface TutorNarrativeProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function TutorNarrative({ profile, isEditable = false, onSave = () => {} }: TutorNarrativeProps) {
  // Extract first name from full_name
  const firstName = profile.full_name
    ? profile.full_name.split(' ')[0]
    : 'Tutor';

  return (
    <div className={styles.tutorNarrative}>
      {/* Introduction */}
      <div className={styles.section}>
        <h3 className={styles.title}>Hi, I&apos;m {firstName}</h3>
        <p className={styles.text}>
          {profile.bio || 'No introduction provided.'}
        </p>
      </div>

      {/* Subjects & Specializations */}
      <div className={styles.section}>
        <h3 className={styles.title}>Subjects & Specializations</h3>
        <div className={styles.tagContainer}>
          {profile.professional_details?.tutor?.subjects && profile.professional_details.tutor.subjects.length > 0 ? (
            profile.professional_details.tutor.subjects.map((subject: string) => (
              <span key={subject} className={styles.tag}>{subject}</span>
            ))
          ) : (
            <p className={styles.text}>No subjects specified.</p>
          )}
        </div>
      </div>
    </div>
  );
}
