'use client';

import type { Profile } from '@/types';
import Card from '@/app/components/ui/Card';
import styles from './ClientProfile.module.css';

interface ClientProfileProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function ClientProfile({ profile, isEditable = false, onSave = () => {} }: ClientProfileProps) {
  // Support both 'seeker' (from database role_type) and 'client' (legacy) keys
  const clientDetails = profile.professional_details?.seeker || profile.professional_details?.client;

  return (
    <div className={styles.mainContent}>
      <div className={styles.leftColumn}>
        {/* About Section */}
        <Card className={styles.contentCard}>
          <h3>About</h3>
          <p>{profile.bio || 'No introduction provided.'}</p>
        </Card>

        {/* Learning Preferences */}
        <Card className={styles.contentCard}>
          <h3>Learning Preferences</h3>
          <table className={styles.table}>
            <tbody>
              <tr>
                <td className={styles.label}>Subjects of Interest</td>
                <td className={styles.value}>
                  {clientDetails?.subjects?.join(', ') || 'N/A'}
                </td>
              </tr>
              <tr>
                <td className={styles.label}>Learning Goals</td>
                <td className={styles.value}>
                  {clientDetails?.goals?.join(', ') || 'N/A'}
                </td>
              </tr>
              <tr>
                <td className={styles.label}>Learning Style</td>
                <td className={styles.value}>
                  {clientDetails?.learning_style ? clientDetails.learning_style.charAt(0).toUpperCase() + clientDetails.learning_style.slice(1) : 'N/A'}
                </td>
              </tr>
              <tr>
                <td className={styles.label}>Skill Levels</td>
                <td className={styles.value}>
                  {clientDetails?.skill_levels && Object.keys(clientDetails.skill_levels).length > 0
                    ? JSON.stringify(clientDetails.skill_levels)
                    : 'N/A'}
                </td>
              </tr>
              <tr>
                <td className={styles.label}>Budget Range</td>
                <td className={styles.value}>
                  {clientDetails?.budget_range && (clientDetails.budget_range as any)?.min && (clientDetails.budget_range as any)?.max
                    ? `£${(clientDetails.budget_range as any).min} - £${(clientDetails.budget_range as any).max}`
                    : 'N/A'}
                </td>
              </tr>
              <tr>
                <td className={styles.label}>Schedule Preferences</td>
                <td className={styles.value}>
                  {clientDetails?.schedule_preferences && Object.keys(clientDetails.schedule_preferences).length > 0
                    ? JSON.stringify(clientDetails.schedule_preferences)
                    : 'N/A'}
                </td>
              </tr>
              <tr>
                <td className={styles.label}>Previous Tutoring Experience</td>
                <td className={styles.value}>
                  {clientDetails?.previous_experience ? 'Yes' : 'No'}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
      <div className={styles.rightColumn}>
        {/* Add activity feed or other content here if needed */}
      </div>
    </div>
  );
}
