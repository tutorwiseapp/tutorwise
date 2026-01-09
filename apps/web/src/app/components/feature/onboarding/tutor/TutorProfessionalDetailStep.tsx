'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import { ProfessionalDetailsData } from '@/types';
import { HubForm } from '@/app/components/hub/form/HubForm';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';

interface TutorProfessionalDetailStepProps {
  onNext: (details: ProfessionalDetailsData) => void;
  onBack?: () => void;
  isLoading: boolean;
}

// Status options
const statusOptions = [
  { value: 'Professional Tutor', label: 'Professional Tutor' },
  { value: 'Solo Tutor', label: 'Solo Tutor' },
  { value: 'Part-time Tutor', label: 'Part-time Tutor' },
];

// Academic qualifications
const academicQualificationsOptions = [
  { value: 'University Degree', label: 'University Degree' },
  { value: "Master's Degree", label: "Master's Degree" },
  { value: 'PhD', label: 'PhD' },
  { value: 'Professional Certificate', label: 'Professional Certificate' },
];

// Teaching professional qualifications
const teachingProfessionalQualificationsOptions = [
  { value: 'QTLS, QTS', label: 'QTLS, QTS' },
  { value: 'PGCE', label: 'PGCE' },
  { value: 'Teaching License', label: 'Teaching License' },
  { value: 'None', label: 'None' },
];

// Teaching experience
const teachingExperienceOptions = [
  { value: 'New Teacher (0-3 years)', label: 'New Teacher (0-3 years)' },
  { value: 'Experienced Teacher (4-7 years)', label: 'Experienced Teacher (4-7 years)' },
  { value: 'Senior Teacher (8+ years)', label: 'Senior Teacher (8+ years)' },
];

// Tutoring experience
const tutoringExperienceOptions = [
  { value: 'New Tutor (0-2 years)', label: 'New Tutor (0-2 years)' },
  { value: 'Experienced Tutor (3-5 years)', label: 'Experienced Tutor (3-5 years)' },
  { value: 'Expert Tutor (5+ years)', label: 'Expert Tutor (5+ years)' },
];

// Key stages
const keyStagesOptions = [
  { value: 'Primary Education (KS1-KS2) - Age 5 to 11', label: 'Primary Education (KS1-KS2) - Age 5 to 11' },
  { value: 'Secondary Education (KS3) - Age 11 to 14', label: 'Secondary Education (KS3) - Age 11 to 14' },
  { value: 'Secondary Education (KS4) - Age 14 to 16', label: 'Secondary Education (KS4) - Age 14 to 16' },
  { value: 'A-Levels - Age 16 to 18', label: 'A-Levels - Age 16 to 18' },
];

// Subjects
const subjectsOptions = [
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'English', label: 'English' },
  { value: 'Science', label: 'Science' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Biology', label: 'Biology' },
  { value: 'History', label: 'History' },
  { value: 'Geography', label: 'Geography' },
  { value: 'Languages', label: 'Languages' },
];

// Session types
const sessionTypeOptions = [
  { value: 'One-to-One Session', label: 'One-to-One Session' },
  { value: 'Group Session', label: 'Group Session' },
];

// Delivery modes
const deliveryModeOptions = [
  { value: 'Online', label: 'Online' },
  { value: 'In-person', label: 'In-person' },
  { value: 'Hybrid', label: 'Hybrid' },
];

const TutorProfessionalDetailStep: React.FC<TutorProfessionalDetailStepProps> = ({
  onNext,
  onBack,
  isLoading
}) => {
  const [formData, setFormData] = useState<ProfessionalDetailsData>({
    bio: '',
    bioVideoUrl: '',
    status: '',
    academicQualifications: [],
    teachingProfessionalQualifications: [],
    teachingExperience: '',
    tutoringExperience: '',
    keyStages: [],
    subjects: [],
    sessionType: [],
    deliveryMode: [],
    oneOnOneRate: 0,
    groupSessionRate: 0,
  });

  // Validation - required fields
  const isValid =
    formData.bio.trim().length >= 50 &&
    formData.status !== '' &&
    formData.academicQualifications.length > 0 &&
    formData.teachingExperience !== '' &&
    formData.tutoringExperience !== '' &&
    formData.keyStages.length > 0 &&
    formData.subjects.length > 0 &&
    formData.sessionType.length > 0 &&
    formData.deliveryMode.length > 0 &&
    formData.oneOnOneRate > 0;

  // Debug validation
  React.useEffect(() => {
    console.log('[TutorProfessionalDetailStep] Validation state:', {
      bio: formData.bio.trim().length,
      bioValid: formData.bio.trim().length >= 50,
      status: formData.status,
      statusValid: formData.status !== '',
      academicQualifications: formData.academicQualifications.length,
      academicValid: formData.academicQualifications.length > 0,
      teachingExperience: formData.teachingExperience,
      teachingExpValid: formData.teachingExperience !== '',
      tutoringExperience: formData.tutoringExperience,
      tutoringExpValid: formData.tutoringExperience !== '',
      keyStages: formData.keyStages.length,
      keyStagesValid: formData.keyStages.length > 0,
      subjects: formData.subjects.length,
      subjectsValid: formData.subjects.length > 0,
      sessionType: formData.sessionType.length,
      sessionTypeValid: formData.sessionType.length > 0,
      deliveryMode: formData.deliveryMode.length,
      deliveryModeValid: formData.deliveryMode.length > 0,
      oneOnOneRate: formData.oneOnOneRate,
      rateValid: formData.oneOnOneRate > 0,
      isValid
    });
  }, [formData, isValid]);

  const handleContinue = () => {
    onNext(formData);
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          Professional Details
        </h2>
        <p className={styles.stepSubtitle}>
          Tutor Onboarding • Tell us about your professional background and services
        </p>
      </div>

      <div className={styles.stepBody}>
        <HubForm.Root>
          <HubForm.Section>
            {/* About & Status */}
            <HubForm.Grid columns={1}>
              <HubForm.Field label="About You" required>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Describe your tutoring or teaching style, strengths, and what areas you specialise in"
                  rows={4}
                  disabled={isLoading}
                />
                <span style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px', display: 'block' }}>
                  {formData.bio.length}/50 characters minimum
                </span>
              </HubForm.Field>
            </HubForm.Grid>

            <HubForm.Grid>
              <HubForm.Field label="30-Second Intro Video (Optional)">
                <input
                  type="url"
                  value={formData.bioVideoUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, bioVideoUrl: e.target.value }))}
                  placeholder="Paste YouTube, Loom, or Vimeo URL for +5 CaaS points"
                  disabled={isLoading}
                />
              </HubForm.Field>

              <HubForm.Field label="Status" required>
                <UnifiedSelect
                  value={formData.status}
                  onChange={(value) => setFormData(prev => ({ ...prev, status: String(value) }))}
                  options={statusOptions}
                  placeholder="Select status"
                  disabled={isLoading}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Education & Qualifications */}
            <HubForm.Grid>
              <HubForm.Field label="Academic Qualifications" required>
                <UnifiedMultiSelect
                  triggerLabel={
                    formData.academicQualifications.length > 0
                      ? `${formData.academicQualifications.length} selected`
                      : 'Select qualifications'
                  }
                  options={academicQualificationsOptions}
                  selectedValues={formData.academicQualifications}
                  onSelectionChange={(values) => setFormData(prev => ({ ...prev, academicQualifications: values }))}
                />
              </HubForm.Field>

              <HubForm.Field label="Teaching Professional Qualifications">
                <UnifiedMultiSelect
                  triggerLabel={
                    formData.teachingProfessionalQualifications.length > 0
                      ? `${formData.teachingProfessionalQualifications.length} selected`
                      : 'Select qualifications'
                  }
                  options={teachingProfessionalQualificationsOptions}
                  selectedValues={formData.teachingProfessionalQualifications}
                  onSelectionChange={(values) => setFormData(prev => ({ ...prev, teachingProfessionalQualifications: values }))}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Experience */}
            <HubForm.Grid>
              <HubForm.Field label="Teaching Experience" required>
                <UnifiedSelect
                  value={formData.teachingExperience}
                  onChange={(value) => setFormData(prev => ({ ...prev, teachingExperience: String(value) }))}
                  options={teachingExperienceOptions}
                  placeholder="Select experience"
                  disabled={isLoading}
                />
              </HubForm.Field>

              <HubForm.Field label="Tutoring Experience" required>
                <UnifiedSelect
                  value={formData.tutoringExperience}
                  onChange={(value) => setFormData(prev => ({ ...prev, tutoringExperience: String(value) }))}
                  options={tutoringExperienceOptions}
                  placeholder="Select experience"
                  disabled={isLoading}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Subjects & Key Stages */}
            <HubForm.Grid>
              <HubForm.Field label="Key Stages" required>
                <UnifiedMultiSelect
                  triggerLabel={
                    formData.keyStages.length > 0
                      ? `${formData.keyStages.length} selected`
                      : 'Select key stages'
                  }
                  options={keyStagesOptions}
                  selectedValues={formData.keyStages}
                  onSelectionChange={(values) => setFormData(prev => ({ ...prev, keyStages: values }))}
                />
              </HubForm.Field>

              <HubForm.Field label="Subjects" required>
                <UnifiedMultiSelect
                  triggerLabel={
                    formData.subjects.length > 0
                      ? `${formData.subjects.length} selected`
                      : 'Select subjects'
                  }
                  options={subjectsOptions}
                  selectedValues={formData.subjects}
                  onSelectionChange={(values) => setFormData(prev => ({ ...prev, subjects: values }))}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Session Details */}
            <HubForm.Grid>
              <HubForm.Field label="Session Type" required>
                <UnifiedMultiSelect
                  triggerLabel={
                    formData.sessionType.length > 0
                      ? `${formData.sessionType.length} selected`
                      : 'Select session types'
                  }
                  options={sessionTypeOptions}
                  selectedValues={formData.sessionType}
                  onSelectionChange={(values) => setFormData(prev => ({ ...prev, sessionType: values }))}
                />
              </HubForm.Field>

              <HubForm.Field label="Delivery Mode" required>
                <UnifiedMultiSelect
                  triggerLabel={
                    formData.deliveryMode.length > 0
                      ? `${formData.deliveryMode.length} selected`
                      : 'Select delivery modes'
                  }
                  options={deliveryModeOptions}
                  selectedValues={formData.deliveryMode}
                  onSelectionChange={(values) => setFormData(prev => ({ ...prev, deliveryMode: values }))}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Rates */}
            <HubForm.Grid>
              <HubForm.Field label="One-on-One Session Rate (1 hour session, 1 student)" required>
                <input
                  type="number"
                  value={formData.oneOnOneRate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, oneOnOneRate: parseFloat(e.target.value) || 0 }))}
                  placeholder="£50"
                  disabled={isLoading}
                  min="0"
                  step="1"
                />
              </HubForm.Field>

              <HubForm.Field label="Group Session Rate (1 hour session, 1 student)">
                <input
                  type="number"
                  value={formData.groupSessionRate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, groupSessionRate: parseFloat(e.target.value) || 0 }))}
                  placeholder="£25"
                  disabled={isLoading}
                  min="0"
                  step="1"
                />
              </HubForm.Field>
            </HubForm.Grid>
          </HubForm.Section>
        </HubForm.Root>
      </div>

      <WizardActionButtons
        onContinue={handleContinue}
        continueEnabled={isValid}
        onBack={onBack}
        isLoading={isLoading}
      />
    </div>
  );
};

export default TutorProfessionalDetailStep;
