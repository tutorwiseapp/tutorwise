'use client';

import Card from '@/app/components/ui/Card';
import styles from './ProfessionalInfoSection.module.css';
import type { Profile } from '@/types';

interface ProfessionalInfoSectionProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function ProfessionalInfoSection({ profile, isEditable = false, onSave = () => {} }: ProfessionalInfoSectionProps) {
  // Support both 'provider' and 'tutor' keys for backwards compatibility
  const tutorDetails = profile.professional_details?.provider || profile.professional_details?.tutor;

  return (
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

      {/* Status and Academic Qualifications - 2 Column */}
      <div className={styles.twoColumnGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Status</label>
          <div className={styles.fieldValue}>
            {tutorDetails?.status || ''}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Academic Qualifications</label>
          <div className={styles.fieldValue}>
            {tutorDetails?.academic_qualifications?.join(', ') || ''}
          </div>
        </div>
      </div>

      {/* Key Stages and Teaching Professional Qualifications - 2 Column */}
      <div className={styles.twoColumnGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Key Stages</label>
          <div className={styles.fieldValue}>
            {tutorDetails?.key_stages?.join(', ') || ''}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Teaching Professional Qualifications</label>
          <div className={styles.fieldValue}>
            {tutorDetails?.teaching_professional_qualifications?.join(', ') || ''}
          </div>
        </div>
      </div>

      {/* Subjects and Teaching Experience - 2 Column */}
      <div className={styles.twoColumnGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Subjects</label>
          <div className={styles.fieldValue}>
            {tutorDetails?.subjects?.join(', ') || ''}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Teaching Experience</label>
          <div className={styles.fieldValue}>
            {tutorDetails?.teaching_experience || ''}
          </div>
        </div>
      </div>

      {/* Session Type and Tutoring Experience - 2 Column */}
      <div className={styles.twoColumnGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Session Type</label>
          <div className={styles.fieldValue}>
            {tutorDetails?.session_types?.join(', ') || ''}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Tutoring Experience</label>
          <div className={styles.fieldValue}>
            {tutorDetails?.tutoring_experience || ''}
          </div>
        </div>
      </div>

      {/* Rates - 2 Column */}
      <div className={styles.twoColumnGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>One-on-One Session Rate (per 1 hour session, per student)</label>
          <div className={styles.fieldValue}>
            {tutorDetails?.one_on_one_rate ? `£${tutorDetails.one_on_one_rate}` : ''}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Group Session Rate (per 1 hour session, per student)</label>
          <div className={styles.fieldValue}>
            {tutorDetails?.group_session_rate ? `£${tutorDetails.group_session_rate}` : ''}
          </div>
        </div>
      </div>

      {/* Delivery Mode and DBS Certificate - 2 Column */}
      <div className={styles.twoColumnGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Delivery Mode</label>
          <div className={styles.fieldValue}>
            {tutorDetails?.delivery_mode?.join(', ') || ''}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>DBS Certificate</label>
          <div className={styles.fieldValue}>
            {profile.dbs_certificate_number ? 'Uploaded' : ''}
          </div>
        </div>
      </div>
    </Card>
  );
}
