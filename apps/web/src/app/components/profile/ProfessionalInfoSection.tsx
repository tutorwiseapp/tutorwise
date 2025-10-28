'use client';

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
    <div className={styles.professionalInfoSection}>
      <h2 className={styles.title}>Professional Info</h2>
      <table className={styles.table}>
        <tbody>
          <tr>
            <td className={styles.label}>Subject Specializations</td>
            <td className={styles.value}>
              {tutorDetails?.subjects?.join(', ') || 'N/A'}
            </td>
          </tr>
          <tr>
            <td className={styles.label}>Teaching Experience</td>
            <td className={styles.value}>
              {tutorDetails?.teaching_experience && Object.keys(tutorDetails.teaching_experience).length > 0
                ? JSON.stringify(tutorDetails.teaching_experience)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className={styles.label}>Qualifications</td>
            <td className={styles.value}>
              {tutorDetails?.qualifications && Object.keys(tutorDetails.qualifications).length > 0
                ? JSON.stringify(tutorDetails.qualifications)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className={styles.label}>Hourly Rate</td>
            <td className={styles.value}>
              {tutorDetails?.hourly_rate ? `£${tutorDetails.hourly_rate}` : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className={styles.label}>Teaching Methods</td>
            <td className={styles.value}>
              {tutorDetails?.teaching_methods?.join(', ') || 'N/A'}
            </td>
          </tr>
          <tr>
            <td className={styles.label}>Professional Background</td>
            <td className={styles.value}>
              {tutorDetails?.professional_background || 'N/A'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
