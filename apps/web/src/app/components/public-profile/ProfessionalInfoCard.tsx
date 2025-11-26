/**
 * Filename: ProfessionalInfoCard.tsx
 * Purpose: Professional Information card for public profiles (NO BIO)
 * Created: 2025-11-12
 *
 * Displays role-specific professional details:
 * - Tutor: Subjects, Levels, Qualifications, Experience
 * - Client: Subjects, Education Level, Learning Goals, Preferences
 * - Agent: Agency Details, Services, Specializations
 *
 * Note: Bio is handled separately in AboutCard component
 */

import type { Profile } from '@/types';
import Card from '@/app/components/ui/Card';
import styles from './ProfessionalInfoCard.module.css';

interface ProfessionalInfoCardProps {
  profile: Profile;
}

export function ProfessionalInfoCard({ profile }: ProfessionalInfoCardProps) {
  const role = profile.active_role || profile.roles?.[0];

  // Check professional_details to determine which component to render
  const hasTutorDetails = profile.professional_details?.tutor;
  const hasClientDetails = profile.professional_details?.client;
  const hasAgentDetails = profile.professional_details?.agent;

  // Render role-specific professional info based on available data
  if (hasTutorDetails || role === 'tutor') {
    return <TutorProfessionalInfo profile={profile} />;
  } else if (hasClientDetails || role === 'client') {
    return <ClientProfessionalInfo profile={profile} />;
  } else if (hasAgentDetails || role === 'agent') {
    return <AgentProfessionalInfo profile={profile} />;
  }

  // No professional details found
  return null;
}

// ============================================================
// TUTOR PROFESSIONAL INFO
// ============================================================
function TutorProfessionalInfo({ profile }: { profile: Profile }) {
  const tutorDetails = profile.professional_details?.tutor;

  // Check if profile has any details
  const hasAnyDetails = tutorDetails && (
    tutorDetails.subjects?.length ||
    tutorDetails.levels?.length ||
    tutorDetails.key_stages?.length ||
    tutorDetails.academic_qualifications?.length ||
    tutorDetails.teaching_professional_qualifications?.length ||
    tutorDetails.teaching_experience ||
    tutorDetails.tutoring_experience ||
    tutorDetails.qualifications ||
    tutorDetails.experience
  );

  // Empty state
  if (!hasAnyDetails) {
    const firstName = profile.first_name || profile.full_name?.split(' ')[0] || profile.full_name;
    return (
      <Card className={styles.professionalCard}>
        <h2 className={styles.cardTitle}>Professional Information</h2>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            {firstName} hasn&apos;t added their professional details yet.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.professionalCard}>
      <h2 className={styles.cardTitle}>Professional Information</h2>

      {/* Subjects Covered */}
      {tutorDetails?.subjects && tutorDetails.subjects.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Subjects Covered</h3>
          <div className={styles.tagContainer}>
            {tutorDetails.subjects.map((subject: string) => (
              <span key={subject} className={styles.tag}>{subject}</span>
            ))}
          </div>
        </div>
      )}

      {/* Educational Levels */}
      {(tutorDetails?.levels && tutorDetails.levels.length > 0) || (tutorDetails?.key_stages && tutorDetails.key_stages.length > 0) ? (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Educational Levels</h3>
          <div className={styles.tagContainer}>
            {tutorDetails?.levels?.map((level: string) => (
              <span key={level} className={styles.tag}>{level}</span>
            ))}
            {tutorDetails?.key_stages?.map((stage: string) => (
              <span key={stage} className={styles.tag}>{stage}</span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Academic Qualifications */}
      {tutorDetails?.academic_qualifications && tutorDetails.academic_qualifications.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Academic Qualifications</h3>
          <ul className={styles.qualificationsList}>
            {tutorDetails.academic_qualifications.map((qual: string, index: number) => (
              <li key={index}>{qual}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Professional Qualifications */}
      {tutorDetails?.teaching_professional_qualifications && tutorDetails.teaching_professional_qualifications.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Professional Qualifications</h3>
          <ul className={styles.qualificationsList}>
            {tutorDetails.teaching_professional_qualifications.map((qual: string, index: number) => (
              <li key={index}>{qual}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Legacy qualifications field (if present) */}
      {tutorDetails?.qualifications && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Qualifications</h3>
          <p className={styles.text}>{tutorDetails.qualifications}</p>
        </div>
      )}

      {/* Teaching Experience */}
      {tutorDetails?.teaching_experience && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Teaching Experience</h3>
          <p className={styles.text}>{tutorDetails.teaching_experience}</p>
        </div>
      )}

      {/* Tutoring Experience */}
      {tutorDetails?.tutoring_experience && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Tutoring Experience</h3>
          <p className={styles.text}>{tutorDetails.tutoring_experience}</p>
        </div>
      )}

      {/* Legacy experience field (if present) */}
      {tutorDetails?.experience && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Years of Experience</h3>
          <p className={styles.text}>{tutorDetails.experience} years</p>
        </div>
      )}
    </Card>
  );
}

// ============================================================
// CLIENT PROFESSIONAL INFO
// ============================================================
function ClientProfessionalInfo({ profile }: { profile: Profile }) {
  const clientDetails = profile.professional_details?.client;

  // Check if profile has any details
  const hasAnyDetails = clientDetails && (
    clientDetails.subjects?.length ||
    clientDetails.education_level ||
    clientDetails.learning_goals?.length ||
    clientDetails.goals?.length ||
    clientDetails.learning_preferences?.length ||
    clientDetails.budget_range ||
    clientDetails.sessions_per_week
  );

  // Empty state
  if (!hasAnyDetails) {
    const firstName = profile.first_name || profile.full_name?.split(' ')[0] || profile.full_name;
    return (
      <Card className={styles.professionalCard}>
        <h2 className={styles.cardTitle}>Learning Profile</h2>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            {firstName} hasn&apos;t added their learning profile yet.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.professionalCard}>
      <h2 className={styles.cardTitle}>Learning Profile</h2>

      {/* Subjects of Interest */}
      {clientDetails?.subjects && clientDetails.subjects.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Subjects of Interest</h3>
          <div className={styles.tagContainer}>
            {clientDetails.subjects.map((subject: string) => (
              <span key={subject} className={styles.tag}>{subject}</span>
            ))}
          </div>
        </div>
      )}

      {/* Education Level */}
      {clientDetails?.education_level && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Education Level</h3>
          <p className={styles.text}>{clientDetails.education_level}</p>
        </div>
      )}

      {/* Learning Goals */}
      {(clientDetails?.learning_goals?.length || clientDetails?.goals?.length) && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Learning Goals</h3>
          <ul className={styles.qualificationsList}>
            {(clientDetails.learning_goals || clientDetails.goals || []).map((goal: string, index: number) => (
              <li key={index}>{goal}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Learning Preferences */}
      {clientDetails?.learning_preferences && clientDetails.learning_preferences.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Learning Preferences</h3>
          <div className={styles.tagContainer}>
            {clientDetails.learning_preferences.map((pref: string) => (
              <span key={pref} className={styles.tag}>{pref}</span>
            ))}
          </div>
        </div>
      )}

      {/* Budget Range */}
      {clientDetails?.budget_range && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Budget Range</h3>
          <p className={styles.text}>£{clientDetails.budget_range}/hour</p>
        </div>
      )}

      {/* Session Frequency */}
      {clientDetails?.sessions_per_week && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Desired Session Frequency</h3>
          <p className={styles.text}>{clientDetails.sessions_per_week}</p>
        </div>
      )}
    </Card>
  );
}

// ============================================================
// AGENT PROFESSIONAL INFO
// ============================================================
function AgentProfessionalInfo({ profile }: { profile: Profile }) {
  const agentDetails = profile.professional_details?.agent;

  // Check if profile has any details
  const hasAnyDetails = agentDetails && (
    agentDetails.agency_name ||
    agentDetails.services?.length ||
    agentDetails.subject_specializations?.length ||
    agentDetails.education_levels?.length ||
    agentDetails.coverage_areas?.length ||
    agentDetails.number_of_tutors ||
    agentDetails.years_in_business
  );

  // Empty state
  if (!hasAnyDetails) {
    const firstName = profile.first_name || profile.full_name?.split(' ')[0] || profile.full_name;
    return (
      <Card className={styles.professionalCard}>
        <h2 className={styles.cardTitle}>Agency Information</h2>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            {firstName} hasn&apos;t added their agency details yet.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.professionalCard}>
      <h2 className={styles.cardTitle}>Agency Information</h2>

      {/* Agency Name */}
      {agentDetails?.agency_name && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Agency Name</h3>
          <p className={styles.text}>{agentDetails.agency_name}</p>
        </div>
      )}

      {/* Services Offered */}
      {agentDetails?.services && agentDetails.services.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Services Offered</h3>
          <div className={styles.tagContainer}>
            {agentDetails.services.map((service: string) => (
              <span key={service} className={styles.tag}>{service}</span>
            ))}
          </div>
        </div>
      )}

      {/* Subject Specializations */}
      {agentDetails?.subject_specializations && agentDetails.subject_specializations.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Subject Specializations</h3>
          <div className={styles.tagContainer}>
            {agentDetails.subject_specializations.map((subject: string) => (
              <span key={subject} className={styles.tag}>{subject}</span>
            ))}
          </div>
        </div>
      )}

      {/* Education Levels */}
      {agentDetails?.education_levels && agentDetails.education_levels.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Education Levels Covered</h3>
          <div className={styles.tagContainer}>
            {agentDetails.education_levels.map((level: string) => (
              <span key={level} className={styles.tag}>{level}</span>
            ))}
          </div>
        </div>
      )}

      {/* Coverage Areas */}
      {agentDetails?.coverage_areas && agentDetails.coverage_areas.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Coverage Areas</h3>
          <div className={styles.tagContainer}>
            {agentDetails.coverage_areas.map((area: string) => (
              <span key={area} className={styles.tag}>{area}</span>
            ))}
          </div>
        </div>
      )}

      {/* Number of Tutors */}
      {agentDetails?.number_of_tutors && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Tutor Network</h3>
          <p className={styles.text}>{agentDetails.number_of_tutors} tutors</p>
        </div>
      )}

      {/* Years in Business */}
      {agentDetails?.years_in_business && (
        <div className={styles.section}>
          <h3 className={styles.sectionLabel}>Years in Business</h3>
          <p className={styles.text}>{agentDetails.years_in_business}</p>
        </div>
      )}
    </Card>
  );
}
