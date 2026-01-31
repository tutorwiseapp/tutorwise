'use client';

/**
 * Shared Professional Detail Step Component
 *
 * A unified component for tutor, agent, and client professional details.
 * Uses role-specific configuration to customize labels, options, and fields.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styles from '../../OnboardingWizard.module.css';
import { WizardActionButtons } from '../WizardButton';
import { ProfessionalDetailsData } from '@/types';
import { HubForm } from '@/app/components/hub/form/HubForm';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
import InlineProgressBadge from '../InlineProgressBadge';
import { useFormConfigs } from '@/hooks/useFormConfig';
import { getOnboardingProgress, saveOnboardingProgress } from '@/lib/api/onboarding';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useOnboardingAutoSave } from '@/hooks/useAutoSave';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { hasUnsavedChanges as checkUnsavedChanges } from '@/lib/offlineQueue';
import { getConfigForRole, ProfessionalDetailConfig, OnboardingRole } from '../configs';

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

interface ProfessionalDetailStepProps {
  role: OnboardingRole;
  onNext: (details: ProfessionalDetailsData) => void;
  onBack?: () => void;
  isLoading: boolean;
  progressData?: ProgressData;
  /** Optional config override - if not provided, uses getConfigForRole(role) */
  config?: ProfessionalDetailConfig;
}

const ProfessionalDetailStep: React.FC<ProfessionalDetailStepProps> = ({
  role,
  onNext,
  onBack,
  isLoading,
  progressData,
  config: configOverride,
}) => {
  const { user } = useUserProfile();
  const config = configOverride || getConfigForRole(role);

  const [formData, setFormData] = useState<ProfessionalDetailsData>({
    bio: '',
    bioVideoUrl: '',
    status: '',
    academicQualifications: [],
    teachingProfessionalQualifications: [],
    teachingExperience: '',
    tutoringExperience: '',
    keyStages: [],
    levels: [],
    subjects: [],
    sessionType: [],
    deliveryMode: [],
    oneToOneSessionRate: 0,
    groupSessionRate: 0,
  });
  const [isRestored, setIsRestored] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Build form config requests from role config
  const formConfigRequests = Object.entries(config.fields).map(([fieldName, fieldConfig]) => ({
    fieldName,
    context: config.formContext,
    fallback: {
      label: fieldConfig.label,
      placeholder: fieldConfig.placeholder,
      helpText: fieldConfig.helpText,
      options: fieldConfig.options,
    },
  }));

  const { configs, isLoading: isLoadingConfigs } = useFormConfigs(formConfigRequests);

  // Restore saved onboarding progress on mount
  useEffect(() => {
    if (!isRestored && user?.id) {
      getOnboardingProgress(role)
        .then(savedProgress => {
          const savedData = savedProgress?.progress?.[role]?.professionalDetails;

          if (savedData) {
            console.log(`[ProfessionalDetailStep:${role}] ✅ Restored saved progress:`, savedData);
            setFormData(prev => ({ ...prev, ...savedData }));
          }

          setIsRestored(true);
        })
        .catch(error => {
          console.error(`[ProfessionalDetailStep:${role}] Error loading saved progress:`, error);
          setIsRestored(true);
        });
    }
  }, [user?.id, isRestored, role]);

  // Offline sync - auto-sync when connection restored
  useOfflineSync(user?.id);

  // Auto-save with 3-second debounce
  const { saveStatus } = useOnboardingAutoSave(
    formData,
    async (data) => {
      if (!user?.id) throw new Error('User not authenticated');

      await saveOnboardingProgress({
        userId: user.id,
        progress: {
          [role]: {
            professionalDetails: data
          }
        }
      });
    },
    {
      enabled: isRestored && !isLoading,
    }
  );

  // onBlur save handler (150ms delay)
  const handleBlur = useCallback((fieldName: string) => {
    if (!fieldName || isSaving || !user?.id) return;

    setTimeout(() => {
      if (editingField !== fieldName) return;

      setIsSaving(true);
      saveOnboardingProgress({
        userId: user.id,
        progress: {
          [role]: {
            professionalDetails: formData
          }
        }
      })
        .then(() => {
          console.log(`[ProfessionalDetailStep:${role}] ✓ Blur save completed`);
        })
        .catch((error) => {
          console.error(`[ProfessionalDetailStep:${role}] ❌ Blur save failed:`, error);
        })
        .finally(() => {
          setIsSaving(false);
          setEditingField(null);
        });
    }, 150);
  }, [editingField, isSaving, user?.id, formData, role]);

  // Immediate save for selects/multiselects
  const handleSelectChange = useCallback((field: string, value: string | string[] | number) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    if (!user?.id) return;

    saveOnboardingProgress({
      userId: user.id,
      progress: {
        [role]: {
          professionalDetails: newData
        }
      }
    }).catch((error) => {
      console.error(`[ProfessionalDetailStep:${role}] ❌ Select save failed:`, error);
    });
  }, [formData, user?.id, role]);

  // beforeunload warning
  useEffect(() => {
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

  // Validation - based on config
  const isValid =
    formData.bio.trim().length >= config.validation.bioMinLength &&
    formData.status !== '' &&
    formData.academicQualifications.length > 0 &&
    formData.teachingProfessionalQualifications.length > 0 &&
    formData.teachingExperience !== '' &&
    formData.tutoringExperience !== '' &&
    formData.keyStages.length > 0 &&
    formData.subjects.length > 0 &&
    formData.sessionType.length > 0 &&
    formData.deliveryMode.length > 0 &&
    formData.oneToOneSessionRate > 0 &&
    (!config.validation.requireGroupRate || formData.groupSessionRate > 0);

  const handleNext = () => {
    console.log(`[ProfessionalDetailStep:${role}] handleNext called`);
    console.log(`[ProfessionalDetailStep:${role}] Form data:`, formData);
    onNext(formData);
  };

  // Helper to get field config with fallback
  const getFieldConfig = (fieldName: string) => {
    const dynamicConfig = configs.get(fieldName);
    const staticConfig = config.fields[fieldName as keyof typeof config.fields];
    return {
      label: dynamicConfig?.label || staticConfig?.label || fieldName,
      placeholder: dynamicConfig?.placeholder || staticConfig?.placeholder || '',
      helpText: dynamicConfig?.helpText || staticConfig?.helpText,
      options: dynamicConfig?.options || staticConfig?.options || [],
      required: staticConfig?.required ?? false,
      hidden: staticConfig?.hidden ?? false,
    };
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <div>
          <h2 className={styles.stepTitle}>{config.title}</h2>
          <p className={styles.stepSubtitle}>{config.subtitle}</p>
        </div>
      </div>

      <div className={styles.stepBody}>
        <HubForm.Root>
          <HubForm.Section>
            {/* Progress Badge */}
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

            {/* About & Status */}
            <HubForm.Grid columns={1}>
              <HubForm.Field label={getFieldConfig('bio').label} required={getFieldConfig('bio').required}>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  onFocus={() => setEditingField('bio')}
                  onBlur={() => handleBlur('bio')}
                  placeholder={getFieldConfig('bio').placeholder}
                  rows={4}
                  disabled={isLoading || isSaving}
                />
                <span style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px', display: 'block' }}>
                  {formData.bio.length}/{config.validation.bioMinLength} {getFieldConfig('bio').helpText}
                </span>
              </HubForm.Field>
            </HubForm.Grid>

            <HubForm.Grid>
              <HubForm.Field label={getFieldConfig('bioVideoUrl').label}>
                <input
                  type="url"
                  value={formData.bioVideoUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, bioVideoUrl: e.target.value }))}
                  onFocus={() => setEditingField('bioVideoUrl')}
                  onBlur={() => handleBlur('bioVideoUrl')}
                  placeholder={getFieldConfig('bioVideoUrl').placeholder}
                  disabled={isLoading || isSaving}
                />
              </HubForm.Field>

              <HubForm.Field label={getFieldConfig('status').label} required={getFieldConfig('status').required}>
                <UnifiedSelect
                  value={formData.status}
                  onChange={(value) => handleSelectChange('status', String(value))}
                  options={getFieldConfig('status').options}
                  placeholder={getFieldConfig('status').placeholder}
                  disabled={isLoading || isSaving}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Education & Qualifications */}
            <HubForm.Grid>
              <HubForm.Field label={getFieldConfig('academicQualifications').label} required={getFieldConfig('academicQualifications').required}>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.academicQualifications, getFieldConfig('academicQualifications').placeholder)}
                  options={getFieldConfig('academicQualifications').options}
                  selectedValues={formData.academicQualifications}
                  onSelectionChange={(values) => handleSelectChange('academicQualifications', values)}
                />
              </HubForm.Field>

              <HubForm.Field label={getFieldConfig('teachingProfessionalQualifications').label} required={getFieldConfig('teachingProfessionalQualifications').required}>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.teachingProfessionalQualifications, getFieldConfig('teachingProfessionalQualifications').placeholder)}
                  options={getFieldConfig('teachingProfessionalQualifications').options}
                  selectedValues={formData.teachingProfessionalQualifications}
                  onSelectionChange={(values) => handleSelectChange('teachingProfessionalQualifications', values)}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Experience */}
            <HubForm.Grid>
              <HubForm.Field label={getFieldConfig('teachingExperience').label} required={getFieldConfig('teachingExperience').required}>
                <UnifiedSelect
                  value={formData.teachingExperience}
                  onChange={(value) => handleSelectChange('teachingExperience', String(value))}
                  options={getFieldConfig('teachingExperience').options}
                  placeholder={getFieldConfig('teachingExperience').placeholder}
                  disabled={isLoading || isSaving}
                />
              </HubForm.Field>

              <HubForm.Field label={getFieldConfig('tutoringExperience').label} required={getFieldConfig('tutoringExperience').required}>
                <UnifiedSelect
                  value={formData.tutoringExperience}
                  onChange={(value) => handleSelectChange('tutoringExperience', String(value))}
                  options={getFieldConfig('tutoringExperience').options}
                  placeholder={getFieldConfig('tutoringExperience').placeholder}
                  disabled={isLoading || isSaving}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Subjects & Key Stages */}
            <HubForm.Grid>
              <HubForm.Field label={getFieldConfig('keyStages').label} required={getFieldConfig('keyStages').required}>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.keyStages, getFieldConfig('keyStages').placeholder)}
                  options={getFieldConfig('keyStages').options}
                  selectedValues={formData.keyStages}
                  onSelectionChange={(values) => handleSelectChange('keyStages', values)}
                />
              </HubForm.Field>

              <HubForm.Field label={getFieldConfig('subjects').label} required={getFieldConfig('subjects').required}>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.subjects, getFieldConfig('subjects').placeholder)}
                  options={getFieldConfig('subjects').options}
                  selectedValues={formData.subjects}
                  onSelectionChange={(values) => handleSelectChange('subjects', values)}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Levels - Only shown for client */}
            {config.fields.levels && !config.fields.levels.hidden && (
              <HubForm.Grid>
                <HubForm.Field label={getFieldConfig('levels').label} required={getFieldConfig('levels').required}>
                  <UnifiedMultiSelect
                    triggerLabel={formatMultiSelectLabel(formData.levels || [], getFieldConfig('levels').placeholder)}
                    options={getFieldConfig('levels').options}
                    selectedValues={formData.levels || []}
                    onSelectionChange={(values) => handleSelectChange('levels', values)}
                  />
                </HubForm.Field>
              </HubForm.Grid>
            )}

            {/* Session Details */}
            <HubForm.Grid>
              <HubForm.Field label={getFieldConfig('sessionType').label} required={getFieldConfig('sessionType').required}>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.sessionType, getFieldConfig('sessionType').placeholder)}
                  options={getFieldConfig('sessionType').options}
                  selectedValues={formData.sessionType}
                  onSelectionChange={(values) => handleSelectChange('sessionType', values)}
                />
              </HubForm.Field>

              <HubForm.Field label={getFieldConfig('deliveryMode').label} required={getFieldConfig('deliveryMode').required}>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(formData.deliveryMode, getFieldConfig('deliveryMode').placeholder)}
                  options={getFieldConfig('deliveryMode').options}
                  selectedValues={formData.deliveryMode}
                  onSelectionChange={(values) => handleSelectChange('deliveryMode', values)}
                />
              </HubForm.Field>
            </HubForm.Grid>

            {/* Rates */}
            <HubForm.Grid>
              <HubForm.Field label={getFieldConfig('oneToOneSessionRate').label} required={getFieldConfig('oneToOneSessionRate').required}>
                <input
                  type="number"
                  value={formData.oneToOneSessionRate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, oneToOneSessionRate: parseFloat(e.target.value) || 0 }))}
                  onFocus={() => setEditingField('oneToOneSessionRate')}
                  onBlur={() => handleBlur('oneToOneSessionRate')}
                  placeholder={getFieldConfig('oneToOneSessionRate').placeholder}
                  disabled={isLoading || isSaving}
                  min="0"
                  step="1"
                />
              </HubForm.Field>

              <HubForm.Field label={getFieldConfig('groupSessionRate').label}>
                <input
                  type="number"
                  value={formData.groupSessionRate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, groupSessionRate: parseFloat(e.target.value) || 0 }))}
                  onFocus={() => setEditingField('groupSessionRate')}
                  onBlur={() => handleBlur('groupSessionRate')}
                  placeholder={getFieldConfig('groupSessionRate').placeholder}
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

export default ProfessionalDetailStep;
