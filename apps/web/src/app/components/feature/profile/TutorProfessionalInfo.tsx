'use client';

import Card from '@/app/components/ui/data-display/Card';
import styles from './ProfessionalInfoSection.module.css';
import type { Profile } from '@/types';

interface TutorProfessionalInfoProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function TutorProfessionalInfo({ profile, isEditable = false, onSave = () => {} }: TutorProfessionalInfoProps) {
  const tutorDetails = profile.professional_details?.tutor;

  // Check if profile is empty
  const hasAnyDetails = tutorDetails && (
    tutorDetails.subjects?.length ||
    tutorDetails.levels?.length ||
    tutorDetails.key_stages?.length ||
    tutorDetails.experience ||
    tutorDetails.qualifications ||
    tutorDetails.hourly_rate ||
    tutorDetails.academic_qualifications?.length ||
    tutorDetails.teaching_professional_qualifications?.length ||
    tutorDetails.teaching_experience ||
    tutorDetails.tutoring_experience ||
    tutorDetails.session_types?.length ||
    tutorDetails.delivery_mode?.length ||
    tutorDetails.teaching_style?.length ||
    tutorDetails.professional_background
  );

  // If viewing someone else's profile and they haven't filled it out, show friendly empty state
  if (!isEditable && !hasAnyDetails) {
    return (
      <Card className={styles.professionalInfoSection}>
        <h2 className={styles.title}>Teaching Details</h2>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            {profile.full_name} hasn&apos;t added their teaching details yet.
          </p>
        </div>
      </Card>
    );
  }

  // Extract first name for personalized greeting
  const firstName = profile.full_name
    ? profile.full_name.split(' ')[0]
    : 'Tutor';

  return (
    <Card className={styles.professionalInfoSection}>
      {/* Introduction Section */}
      {profile.bio && (
        <div className={styles.introSection}>
          <h2 className={styles.title}>Hi, I&apos;m {firstName}</h2>
          <p className={styles.bioText}>{profile.bio}</p>
        </div>
      )}

      {!profile.bio && (
        <h2 className={styles.title}>Teaching Details</h2>
      )}

      {/* Subjects & Specializations */}
      {tutorDetails?.subjects && tutorDetails.subjects.length > 0 && (
        <div className={styles.fullWidth}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Subjects & Specializations</label>
            <div className={styles.tagContainer}>
              {tutorDetails.subjects.map((subject: string) => (
                <span key={subject} className={styles.tag}>{subject}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Education Levels and Key Stages - 2 Column */}
      {(tutorDetails?.levels?.length || tutorDetails?.key_stages?.length) && (
        <div className={styles.twoColumnGrid}>
          {tutorDetails?.levels && tutorDetails.levels.length > 0 && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Education Levels</label>
              <div className={styles.tagContainer}>
                {tutorDetails.levels.map((level: string) => (
                  <span key={level} className={styles.tag}>{level}</span>
                ))}
              </div>
            </div>
          )}

          {tutorDetails?.key_stages && tutorDetails.key_stages.length > 0 && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Key Stages</label>
              <div className={styles.tagContainer}>
                {tutorDetails.key_stages.map((stage: string) => (
                  <span key={stage} className={styles.tag}>{stage}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Experience and Hourly Rate - 2 Column */}
      <div className={styles.twoColumnGrid}>
        {tutorDetails?.experience !== undefined && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Years of Experience</label>
            <div className={styles.fieldValue}>
              {tutorDetails.experience} {tutorDetails.experience === 1 ? 'year' : 'years'}
            </div>
          </div>
        )}

        {tutorDetails?.hourly_rate && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Hourly Rate</label>
            <div className={styles.fieldValue}>
              £{tutorDetails.hourly_rate}
            </div>
          </div>
        )}
      </div>

      {/* Academic Qualifications - Full Width */}
      {tutorDetails?.academic_qualifications && tutorDetails.academic_qualifications.length > 0 && (
        <div className={styles.fullWidth}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Academic Qualifications</label>
            <div className={styles.listContainer}>
              {tutorDetails.academic_qualifications.map((qual: string, index: number) => (
                <div key={index} className={styles.listItem}>{qual}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Teaching Professional Qualifications - Full Width */}
      {tutorDetails?.teaching_professional_qualifications && tutorDetails.teaching_professional_qualifications.length > 0 && (
        <div className={styles.fullWidth}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Teaching Qualifications</label>
            <div className={styles.listContainer}>
              {tutorDetails.teaching_professional_qualifications.map((qual: string, index: number) => (
                <div key={index} className={styles.listItem}>{qual}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Teaching Experience - Full Width */}
      {tutorDetails?.teaching_experience && (
        <div className={styles.fullWidth}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Teaching Experience</label>
            <div className={styles.fieldValue}>
              {tutorDetails.teaching_experience}
            </div>
          </div>
        </div>
      )}

      {/* Tutoring Experience - Full Width */}
      {tutorDetails?.tutoring_experience && (
        <div className={styles.fullWidth}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tutoring Experience</label>
            <div className={styles.fieldValue}>
              {tutorDetails.tutoring_experience}
            </div>
          </div>
        </div>
      )}

      {/* Professional Background - Full Width */}
      {tutorDetails?.professional_background && (
        <div className={styles.fullWidth}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Professional Background</label>
            <div className={styles.fieldValue}>
              {tutorDetails.professional_background}
            </div>
          </div>
        </div>
      )}

      {/* Session Types and Delivery Mode - 2 Column */}
      {(tutorDetails?.session_types?.length || tutorDetails?.delivery_mode?.length) && (
        <div className={styles.twoColumnGrid}>
          {tutorDetails?.session_types && tutorDetails.session_types.length > 0 && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Session Types</label>
              <div className={styles.tagContainer}>
                {tutorDetails.session_types.map((type: string) => (
                  <span key={type} className={styles.tag}>{type}</span>
                ))}
              </div>
            </div>
          )}

          {tutorDetails?.delivery_mode && tutorDetails.delivery_mode.length > 0 && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Delivery Mode</label>
              <div className={styles.tagContainer}>
                {tutorDetails.delivery_mode.map((mode: string) => (
                  <span key={mode} className={styles.tag}>{mode}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rates for Different Session Types - 2 Column */}
      {(tutorDetails?.one_on_one_rate || tutorDetails?.group_session_rate) && (
        <div className={styles.twoColumnGrid}>
          {tutorDetails?.one_on_one_rate && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>One-on-One Rate</label>
              <div className={styles.fieldValue}>
                £{tutorDetails.one_on_one_rate} per hour
              </div>
            </div>
          )}

          {tutorDetails?.group_session_rate && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Group Session Rate</label>
              <div className={styles.fieldValue}>
                £{tutorDetails.group_session_rate} per hour
              </div>
            </div>
          )}
        </div>
      )}

      {/* Teaching Style - Full Width */}
      {tutorDetails?.teaching_style && tutorDetails.teaching_style.length > 0 && (
        <div className={styles.fullWidth}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Teaching Style</label>
            <div className={styles.tagContainer}>
              {tutorDetails.teaching_style.map((style: string) => (
                <span key={style} className={styles.tag}>{style}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Teaching Methods - Full Width */}
      {tutorDetails?.teaching_methods && tutorDetails.teaching_methods.length > 0 && (
        <div className={styles.fullWidth}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Teaching Methods</label>
            <div className={styles.tagContainer}>
              {tutorDetails.teaching_methods.map((method: string) => (
                <span key={method} className={styles.tag}>{method}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Qualifications (legacy field) - Full Width */}
      {tutorDetails?.qualifications && (
        <div className={styles.fullWidth}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Qualifications</label>
            <div className={styles.fieldValue}>
              {tutorDetails.qualifications}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
