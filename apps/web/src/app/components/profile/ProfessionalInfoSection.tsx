
import styles from './ProfessionalInfoSection.module.css';
import type { Listing } from '@tutorwise/shared-types';

interface ProfessionalInfoSectionProps {
  listing: Listing;
}

export default function ProfessionalInfoSection({ listing }: ProfessionalInfoSectionProps) {
  return (
    <div className={styles.professionalInfoSection}>
      <h2 className={styles.title}>Professional Info</h2>
      <table className={styles.table}>
        <tbody>
          <tr>
            <td>Subject Specialisations</td>
            <td>{listing.subjects.join(', ')}</td>
          </tr>
          <tr>
            <td>Key Stage</td>
            <td>Secondary Education (KS4) - Age 14 to 16</td>
          </tr>
          <tr>
            <td>Teaching Experience</td>
            <td>{listing.teaching_experience}</td>
          </tr>
          <tr>
            <td>Tutoring Experience</td>
            <td>Experienced Tutor (3-5 years)</td>
          </tr>
          <tr>
            <td>Academic Qualifications</td>
            <td>{listing.qualifications?.join(', ')}</td>
          </tr>
          <tr>
            <td>Professional Qualifications</td>
            <td>QTS</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
