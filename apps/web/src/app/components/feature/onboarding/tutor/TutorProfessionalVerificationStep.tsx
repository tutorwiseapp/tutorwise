'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import { HubForm } from '@/app/components/hub/form/HubForm';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import InlineProgressBadge from '../shared/InlineProgressBadge';
import { useOnboardingAutoSave } from '@/hooks/useAutoSave';
import { useDifferentiatedSave } from '../shared/useDifferentiatedSave';
import { saveOnboardingProgress, getOnboardingProgress } from '@/lib/api/onboarding';
import { useUserProfile } from '@/app/contexts/UserProfileContext';

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
  onBack?: (details: VerificationDetailsData) => void;
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

  // Restore saved onboarding progress on mount
  React.useEffect(() => {
    if (!isRestored && user?.id) {
      getOnboardingProgress('tutor')
        .then(savedProgress => {
          const savedData = savedProgress?.progress?.tutor?.verificationDetails;

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

  // Save strategies
  const { saveOnNavigate, saveOnContinue } = useDifferentiatedSave<VerificationDetailsData>();

  // Auto-save with 5-second debounce (only after restoration)
  const { saveStatus, lastSaved, error } = useOnboardingAutoSave(
    formData,
    async (data) => {
      if (!user?.id) throw new Error('User not authenticated');

      await saveOnboardingProgress({
        userId: user.id,
        progress: {
          tutor: {
            verificationDetails: data
          }
        }
      });
    },
    {
      enabled: isRestored, // Only auto-save after restoration
    }
  );

  // No validation - all fields are optional for faster onboarding
  const isValid = true;

  const handleNext = async () => {
    if (!user?.id) {
      console.error('[TutorProfessionalVerificationStep] User not authenticated');
      return;
    }

    const dataToSave = {
      ...formData,
      proof_of_address_url: uploadedFiles.address,
      identity_verification_document_url: uploadedFiles.identity,
      dbs_certificate_url: uploadedFiles.dbs,
    };

    // Use blocking save strategy for manual continue
    const success = await saveOnContinue({
      data: dataToSave,
      onSave: async (data) => {
        await saveOnboardingProgress({
          userId: user.id,
          progress: {
            tutor: {
              verificationDetails: data
            }
          }
        });
      },
    });

    if (success) {
      onNext(dataToSave);
    }
  };

  const handleBack = () => {
    if (!user?.id || !onBack) return;

    const dataToSave = {
      ...formData,
      proof_of_address_url: uploadedFiles.address,
      identity_verification_document_url: uploadedFiles.identity,
      dbs_certificate_url: uploadedFiles.dbs,
    };

    // Use optimistic save strategy for navigation
    saveOnNavigate({
      data: dataToSave,
      onSave: async (data) => {
        await saveOnboardingProgress({
          userId: user.id,
          progress: {
            tutor: {
              verificationDetails: data
            }
          }
        });
      },
    });

    // Navigate immediately and pass data to wizard (optimistic)
    onBack(dataToSave);
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
                      onChange={(value) => setFormData(prev => ({ ...prev, proof_of_address_type: String(value) }))}
                      options={[
                        { value: 'Utility Bill', label: 'Utility Bill' },
                        { value: 'Bank Statement', label: 'Bank Statement' },
                        { value: 'Tax Bill', label: 'Tax Bill' },
                        { value: 'Solicitor Letter', label: 'Solicitor Letter' },
                      ]}
                      placeholder="Select document type"
                      disabled={isLoading}
                    />
                  </HubForm.Field>
                  <HubForm.Field label="Issue Date">
                    <DatePicker
                      selected={formData.address_document_issue_date ? new Date(formData.address_document_issue_date) : undefined}
                      onSelect={(date) => {
                        setFormData(prev => ({ ...prev, address_document_issue_date: date ? date.toISOString().split('T')[0] : '' }));
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
                      placeholder="Enter passport or license number"
                      disabled={isLoading}
                    />
                  </HubForm.Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <HubForm.Field label="Issue Date">
                      <DatePicker
                        selected={formData.identity_issue_date ? new Date(formData.identity_issue_date) : undefined}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, identity_issue_date: date ? date.toISOString().split('T')[0] : '' }));
                        }}
                        placeholder="Select issue date"
                      />
                    </HubForm.Field>
                    <HubForm.Field label="Expiry Date">
                      <DatePicker
                        selected={formData.identity_expiry_date ? new Date(formData.identity_expiry_date) : undefined}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, identity_expiry_date: date ? date.toISOString().split('T')[0] : '' }));
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
                      placeholder="Enter DBS certificate number"
                      disabled={isLoading}
                    />
                  </HubForm.Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <HubForm.Field label="Issue Date">
                      <DatePicker
                        selected={formData.dbs_certificate_date ? new Date(formData.dbs_certificate_date) : undefined}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, dbs_certificate_date: date ? date.toISOString().split('T')[0] : '' }));
                        }}
                        placeholder="Select issue date"
                      />
                    </HubForm.Field>
                    <HubForm.Field label="Expiry Date">
                      <DatePicker
                        selected={formData.dbs_expiry_date ? new Date(formData.dbs_expiry_date) : undefined}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, dbs_expiry_date: date ? date.toISOString().split('T')[0] : '' }));
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
        onBack={handleBack}
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
