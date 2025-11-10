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

  // Extract first name for personalization
  const firstName = profile.full_name
    ? profile.full_name.split(' ')[0]
    : profile.first_name || 'This client';

  return (
    <div className={styles.mainContent}>
      <div className={styles.leftColumn}>
        <Card className={styles.contentCard}>
          {/* About - Full Width */}
          <div className={styles.fullWidth}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>About</label>
              <div className={styles.fieldValue}>
                {profile.bio || ''}
              </div>
            </div>
          </div>

          {/* Subjects and Education Level - 2 Column */}
          <div className={styles.twoColumnGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Subjects</label>
              <div className={styles.fieldValue}>
                {clientDetails?.subjects?.join(', ') || ''}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Education Level</label>
              <div className={styles.fieldValue}>
                {clientDetails?.education_level || ''}
              </div>
            </div>
          </div>

          {/* Learning Goals and Learning Preferences - 2 Column */}
          <div className={styles.twoColumnGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Learning Goals</label>
              <div className={styles.fieldValue}>
                {clientDetails?.goals?.join(', ') || ''}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Learning Preferences</label>
              <div className={styles.fieldValue}>
                {clientDetails?.learning_preferences?.join(', ') || ''}
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
                  : ''}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Maximum Budget (£/hour)</label>
              <div className={styles.fieldValue}>
                {clientDetails?.budget_range && (clientDetails.budget_range as any)?.max
                  ? `£${(clientDetails.budget_range as any).max}`
                  : ''}
              </div>
            </div>
          </div>

          {/* Sessions Per Week and Session Duration - 2 Column */}
          <div className={styles.twoColumnGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Sessions Per Week</label>
              <div className={styles.fieldValue}>
                {clientDetails?.sessions_per_week || ''}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Session Duration</label>
              <div className={styles.fieldValue}>
                {clientDetails?.session_duration || ''}
              </div>
            </div>
          </div>

          {/* Special Educational Needs - 2 Column (left side only) */}
          <div className={styles.twoColumnGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Special Educational Needs (SEN)</label>
              <div className={styles.fieldValue}>
                {clientDetails?.special_needs?.join(', ') || ''}
              </div>
            </div>
            <div></div>
          </div>
        </Card>
      </div>

      <div className={styles.rightColumn}>
        {/* Member Info Card */}
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
}
