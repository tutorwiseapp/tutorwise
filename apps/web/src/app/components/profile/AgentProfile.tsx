'use client';

import type { Profile } from '@/types';
import Card from '@/app/components/ui/Card';
import styles from './AgentProfile.module.css';

interface AgentProfileProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function AgentProfile({ profile, isEditable = false, onSave = () => {} }: AgentProfileProps) {
  const agentDetails = profile.professional_details?.agent;

  return (
    <div className={styles.mainContent}>
      {/* Left Column - Professional Info */}
      <div className={styles.leftColumn}>
        <Card className={styles.professionalInfoSection}>
          <h2 className={styles.title}>Professional Info</h2>

          {/* About - Full Width */}
          <div className={styles.fullWidth}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>About</label>
              <div className={styles.fieldValue}>
                {profile.bio || ''}
              </div>
            </div>
          </div>

          {/* Agency Name and Agency Size - 2 Column */}
          <div className={styles.twoColumnGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Agency Name</label>
              <div className={styles.fieldValue}>
                {agentDetails?.agency_name || ''}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Agency Size</label>
              <div className={styles.fieldValue}>
                {agentDetails?.agency_size || ''}
              </div>
            </div>
          </div>

          {/* Years in Business and Commission Rate - 2 Column */}
          <div className={styles.twoColumnGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Years in Business</label>
              <div className={styles.fieldValue}>
                {agentDetails?.years_in_business || ''}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Commission Rate</label>
              <div className={styles.fieldValue}>
                {agentDetails?.commission_rate || ''}
              </div>
            </div>
          </div>

          {/* Professional Background - Full Width */}
          <div className={styles.fullWidth}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Professional Background</label>
              <div className={styles.fieldValue}>
                {agentDetails?.professional_background || ''}
              </div>
            </div>
          </div>

          {/* Specializations and Subject Areas - 2 Column */}
          <div className={styles.twoColumnGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Specializations</label>
              <div className={styles.fieldValue}>
                {agentDetails?.specializations?.join(', ') || ''}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Subject Areas</label>
              <div className={styles.fieldValue}>
                {agentDetails?.subjects?.join(', ') || ''}
              </div>
            </div>
          </div>

          {/* Student Capacity and Number of Tutors - 2 Column */}
          <div className={styles.twoColumnGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Student Capacity</label>
              <div className={styles.fieldValue}>
                {agentDetails?.student_capacity || ''}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Number of Tutors</label>
              <div className={styles.fieldValue}>
                {agentDetails?.number_of_tutors || ''}
              </div>
            </div>
          </div>

          {/* Website - Full Width */}
          <div className={styles.fullWidth}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Website</label>
              <div className={styles.fieldValue}>
                {agentDetails?.website ? (
                  <a href={agentDetails.website} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    {agentDetails.website}
                  </a>
                ) : ''}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Column - Member Info */}
      <div className={styles.rightColumn}>
        <Card className={styles.contentCard}>
          <h3>Member Info</h3>
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Member Since</span>
              <span className={styles.infoValue}>
                {profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })
                  : ''}
              </span>
            </div>
            {profile.city && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Location</span>
                <span className={styles.infoValue}>{profile.city}</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
