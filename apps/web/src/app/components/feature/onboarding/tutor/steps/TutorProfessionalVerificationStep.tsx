'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import { HubForm } from '@/app/components/hub/form/HubForm';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import InlineProgressBadge from '../shared/InlineProgressBadge';
import { saveOnboardingProgress, getOnboardingProgress } from '@/lib/api/onboarding';
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

interface TutorProfessionalVerificationStepProps {
  onNext: (details: VerificationDetailsData) => void;
  onBack?: () => void;
  isLoading: boolean;
  profileId?: string;
  progressData?: ProgressData;
}

export interface VerificationDetailsData {
  // Proof of Address (all optional for faster onboarding)
  proof_of_address_url?: string;
  proof_of_address_type?: string;
  address_document_issue_date?: string;

  // Government ID (all optional for faster onboarding)
  identity_verification_document_url?: string;
  identity_document_number?: string;
  identity_issue_date?: string;
  identity_expiry_date?: string;

  // DBS Certificate (all optional for faster onboarding)
  dbs_certificate_url?: string;
  dbs_certificate_number?: string;
  dbs_certificate_date?: string;
  dbs_expiry_date?: string;
}

const TutorProfessionalVerificationStep: React.FC<TutorProfessionalVerificationStepProps> = ({
  onNext,
  onBack,
  isLoading,
  profileId,
  progressData
}) => {
  const { user } = useUserProfile();
  const [formData, setFormData] = useState<VerificationDetailsData>({
    proof_of_address_type: '',
    address_document_issue_date: '',
    identity_document_number: '',
    identity_issue_date: '',
    identity_expiry_date: '',
    dbs_certificate_number: '',
    dbs_certificate_date: '',
    dbs_expiry_date: '',
  });

  // Document upload states
  const [uploadedFiles, setUploadedFiles] = useState<{
    address?: string;
    identity?: string;
    dbs?: string;
  }>({});
  const [isRestored, setIsRestored] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Combine form data and uploaded files for saving
  const combinedData = { ...formData, ...uploadedFiles };

  // Offline sync - auto-sync when connection restored
  useOfflineSync(user?.id);

  // Restore saved onboarding progress on mount
  React.useEffect(() => {
    if (!isRestored && user?.id) {
      getOnboardingProgress('tutor')
        .then(savedProgress => {
          const savedData = savedProgress?.progress?.tutor?.verification;

          if (savedData) {
            console.log('[TutorProfessionalVerificationStep] ✅ Restored saved progress:', savedData);

            // Restore form fields
            const {
              proof_of_address_url,
              identity_verification_document_url,
              dbs_certificate_url,
              ...formFields
            } = savedData;

            setFormData(prev => ({ ...prev, ...formFields }));

            // Restore uploaded file URLs
            setUploadedFiles({
              address: proof_of_address_url,
              identity: identity_verification_document_url,
              dbs: dbs_certificate_url,
            });
          }

          setIsRestored(true);
        })
        .catch(error => {
          console.error('[TutorProfessionalVerificationStep] Error loading saved progress:', error);
          setIsRestored(true);
        });
    }
  }, [user?.id, isRestored]);

  // Auto-save with 3-second debounce (runs in background, doesn't block Next button)
  const { saveStatus } = useOnboardingAutoSave(
    combinedData,
    async (data) => {
      if (!user?.id) throw new Error('User not authenticated');

      await saveOnboardingProgress({
        userId: user.id,
        progress: {
          tutor: {
            verification: data
          }
        }
      });
    },
    {
      enabled: isRestored && !isLoading,
    }
  );

  // onBlur save handler (150ms delay - matches ProfessionalInfoForm pattern)
  const handleBlur = React.useCallback((fieldName: string) => {
    if (!fieldName || isSaving || !user?.id) return;

    setTimeout(() => {
      if (editingField !== fieldName) return;

      console.log(`[TutorProfessionalVerificationStep] onBlur save for: ${fieldName}`);
      setIsSaving(true);

      saveOnboardingProgress({
        userId: user.id,
        progress: {
          tutor: {
            verification: combinedData
          }
        }
      })
        .then(() => console.log('[TutorProfessionalVerificationStep] ✓ Blur save completed'))
        .catch((error) => console.error('[TutorProfessionalVerificationStep] ❌ Blur save failed:', error))
        .finally(() => {
          setIsSaving(false);
          setEditingField(null);
        });
    }, 150);
  }, [editingField, isSaving, user?.id, combinedData]);

  // Immediate save for select and date picker changes
  const handleSelectChange = React.useCallback((field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    if (!user?.id) return;

    console.log(`[TutorProfessionalVerificationStep] Immediate save for select: ${field}`);
    const newCombinedData = { ...newFormData, ...uploadedFiles };
    saveOnboardingProgress({
      userId: user.id,
      progress: {
        tutor: {
          verification: newCombinedData
        }
      }
    })
      .then(() => console.log('[TutorProfessionalVerificationStep] ✓ Select save completed'))
      .catch((error) => console.error('[TutorProfessionalVerificationStep] ❌ Select save failed:', error));
  }, [formData, uploadedFiles, user?.id]);

  const handleDateChange = React.useCallback((field: string, dateStr: string) => {
    const newFormData = { ...formData, [field]: dateStr };
    setFormData(newFormData);

    if (!user?.id) return;

    console.log(`[TutorProfessionalVerificationStep] Immediate save for date: ${field}`);
    const newCombinedData = { ...newFormData, ...uploadedFiles };
    saveOnboardingProgress({
      userId: user.id,
      progress: {
        tutor: {
          verification: newCombinedData
        }
      }
    })
      .then(() => console.log('[TutorProfessionalVerificationStep] ✓ Date save completed'))
      .catch((error) => console.error('[TutorProfessionalVerificationStep] ❌ Date save failed:', error));
  }, [formData, uploadedFiles, user?.id]);

  // beforeunload warning - prevent accidental close with unsaved changes
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

  // No validation - all fields are optional for faster onboarding
  const isValid = true;

  const handleNext = () => {
    console.log('[TutorProfessionalVerificationStep] handleNext called');

    const dataToSave = {
      ...formData,
      proof_of_address_url: uploadedFiles.address,
      identity_verification_document_url: uploadedFiles.identity,
      dbs_certificate_url: uploadedFiles.dbs,
    };

    console.log('[TutorProfessionalVerificationStep] Calling onNext...');
    // Page handles all database operations
    onNext(dataToSave);
    console.log('[TutorProfessionalVerificationStep] onNext called successfully');
  };


  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          Trust and Verification
        </h2>
        <p className={styles.stepSubtitle}>
          Tutor Onboarding • Upload your verification documents
        </p>
      </div>

      <div className={styles.stepBody}>
        <HubForm.Root>
          <HubForm.Section>
            {/* Progress Badge - Top Right Corner of Form */}
            {progressData && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '24px',
                marginTop: '-8px'
              }}>
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
            {/* 1. Proof of Address */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Proof of Address
              </h4>
              <HubForm.Grid>
                <DocumentUploadField
                  label="Address Document"
                  documentType="address"
                  profileId={profileId}
                  onUploadSuccess={(url) => {
                    setUploadedFiles(prev => ({ ...prev, address: url }));
                  }}
                  disabled={isLoading}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <HubForm.Field label="Document Type">
                    <UnifiedSelect
                      value={formData.proof_of_address_type}
                      onChange={(value) => handleSelectChange('proof_of_address_type', String(value))}
                      options={[
                        { value: 'Utility Bill', label: 'Utility Bill' },
                        { value: 'Bank Statement', label: 'Bank Statement' },
                        { value: 'Tax Bill', label: 'Tax Bill' },
                        { value: 'Solicitor Letter', label: 'Solicitor Letter' },
                      ]}
                      placeholder="Select document type"
                      disabled={isLoading || isSaving}
                    />
                  </HubForm.Field>
                  <HubForm.Field label="Issue Date">
                    <DatePicker
                      selected={formData.address_document_issue_date ? new Date(formData.address_document_issue_date) : undefined}
                      onSelect={(date) => {
                        handleDateChange('address_document_issue_date', date ? date.toISOString().split('T')[0] : '');
                      }}
                      placeholder="Select issue date"
                    />
                  </HubForm.Field>
                </div>
              </HubForm.Grid>
            </div>

            {/* 2. Government ID */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Government ID (Passport or Driving License)
              </h4>
              <HubForm.Grid>
                <DocumentUploadField
                  label="ID Document"
                  documentType="identity"
                  profileId={profileId}
                  onUploadSuccess={(url) => {
                    setUploadedFiles(prev => ({ ...prev, identity: url }));
                  }}
                  disabled={isLoading}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <HubForm.Field label="Document Number">
                    <input
                      type="text"
                      value={formData.identity_document_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, identity_document_number: e.target.value }))}
                      onFocus={() => setEditingField('identity_document_number')}
                      onBlur={() => handleBlur('identity_document_number')}
                      placeholder="Enter passport or license number"
                      disabled={isLoading || isSaving}
                    />
                  </HubForm.Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <HubForm.Field label="Issue Date">
                      <DatePicker
                        selected={formData.identity_issue_date ? new Date(formData.identity_issue_date) : undefined}
                        onSelect={(date) => {
                          handleDateChange('identity_issue_date', date ? date.toISOString().split('T')[0] : '');
                        }}
                        placeholder="Select issue date"
                      />
                    </HubForm.Field>
                    <HubForm.Field label="Expiry Date">
                      <DatePicker
                        selected={formData.identity_expiry_date ? new Date(formData.identity_expiry_date) : undefined}
                        onSelect={(date) => {
                          handleDateChange('identity_expiry_date', date ? date.toISOString().split('T')[0] : '');
                        }}
                        placeholder="Select expiry date"
                      />
                    </HubForm.Field>
                  </div>
                </div>
              </HubForm.Grid>
            </div>

            {/* 3. DBS Certificate */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                DBS Certificate
              </h4>
              <HubForm.Grid>
                <DocumentUploadField
                  label="DBS Document"
                  documentType="dbs"
                  profileId={profileId}
                  onUploadSuccess={(url) => {
                    setUploadedFiles(prev => ({ ...prev, dbs: url }));
                  }}
                  disabled={isLoading}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <HubForm.Field label="Certificate Number">
                    <input
                      type="text"
                      value={formData.dbs_certificate_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, dbs_certificate_number: e.target.value }))}
                      onFocus={() => setEditingField('dbs_certificate_number')}
                      onBlur={() => handleBlur('dbs_certificate_number')}
                      placeholder="Enter DBS certificate number"
                      disabled={isLoading || isSaving}
                    />
                  </HubForm.Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <HubForm.Field label="Issue Date">
                      <DatePicker
                        selected={formData.dbs_certificate_date ? new Date(formData.dbs_certificate_date) : undefined}
                        onSelect={(date) => {
                          handleDateChange('dbs_certificate_date', date ? date.toISOString().split('T')[0] : '');
                        }}
                        placeholder="Select issue date"
                      />
                    </HubForm.Field>
                    <HubForm.Field label="Expiry Date">
                      <DatePicker
                        selected={formData.dbs_expiry_date ? new Date(formData.dbs_expiry_date) : undefined}
                        onSelect={(date) => {
                          handleDateChange('dbs_expiry_date', date ? date.toISOString().split('T')[0] : '');
                        }}
                        placeholder="Select expiry date"
                      />
                    </HubForm.Field>
                  </div>
                </div>
              </HubForm.Grid>
            </div>
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

// Document Upload Field Component
interface DocumentUploadFieldProps {
  label: string;
  documentType: 'identity' | 'dbs' | 'address';
  profileId?: string;
  onUploadSuccess: (url: string) => void;
  disabled?: boolean;
}

const DocumentUploadField: React.FC<DocumentUploadFieldProps> = ({
  label,
  documentType,
  profileId,
  onUploadSuccess,
  disabled
}) => {
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const { handleFileSelect, error: uploadError } = useDocumentUpload({
    documentType,
    onUploadSuccess: async (url) => {
      onUploadSuccess(url);
      setUploadedFileName('Document uploaded');
    },
    onUploadError: (error) => {
      console.error(`Upload error for ${documentType}:`, error);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profileId) {
      setUploading(true);
      try {
        await handleFileSelect(file, profileId);
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <HubForm.Field label={label}>
      <div
        style={{
          padding: '24px',
          backgroundColor: '#ffffff',
          border: '2px dashed #d1d5db',
          borderRadius: '8px',
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || uploading ? 0.6 : 1,
          transition: 'all 0.2s',
        }}
        onClick={() => {
          if (!disabled && !uploading) {
            document.getElementById(`${documentType}-upload`)?.click();
          }
        }}
      >
        <input
          id={`${documentType}-upload`}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={disabled || uploading}
        />
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
            {uploading ? 'Uploading...' : uploadedFileName || 'Click to upload'}
          </div>
          <div style={{ fontSize: '12px' }}>
            JPG, PNG, PDF (max 10MB)
          </div>
        </div>
        {uploadError && (
          <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
            {uploadError}
          </div>
        )}
      </div>
    </HubForm.Field>
  );
};

export default TutorProfessionalVerificationStep;
