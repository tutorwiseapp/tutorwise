'use client';

import Card from '@/app/components/ui/Card';
import styles from './ProfessionalInfoSection.module.css';
import type { Profile } from '@/types';

interface AgentProfessionalInfoProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function AgentProfessionalInfo({ profile, isEditable = false, onSave = () => {} }: AgentProfessionalInfoProps) {
  const agentDetails = profile.professional_details?.agent;

  return (
    <Card className={styles.professionalInfoSection}>
      <h2 className={styles.title}>Agency Details</h2>

      {/* Agency Size and Years in Business - 2 Column */}
      <div className={styles.twoColumnGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Agency Size</label>
          <div className={styles.fieldValue}>
            {agentDetails?.agency_size || ''}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Years in Business</label>
          <div className={styles.fieldValue}>
            {agentDetails?.years_in_business || ''}
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

      {/* Commission Rate and Website - 2 Column */}
      <div className={styles.twoColumnGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Commission Rate</label>
          <div className={styles.fieldValue}>
            {agentDetails?.commission_rate || ''}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Website</label>
          <div className={styles.fieldValue}>
            {agentDetails?.website ? (
              <a
                href={agentDetails.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-primary, #006C67)', textDecoration: 'none' }}
              >
                {agentDetails.website}
              </a>
            ) : ''}
          </div>
        </div>
      </div>
    </Card>
  );
}
