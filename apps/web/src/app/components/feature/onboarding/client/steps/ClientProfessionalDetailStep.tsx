'use client';

import React, { useState } from 'react';
import styles from '../../OnboardingWizard.module.css';
import { WizardActionButtons } from '../../shared/WizardButton';
import { ProfessionalDetailsData } from '@/types';
import { HubForm } from '@/app/components/hub/form/HubForm';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
import InlineProgressBadge from '../../shared/InlineProgressBadge';
import { useFormConfigs } from '@/hooks/useFormConfig';

import { getOnboardingProgress, saveOnboardingProgress } from '@/lib/api/onboarding';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useOnboardingAutoSave } from '@/hooks/useAutoSave';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { hasUnsavedChanges as checkUnsavedChanges } from '@/lib/offlineQueue';

interface ProgressData {
  currentPoints: number;
  totalPoints: number;
  currentStepPoints: number;
  requiredPoints: number;
  steps: Array<{
    name: string;
    points: number;
    completed: boolean;
    current: boolean;
  }>;
}

interface ClientProfessionalDetailStepProps {
  onNext: (details: ProfessionalDetailsData) => void;
  onBack?: () => void;
  isLoading: boolean;
  userRole?: 'tutor' | 'agent' | 'client';
  progressData?: ProgressData;
}

// Who Needs Tutoring options
const whoNeedsTutoringOptions = [
  { value: 'Myself (Adult Learner)', label: 'Myself (Adult Learner)' },
  { value: 'My Child/Student (Primary)', label: 'My Child/Student (Primary)' },
  { value: 'My Child/Student (Secondary)', label: 'My Child/Student (Secondary)' },
  { value: 'My Child/Student (College/University)', label: 'My Child/Student (College/University)' },
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

// Preferred tutor experience level
const preferredTutorExperienceOptions = [
  { value: 'Any Experience Level', label: 'Any Experience Level' },
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

const ClientProfessionalDetailStep: React.FC<ClientProfessionalDetailStepProps> = ({
  onNext,
  onBack,
  isLoading,
  userRole = 'client',
  progressData
}) => {
  const { user } = useUserProfile();
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
  const [isRestored, setIsRestored] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch dynamic form configs (with fallback to hardcoded values)
  const { configs, isLoading: isLoadingConfigs } = useFormConfigs([
    { fieldName: 'bio', context: 'onboarding.client', fallback: { label: 'About Your Learning Needs', placeholder: 'Tell us about your learning needs or the learning needs of your child/student who needs tutoring...', helpText: 'characters minimum' } },
    { fieldName: 'bioVideoUrl', context: 'onboarding.client', fallback: { label: '30-Second Intro Video (Optional)', placeholder: 'Paste YouTube, Loom, or Vimeo URL (optional)' } },
    { fieldName: 'status', context: 'onboarding.client', fallback: { label: 'Who Needs Tutoring?', placeholder: 'Select who needs tutoring', options: whoNeedsTutoringOptions } },
    { fieldName: 'academicQualifications', context: 'onboarding.client', fallback: { label: 'Preferred Tutor Qualifications', placeholder: 'Select preferred qualifications (optional)', options: academicQualificationsOptions } },
    { fieldName: 'teachingProfessionalQualifications', context: 'onboarding.client', fallback: { label: 'Preferred Teaching Credentials', placeholder: 'Select preferred credentials (optional)', options: teachingProfessionalQualificationsOptions } },
    { fieldName: 'teachingExperience', context: 'onboarding.client', fallback: { label: 'Preferred Teaching Background', placeholder: 'Select preferred background (optional)', options: preferredTutorExperienceOptions } },
    { fieldName: 'tutoringExperience', context: 'onboarding.client', fallback: { label: 'Preferred Tutor Experience Level', placeholder: 'Select preferred experience level', options: tutoringExperienceOptions } },
    { fieldName: 'keyStages', context: 'onboarding.client', fallback: { label: 'Student\'s Education Level', placeholder: 'Select education level(s)', options: keyStagesOptions } },
    { fieldName: 'subjects', context: 'onboarding.client', fallback: { label: 'Subjects Needed', placeholder: 'Select subjects', options: subjectsOptions } },
    { fieldName: 'sessionType', context: 'onboarding.client', fallback: { label: 'Preferred Session Type', placeholder: 'Select preferred session types', options: sessionTypeOptions } },
    { fieldName: 'deliveryMode', context: 'onboarding.client', fallback: { label: 'Preferred Delivery Mode', placeholder: 'Select preferred delivery modes', options: deliveryModeOptions } },
    { fieldName: 'oneOnOneRate', context: 'onboarding.client', fallback: { label: 'Budget for One-on-One Sessions (per hour)', placeholder: '£50' } },
    { fieldName: 'groupSessionRate', context: 'onboarding.client', fallback: { label: 'Budget for Group Sessions (per hour)', placeholder: '£25 (skip if flexible)' } },
  ]);

  // Restore saved onboarding progress on mount
  React.useEffect(() => {
    if (!isRestored && user?.id) {
      getOnboardingProgress(userRole)
        .then(savedProgress => {
          const savedData = savedProgress?.progress?.[userRole]?.professionalDetails;

          if (savedData) {
            console.log('[ClientProfessionalDetailStep] ✅ Restored saved progress:', savedData);
            setFormData(prev => ({ ...prev, ...savedData }));
          }

          setIsRestored(true);
        })
        .catch(error => {
          console.error('[ClientProfessionalDetailStep] Error loading saved progress:', error);
          setIsRestored(true);
        });
    }
  }, [user?.id, isRestored]);

  // Offline sync - auto-sync when connection restored
  useOfflineSync(user?.id);

  // Auto-save with 3-second debounce (runs in background, doesn't block Next button)
  const { saveStatus } = useOnboardingAutoSave(
    formData,
    async (data) => {
      if (!user?.id) throw new Error('User not authenticated');

      await saveOnboardingProgress({
        userId: user.id,
        progress: {
          client: {
            professionalDetails: data
          }
        }
      });
    },
    {
      enabled: isRestored && !isLoading,
    }
  );

  // onBlur save handler (150ms delay like ProfessionalInfoForm)
  const handleBlur = React.useCallback((fieldName: string) => {
    if (!fieldName || isSaving || !user?.id) return;

    setTimeout(() => {
      if (editingField !== fieldName) return;

      setIsSaving(true);
      saveOnboardingProgress({
        userId: user.id,
        progress: {
          client: {
            professionalDetails: formData
          }
        }
      })
        .then(() => {
          console.log('[ClientProfessionalDetailStep] ✓ Blur save completed');
        })
        .catch((error) => {
          console.error('[ClientProfessionalDetailStep] ❌ Blur save failed:', error);
        })
        .finally(() => {
          setIsSaving(false);
          setEditingField(null);
        });
    }, 150);
  }, [editingField, isSaving, user?.id, formData]);

  // Immediate save for selects/multiselects
  const handleSelectChange = React.useCallback((field: string, value: string | string[] | number) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    if (!user?.id) return;

    // Immediate save for select changes
    saveOnboardingProgress({
      userId: user.id,
      progress: {
        client: {
          professionalDetails: newData
        }
      }
    }).catch((error) => {
      console.error('[ClientProfessionalDetailStep] ❌ Select save failed:', error);
    });
  }, [formData, user?.id]);

  // beforeunload warning (internal only - no popup, just prevents accidental close)
  React.useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      const hasUnsaved = await checkUnsavedChanges();
      if (saveStatus === 'saving' || isSaving || hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus, isSaving]);

  // Validation - required fields (client-specific: optional qualifications, credentials, and background)
  const isValid =
    formData.bio.trim().length >= 50 &&
    formData.status !== '' &&
    // academicQualifications is optional for clients
    // teachingProfessionalQualifications is optional for clients
    // teachingExperience is optional for clients
    formData.tutoringExperience !== '' &&
    formData.keyStages.length > 0 &&
    formData.subjects.length > 0 &&
    formData.sessionType.length > 0 &&
    formData.deliveryMode.length > 0 &&
    formData.oneOnOneRate > 0;

  // Debug validation
  React.useEffect(() => {
    console.log('[ClientProfessionalDetailStep] Validation state:', {
      bio: formData.bio.trim().length,
      bioValid: formData.bio.trim().length >= 50,
      whoNeedsTutoring: formData.status,
      whoNeedsTutoringValid: formData.status !== '',
      preferredQualifications: formData.academicQualifications.length,
      preferredQualificationsOptional: true,
      preferredCredentials: formData.teachingProfessionalQualifications.length,
      preferredCredentialsOptional: true,
      preferredBackground: formData.teachingExperience,
      preferredBackgroundOptional: true,
      preferredExperienceLevel: formData.tutoringExperience,
      preferredExperienceLevelValid: formData.tutoringExperience !== '',
      educationLevel: formData.keyStages.length,
      educationLevelValid: formData.keyStages.length > 0,
      subjectsNeeded: formData.subjects.length,
      subjectsNeededValid: formData.subjects.length > 0,
      preferredSessionType: formData.sessionType.length,
      preferredSessionTypeValid: formData.sessionType.length > 0,
      preferredDeliveryMode: formData.deliveryMode.length,
      preferredDeliveryModeValid: formData.deliveryMode.length > 0,
      budgetOneOnOne: formData.oneOnOneRate,
      budgetOneOnOneValid: formData.oneOnOneRate > 0,
      budgetGroup: formData.groupSessionRate,
      budgetGroupOptional: true,
      isValid
    });
  }, [formData, isValid]);

  const handleNext = () => {
    console.log('[ClientProfessionalDetailStep] handleNext called');
    console.log('[ClientProfessionalDetailStep] Form data:', formData);
    console.log('[ClientProfessionalDetailStep] isValid:', isValid);
    console.log('[ClientProfessionalDetailStep] Calling onNext...');

    // Page handles all database operations
    onNext(formData);

    console.log('[ClientProfessionalDetailStep] onNext called successfully');
  };


  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <div>
          <h2 className={styles.stepTitle}>
            Professional Details
          </h2>
          <p className={styles.stepSubtitle}>
            Client Onboarding • Tell us what you&apos;re looking for in a tutor
          </p>
        </div>
      </div>

      <div className={styles.stepBody}>
        <HubForm.Root>
          <HubForm.Section>
            {/* Progress Badge - Top Right Corner of Form */}
            {progressData && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: '24px',
                  marginTop: '-8px',
                }}
              >
                <InlineProgressBadge
                  currentPoints={progressData.currentPoints}
                  totalPoints={progressData.totalPoints}
                  currentStepPoints={progressData.currentStepPoints}
                  requiredPoints={progressData.requiredPoints}
                  steps={progressData.steps}
                />
              </div>
            )}

            {/* Auto-save Indicator */}

            {/* About Learning Needs & Who Needs Tutoring */}
            <HubForm.Grid columns={1}>
              <HubForm.Field label={configs.get('bio')?.label || 'About Your Learning Needs'} required>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  onFocus={() => setEditingField('bio')}
                  onBlur={() => handleBlur('bio')}
                  placeholder={configs.get('bio')?.placeholder || 'Tell us about your learning needs or the learning needs of your child/student who needs tutoring...'}
                  rows={4}
                  disabled={isLoading || isSaving}
                />
                <span style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px', display: 'block' }}>
                  {formData.bio.length}/50 {configs.get('bio')?.helpText || 'characters minimum'}
                </span>
              </HubForm.Field>
            </HubForm.Grid>

            <HubForm.Grid>
              <HubForm.Field label={configs.get('bioVideoUrl')?.label || '30-Second Intro Video (Optional)'}>
                <input
                  type="url"
                  value={formData.bioVideoUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, bioVideoUrl: e.target.value }))}
                  onFocus={() => setEditingField('bioVideoUrl')}
                  onBlur={() => handleBlur('bioVideoUrl')}
                  placeholder={configs.get('bioVideoUrl')?.placeholder || 'Paste YouTube, Loom, or Vimeo URL (optional)'}
                  disabled={isLoading || isSaving}
                />
              </HubForm.Field>

              <HubForm.Field label={configs.get('status')?.label || 'Who Needs Tutoring?'} required>
                <UnifiedSelect
                  value={formData.status}
                  onChange={(value) => handleSelectChange('status', String(value))}
                  options={configs.get('status')?.options || whoNeedsTutoringOptions}
                  placeholder={configs.get('status')?.placeholder || 'Select who needs tutoring'}
                  disabled={isLoading || isSaving}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Preferred Tutor Qualifications & Credentials */}
            <HubForm.Grid>
              <HubForm.Field label={configs.get('academicQualifications')?.label || 'Preferred Tutor Qualifications'}>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.academicQualifications, configs.get('academicQualifications')?.placeholder || 'Select preferred qualifications (optional)')}
                  options={configs.get('academicQualifications')?.options || academicQualificationsOptions}
                  selectedValues={formData.academicQualifications}
                  onSelectionChange={(values) => handleSelectChange('academicQualifications', values)}
                />
              </HubForm.Field>

              <HubForm.Field label={configs.get('teachingProfessionalQualifications')?.label || 'Preferred Teaching Credentials'}>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.teachingProfessionalQualifications, configs.get('teachingProfessionalQualifications')?.placeholder || 'Select preferred credentials (optional)')}
                  options={configs.get('teachingProfessionalQualifications')?.options || teachingProfessionalQualificationsOptions}
                  selectedValues={formData.teachingProfessionalQualifications}
                  onSelectionChange={(values) => handleSelectChange('teachingProfessionalQualifications', values)}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Preferred Teaching Background & Experience */}
            <HubForm.Grid>
              <HubForm.Field label={configs.get('teachingExperience')?.label || 'Preferred Teaching Background'}>
                <UnifiedSelect
                  value={formData.teachingExperience}
                  onChange={(value) => handleSelectChange('teachingExperience', String(value))}
                  options={configs.get('teachingExperience')?.options || preferredTutorExperienceOptions}
                  placeholder={configs.get('teachingExperience')?.placeholder || 'Select preferred background (optional)'}
                  disabled={isLoading || isSaving}
                />
              </HubForm.Field>

              <HubForm.Field label={configs.get('tutoringExperience')?.label || 'Preferred Tutor Experience Level'} required>
                <UnifiedSelect
                  value={formData.tutoringExperience}
                  onChange={(value) => handleSelectChange('tutoringExperience', String(value))}
                  options={configs.get('tutoringExperience')?.options || tutoringExperienceOptions}
                  placeholder={configs.get('tutoringExperience')?.placeholder || 'Select preferred experience level'}
                  disabled={isLoading || isSaving}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Student's Education Level & Subjects Needed */}
            <HubForm.Grid>
              <HubForm.Field label={configs.get('keyStages')?.label || 'Student\'s Education Level'} required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.keyStages, configs.get('keyStages')?.placeholder || 'Select education level(s)')}
                  options={configs.get('keyStages')?.options || keyStagesOptions}
                  selectedValues={formData.keyStages}
                  onSelectionChange={(values) => handleSelectChange('keyStages', values)}
                />
              </HubForm.Field>

              <HubForm.Field label={configs.get('subjects')?.label || 'Subjects Needed'} required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.subjects, configs.get('subjects')?.placeholder || 'Select subjects')}
                  options={configs.get('subjects')?.options || subjectsOptions}
                  selectedValues={formData.subjects}
                  onSelectionChange={(values) => handleSelectChange('subjects', values)}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Preferred Session Details */}
            <HubForm.Grid>
              <HubForm.Field label={configs.get('sessionType')?.label || 'Preferred Session Type'} required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.sessionType, configs.get('sessionType')?.placeholder || 'Select preferred session types')}
                  options={configs.get('sessionType')?.options || sessionTypeOptions}
                  selectedValues={formData.sessionType}
                  onSelectionChange={(values) => handleSelectChange('sessionType', values)}
                />
              </HubForm.Field>

              <HubForm.Field label={configs.get('deliveryMode')?.label || 'Preferred Delivery Mode'} required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.deliveryMode, configs.get('deliveryMode')?.placeholder || 'Select preferred delivery modes')}
                  options={configs.get('deliveryMode')?.options || deliveryModeOptions}
                  selectedValues={formData.deliveryMode}
                  onSelectionChange={(values) => handleSelectChange('deliveryMode', values)}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Budget */}
            <HubForm.Grid>
              <HubForm.Field label={configs.get('oneOnOneRate')?.label || 'Budget for One-on-One Sessions (per hour)'} required>
                <input
                  type="number"
                  value={formData.oneOnOneRate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, oneOnOneRate: parseFloat(e.target.value) || 0 }))}
                  onFocus={() => setEditingField('oneOnOneRate')}
                  onBlur={() => handleBlur('oneOnOneRate')}
                  placeholder={configs.get('oneOnOneRate')?.placeholder || '£50'}
                  disabled={isLoading || isSaving}
                  min="0"
                  step="1"
                />
              </HubForm.Field>

              <HubForm.Field label={configs.get('groupSessionRate')?.label || 'Budget for Group Sessions (per hour)'}>
                <input
                  type="number"
                  value={formData.groupSessionRate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, groupSessionRate: parseFloat(e.target.value) || 0 }))}
                  onFocus={() => setEditingField('groupSessionRate')}
                  onBlur={() => handleBlur('groupSessionRate')}
                  placeholder={configs.get('groupSessionRate')?.placeholder || '£25 (skip if flexible)'}
                  disabled={isLoading || isSaving}
                  min="0"
                  step="1"
                />
              </HubForm.Field>
            </HubForm.Grid>
          </HubForm.Section>
        </HubForm.Root>
      </div>

      <WizardActionButtons
        onNext={handleNext}
        nextEnabled={isValid}
        onBack={onBack}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ClientProfessionalDetailStep;
