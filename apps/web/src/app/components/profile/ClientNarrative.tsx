'use client';

import styles from './TutorNarrative.module.css';
import type { Profile } from '@/types';

interface ClientNarrativeProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function ClientNarrative({ profile, isEditable = false, onSave = () => {} }: ClientNarrativeProps) {
  // Extract first name from full_name
  const firstName = profile.full_name
    ? profile.full_name.split(' ')[0]
    : 'Client';

  const clientDetails = profile.professional_details?.client;

  return (
    <div className={styles.tutorNarrative}>
      {/* Introduction */}
      <div className={styles.section}>
        <h3 className={styles.title}>Hi, I&apos;m {firstName}</h3>
        <p className={styles.text}>
          {profile.bio || 'No introduction provided.'}
        </p>
      </div>

      {/* Subjects */}
      <div className={styles.section}>
        <h3 className={styles.title}>Subjects I&apos;m Learning</h3>
        <div className={styles.tagContainer}>
          {clientDetails?.subjects && clientDetails.subjects.length > 0 ? (
            clientDetails.subjects.map((subject: string) => (
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
