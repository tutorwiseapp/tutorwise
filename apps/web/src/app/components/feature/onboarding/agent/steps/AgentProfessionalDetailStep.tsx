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

interface AgentProfessionalDetailStepProps {
  onNext: (details: ProfessionalDetailsData) => void;
  onBack?: () => void;
  isLoading: boolean;
  userRole?: 'tutor' | 'agent' | 'client';
  progressData?: ProgressData;
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

const AgentProfessionalDetailStep: React.FC<AgentProfessionalDetailStepProps> = ({
  onNext,
  onBack,
  isLoading,
  userRole = 'agent',
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
    { fieldName: 'bio', context: 'onboarding.agent', fallback: { label: 'About You', placeholder: 'Describe your tutoring or teaching style, strengths, and what areas you specialise in', helpText: 'characters minimum' } },
    { fieldName: 'bioVideoUrl', context: 'onboarding.agent', fallback: { label: '30-Second Intro Video (Optional)', placeholder: 'Paste YouTube, Loom, or Vimeo URL for +5 CaaS points' } },
    { fieldName: 'status', context: 'onboarding.agent', fallback: { label: 'Status', placeholder: 'Select status', options: statusOptions } },
    { fieldName: 'academicQualifications', context: 'onboarding.agent', fallback: { label: 'Academic Qualifications', placeholder: 'Select qualifications', options: academicQualificationsOptions } },
    { fieldName: 'teachingProfessionalQualifications', context: 'onboarding.agent', fallback: { label: 'Teaching Professional Qualifications', placeholder: 'Select qualifications', options: teachingProfessionalQualificationsOptions } },
    { fieldName: 'teachingExperience', context: 'onboarding.agent', fallback: { label: 'Teaching Experience', placeholder: 'Select experience', options: teachingExperienceOptions } },
    { fieldName: 'tutoringExperience', context: 'onboarding.agent', fallback: { label: 'Tutoring Experience', placeholder: 'Select experience', options: tutoringExperienceOptions } },
    { fieldName: 'keyStages', context: 'onboarding.agent', fallback: { label: 'Key Stages', placeholder: 'Select key stages', options: keyStagesOptions } },
    { fieldName: 'subjects', context: 'onboarding.agent', fallback: { label: 'Subjects', placeholder: 'Select subjects', options: subjectsOptions } },
    { fieldName: 'sessionType', context: 'onboarding.agent', fallback: { label: 'Session Type', placeholder: 'Select session types', options: sessionTypeOptions } },
    { fieldName: 'deliveryMode', context: 'onboarding.agent', fallback: { label: 'Delivery Mode', placeholder: 'Select delivery modes', options: deliveryModeOptions } },
    { fieldName: 'oneOnOneRate', context: 'onboarding.agent', fallback: { label: 'One-on-One Rate (£/hour)', placeholder: '£50' } },
    { fieldName: 'groupSessionRate', context: 'onboarding.agent', fallback: { label: 'Group Rate (£/hour per student)', placeholder: '£25' } },
  ]);

  // Restore saved onboarding progress on mount
  React.useEffect(() => {
    if (!isRestored && user?.id) {
      getOnboardingProgress('agent')
        .then(savedProgress => {
          const savedData = savedProgress?.progress?.agent?.professionalDetails;

          if (savedData) {
            console.log('[AgentProfessionalDetailStep] ✅ Restored saved progress:', savedData);
            setFormData(prev => ({ ...prev, ...savedData }));
          }

          setIsRestored(true);
        })
        .catch(error => {
          console.error('[AgentProfessionalDetailStep] Error loading saved progress:', error);
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
          agent: {
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
          agent: {
            professionalDetails: formData
          }
        }
      })
        .then(() => {
          console.log('[AgentProfessionalDetailStep] ✓ Blur save completed');
        })
        .catch((error) => {
          console.error('[AgentProfessionalDetailStep] ❌ Blur save failed:', error);
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
        agent: {
          professionalDetails: newData
        }
      }
    }).catch((error) => {
      console.error('[AgentProfessionalDetailStep] ❌ Select save failed:', error);
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

  // Validation - required fields
  const isValid =
    formData.bio.trim().length >= 50 &&
    formData.status !== '' &&
    formData.academicQualifications.length > 0 &&
    formData.teachingProfessionalQualifications.length > 0 &&
    formData.teachingExperience !== '' &&
    formData.tutoringExperience !== '' &&
    formData.keyStages.length > 0 &&
    formData.subjects.length > 0 &&
    formData.sessionType.length > 0 &&
    formData.deliveryMode.length > 0 &&
    formData.oneOnOneRate > 0;

  // Debug validation
  React.useEffect(() => {
    console.log('[AgentProfessionalDetailStep] Validation state:', {
      bio: formData.bio.trim().length,
      bioValid: formData.bio.trim().length >= 50,
      status: formData.status,
      statusValid: formData.status !== '',
      academicQualifications: formData.academicQualifications.length,
      academicValid: formData.academicQualifications.length > 0,
      teachingProfessionalQualifications: formData.teachingProfessionalQualifications.length,
      teachingProfQualValid: formData.teachingProfessionalQualifications.length > 0,
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

  const handleNext = () => {
    console.log('[AgentProfessionalDetailStep] handleNext called');
    console.log('[AgentProfessionalDetailStep] Form data:', formData);
    console.log('[AgentProfessionalDetailStep] isValid:', isValid);
    console.log('[AgentProfessionalDetailStep] Calling onNext...');

    // Page handles all database operations
    onNext(formData);

    console.log('[AgentProfessionalDetailStep] onNext called successfully');
  };

  // Get role display name
  const roleDisplayNames = {
    tutor: 'Tutor',
    agent: 'Agent',
    client: 'Client'
  };
  const roleDisplayName = roleDisplayNames[userRole] || 'Agent';

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <div>
          <h2 className={styles.stepTitle}>
            Professional Details
          </h2>
          <p className={styles.stepSubtitle}>
            {roleDisplayName} Onboarding • Tell us about your professional background and services
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

            {/* About & Status */}
            <HubForm.Grid columns={1}>
              <HubForm.Field label={configs.get('bio')?.label || 'About You'} required>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  onFocus={() => setEditingField('bio')}
                  onBlur={() => handleBlur('bio')}
                  placeholder={configs.get('bio')?.placeholder || 'Describe your tutoring or teaching style, strengths, and what areas you specialise in'}
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
                  placeholder={configs.get('bioVideoUrl')?.placeholder || 'Paste YouTube, Loom, or Vimeo URL for +5 CaaS points'}
                  disabled={isLoading || isSaving}
                />
              </HubForm.Field>

              <HubForm.Field label={configs.get('status')?.label || 'Status'} required>
                <UnifiedSelect
                  value={formData.status}
                  onChange={(value) => handleSelectChange('status', String(value))}
                  options={configs.get('status')?.options || statusOptions}
                  placeholder={configs.get('status')?.placeholder || 'Select status'}
                  disabled={isLoading || isSaving}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Education & Qualifications */}
            <HubForm.Grid>
              <HubForm.Field label={configs.get('academicQualifications')?.label || 'Academic Qualifications'} required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.academicQualifications, configs.get('academicQualifications')?.placeholder || 'Select qualifications')}
                  options={configs.get('academicQualifications')?.options || academicQualificationsOptions}
                  selectedValues={formData.academicQualifications}
                  onSelectionChange={(values) => handleSelectChange('academicQualifications', values)}
                />
              </HubForm.Field>

              <HubForm.Field label={configs.get('teachingProfessionalQualifications')?.label || 'Teaching Professional Qualifications'} required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.teachingProfessionalQualifications, configs.get('teachingProfessionalQualifications')?.placeholder || 'Select qualifications')}
                  options={configs.get('teachingProfessionalQualifications')?.options || teachingProfessionalQualificationsOptions}
                  selectedValues={formData.teachingProfessionalQualifications}
                  onSelectionChange={(values) => handleSelectChange('teachingProfessionalQualifications', values)}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Experience */}
            <HubForm.Grid>
              <HubForm.Field label={configs.get('teachingExperience')?.label || 'Teaching Experience'} required>
                <UnifiedSelect
                  value={formData.teachingExperience}
                  onChange={(value) => handleSelectChange('teachingExperience', String(value))}
                  options={configs.get('teachingExperience')?.options || teachingExperienceOptions}
                  placeholder={configs.get('teachingExperience')?.placeholder || 'Select experience'}
                  disabled={isLoading || isSaving}
                />
              </HubForm.Field>

              <HubForm.Field label={configs.get('tutoringExperience')?.label || 'Tutoring Experience'} required>
                <UnifiedSelect
                  value={formData.tutoringExperience}
                  onChange={(value) => handleSelectChange('tutoringExperience', String(value))}
                  options={configs.get('tutoringExperience')?.options || tutoringExperienceOptions}
                  placeholder={configs.get('tutoringExperience')?.placeholder || 'Select experience'}
                  disabled={isLoading || isSaving}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Subjects & Key Stages */}
            <HubForm.Grid>
              <HubForm.Field label={configs.get('keyStages')?.label || 'Key Stages'} required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.keyStages, configs.get('keyStages')?.placeholder || 'Select key stages')}
                  options={configs.get('keyStages')?.options || keyStagesOptions}
                  selectedValues={formData.keyStages}
                  onSelectionChange={(values) => handleSelectChange('keyStages', values)}
                />
              </HubForm.Field>

              <HubForm.Field label={configs.get('subjects')?.label || 'Subjects'} required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.subjects, configs.get('subjects')?.placeholder || 'Select subjects')}
                  options={configs.get('subjects')?.options || subjectsOptions}
                  selectedValues={formData.subjects}
                  onSelectionChange={(values) => handleSelectChange('subjects', values)}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Session Details */}
            <HubForm.Grid>
              <HubForm.Field label={configs.get('sessionType')?.label || 'Session Type'} required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.sessionType, configs.get('sessionType')?.placeholder || 'Select session types')}
                  options={configs.get('sessionType')?.options || sessionTypeOptions}
                  selectedValues={formData.sessionType}
                  onSelectionChange={(values) => handleSelectChange('sessionType', values)}
                />
              </HubForm.Field>

              <HubForm.Field label={configs.get('deliveryMode')?.label || 'Delivery Mode'} required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.deliveryMode, configs.get('deliveryMode')?.placeholder || 'Select delivery modes')}
                  options={configs.get('deliveryMode')?.options || deliveryModeOptions}
                  selectedValues={formData.deliveryMode}
                  onSelectionChange={(values) => handleSelectChange('deliveryMode', values)}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Rates */}
            <HubForm.Grid>
              <HubForm.Field label={configs.get('oneOnOneRate')?.label || 'One-on-One Rate (£/hour)'} required>
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

              <HubForm.Field label={configs.get('groupSessionRate')?.label || 'Group Rate (£/hour per student)'}>
                <input
                  type="number"
                  value={formData.groupSessionRate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, groupSessionRate: parseFloat(e.target.value) || 0 }))}
                  onFocus={() => setEditingField('groupSessionRate')}
                  onBlur={() => handleBlur('groupSessionRate')}
                  placeholder={configs.get('groupSessionRate')?.placeholder || '£25'}
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

export default AgentProfessionalDetailStep;
