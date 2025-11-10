'use client';

import Card from '@/app/components/ui/Card';
import styles from './ProfessionalInfoSection.module.css';
import type { Profile } from '@/types';

interface ClientProfessionalInfoProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function ClientProfessionalInfo({ profile, isEditable = false, onSave = () => {} }: ClientProfessionalInfoProps) {
  // Support both 'seeker' and 'client' keys for backwards compatibility
  const clientDetails = profile.professional_details?.seeker || profile.professional_details?.client;

  // Check if profile is empty
  const hasAnyDetails = clientDetails && (
    clientDetails.education_level ||
    clientDetails.goals?.length ||
    clientDetails.learning_preferences?.length ||
    clientDetails.budget_range ||
    clientDetails.sessions_per_week ||
    clientDetails.session_duration ||
    clientDetails.special_needs?.length
  );

  // If viewing someone else's profile and they haven't filled it out, show friendly empty state
  if (!isEditable && !hasAnyDetails) {
    return (
      <Card className={styles.professionalInfoSection}>
        <h2 className={styles.title}>Learning Details</h2>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            {profile.full_name} hasn&apos;t added their learning details yet.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.professionalInfoSection}>
      <h2 className={styles.title}>Learning Details</h2>

      {/* Education Level - Full Width */}
      <div className={styles.fullWidth}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Education Level</label>
          <div className={styles.fieldValue}>
            {clientDetails?.education_level || <span className={styles.notSpecified}>Not specified</span>}
          </div>
        </div>
      </div>

      {/* Learning Goals and Preferences - 2 Column */}
      <div className={styles.twoColumnGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Learning Goals</label>
          <div className={styles.fieldValue}>
            {clientDetails?.goals?.join(', ') || <span className={styles.notSpecified}>Not specified</span>}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Learning Preferences</label>
          <div className={styles.fieldValue}>
            {clientDetails?.learning_preferences?.join(', ') || <span className={styles.notSpecified}>Not specified</span>}
          </div>
        </div>
      </div>

      {/* Budget Range - 2 Column */}
      <div className={styles.twoColumnGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Minimum Budget (£/hour)</label>
          <div className={styles.fieldValue}>
            {clientDetails?.budget_range && (clientDetails.budget_range as any)?.min
              ? `£${(clientDetails.budget_range as any).min}`
              : <span className={styles.notSpecified}>Not specified</span>}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Maximum Budget (£/hour)</label>
          <div className={styles.fieldValue}>
            {clientDetails?.budget_range && (clientDetails.budget_range as any)?.max
              ? `£${(clientDetails.budget_range as any).max}`
              : <span className={styles.notSpecified}>Not specified</span>}
          </div>
        </div>
      </div>

      {/* Sessions Per Week and Session Duration - 2 Column */}
      <div className={styles.twoColumnGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Sessions Per Week</label>
          <div className={styles.fieldValue}>
            {clientDetails?.sessions_per_week || <span className={styles.notSpecified}>Not specified</span>}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Session Duration</label>
          <div className={styles.fieldValue}>
            {clientDetails?.session_duration || <span className={styles.notSpecified}>Not specified</span>}
          </div>
        </div>
      </div>

      {/* Special Educational Needs - Full Width */}
      <div className={styles.fullWidth}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Special Educational Needs (SEN)</label>
          <div className={styles.fieldValue}>
            {clientDetails?.special_needs?.join(', ') || <span className={styles.notSpecified}>Not specified</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}
