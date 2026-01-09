'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons } from '../shared/WizardButton';
import { HubForm } from '@/app/components/hub/form/HubForm';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';

interface TutorProfessionalVerificationStepProps {
  onNext: (details: VerificationDetailsData) => void;
  onBack?: () => void;
  isLoading: boolean;
  profileId?: string;
}

export interface VerificationDetailsData {
  // Proof of Address
  proof_of_address_url?: string;
  proof_of_address_type: string;
  address_document_issue_date: string;

  // Government ID
  identity_verification_document_url?: string;
  identity_document_number: string;
  identity_issue_date: string;
  identity_expiry_date: string;

  // DBS Certificate
  dbs_certificate_url?: string;
  dbs_certificate_number: string;
  dbs_certificate_date: string;
  dbs_expiry_date: string;
}

const TutorProfessionalVerificationStep: React.FC<TutorProfessionalVerificationStepProps> = ({
  onNext,
  onBack,
  isLoading,
  profileId
}) => {
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

  // Validation - all fields are required
  const isValid =
    formData.proof_of_address_type !== '' &&
    formData.address_document_issue_date !== '' &&
    !!uploadedFiles.address &&
    formData.identity_document_number !== '' &&
    formData.identity_issue_date !== '' &&
    formData.identity_expiry_date !== '' &&
    !!uploadedFiles.identity &&
    formData.dbs_certificate_number !== '' &&
    formData.dbs_certificate_date !== '' &&
    formData.dbs_expiry_date !== '' &&
    !!uploadedFiles.dbs;

  const handleContinue = () => {
    onNext({
      ...formData,
      proof_of_address_url: uploadedFiles.address,
      identity_verification_document_url: uploadedFiles.identity,
      dbs_certificate_url: uploadedFiles.dbs,
    });
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
          <HubForm.Section title="Trust and Verification">
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
                  <HubForm.Field label="Document Type" required>
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
                  <HubForm.Field label="Issue Date" required>
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
                  <HubForm.Field label="Document Number" required>
                    <input
                      type="text"
                      value={formData.identity_document_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, identity_document_number: e.target.value }))}
                      placeholder="Enter passport or license number"
                      disabled={isLoading}
                    />
                  </HubForm.Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <HubForm.Field label="Issue Date" required>
                      <DatePicker
                        selected={formData.identity_issue_date ? new Date(formData.identity_issue_date) : undefined}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, identity_issue_date: date ? date.toISOString().split('T')[0] : '' }));
                        }}
                        placeholder="Select issue date"
                      />
                    </HubForm.Field>
                    <HubForm.Field label="Expiry Date" required>
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
                  <HubForm.Field label="Certificate Number" required>
                    <input
                      type="text"
                      value={formData.dbs_certificate_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, dbs_certificate_number: e.target.value }))}
                      placeholder="Enter DBS certificate number"
                      disabled={isLoading}
                    />
                  </HubForm.Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <HubForm.Field label="Issue Date" required>
                      <DatePicker
                        selected={formData.dbs_certificate_date ? new Date(formData.dbs_certificate_date) : undefined}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, dbs_certificate_date: date ? date.toISOString().split('T')[0] : '' }));
                        }}
                        placeholder="Select issue date"
                      />
                    </HubForm.Field>
                    <HubForm.Field label="Expiry Date" required>
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
        onContinue={handleContinue}
        continueEnabled={isValid}
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
    <HubForm.Field label={label} required>
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
