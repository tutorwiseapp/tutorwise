'use client';

import styles from './TutorNarrative.module.css';
import type { Profile } from '@/types';

interface AgentNarrativeProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function AgentNarrative({ profile, isEditable = false, onSave = () => {} }: AgentNarrativeProps) {
  const agentDetails = profile.professional_details?.agent;
  const agencyName = agentDetails?.agency_name || 'our agency';

  return (
    <div className={styles.tutorNarrative}>
      {/* Introduction */}
      <div className={styles.section}>
        <h3 className={styles.title}>Welcome to {agencyName}</h3>
        <p className={styles.text}>
          {profile.bio || 'No introduction provided.'}
        </p>
      </div>

      {/* Specializations */}
      {agentDetails?.specializations && agentDetails.specializations.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.title}>Our Specializations</h3>
          <div className={styles.tagContainer}>
            {agentDetails.specializations.map((specialization: string) => (
              <span key={specialization} className={styles.tag}>{specialization}</span>
            ))}
          </div>
        </div>
      )}

      {/* Subject Areas */}
      {agentDetails?.subjects && agentDetails.subjects.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.title}>Subject Areas</h3>
          <div className={styles.tagContainer}>
            {agentDetails.subjects.map((subject: string) => (
              <span key={subject} className={styles.tag}>{subject}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
