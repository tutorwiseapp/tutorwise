'use client';

import { useState, useEffect, useRef } from 'react';
import { format, parse } from 'date-fns';
import type { Profile } from '@/types';
import Button from '@/app/components/ui/Button';
import DatePicker from '@/app/components/ui/picker/DatePicker';
import styles from './PersonalInfoForm.module.css';
import formLayoutStyles from '@/app/components/onboarding/PersonalInfoForm.module.css';

interface PersonalInfoFormProps {
  profile: Profile;
  onSave: (updatedProfile: Partial<Profile>) => Promise<void>;
}

type EditingField = 'first_name' | 'last_name' | 'gender' | 'date_of_birth' | 'email' | 'phone' |
  'address_line1' | 'town' | 'city' | 'country' | 'postal_code' |
  'emergency_contact_name' | 'emergency_contact_email' | 'document' | null;

export default function PersonalInfoForm({ profile, onSave }: PersonalInfoFormProps) {
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');

  // Refs for auto-focus
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | HTMLSelectElement | null }>({});

  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    gender: profile.gender || '',
    date_of_birth: profile.date_of_birth || '',
    email: profile.email || '',
    phone: profile.phone || '',
    address_line1: profile.address_line1 || '',
    town: profile.town || '',
    city: profile.city || '',
    country: profile.country || '',
    postal_code: profile.postal_code || '',
    emergency_contact_name: profile.emergency_contact_name || '',
    emergency_contact_email: profile.emergency_contact_email || '',
    identity_verification_document_name: profile.identity_verification_document_name || '',
  });

  // Initialize date picker when profile loads
  useEffect(() => {
    if (profile.date_of_birth) {
      try {
        const parsedDate = parse(profile.date_of_birth, 'yyyy-MM-dd', new Date());
        setSelectedDate(parsedDate);
      } catch (e) {
        console.error('Error parsing date of birth:', e);
      }
    }
    if (profile.identity_verification_document_name) {
      setUploadedFileName(profile.identity_verification_document_name);
    }
  }, [profile]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (editingField && inputRefs.current[editingField]) {
      inputRefs.current[editingField]?.focus();
    }
  }, [editingField]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setFormData(prev => ({ ...prev, date_of_birth: formattedDate }));
    } else {
      setFormData(prev => ({ ...prev, date_of_birth: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setFileError('Please upload a valid image (JPG, PNG) or PDF file');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setFileError('File size must be less than 5MB');
        return;
      }

      setUploadedFileName(file.name);
      setFileError('');
      // TODO: Upload file and get URL
    }
  };

  const handleDeleteDocument = () => {
    setUploadedFileName('');
    setFormData(prev => ({
      ...prev,
      identity_verification_document_name: ''
    }));
    const fileInput = document.getElementById('identityDocument') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSaveField = async (field: EditingField) => {
    if (!field || field === 'document') return;

    setIsSaving(true);
    try {
      const updateData: Partial<Profile> = {
        [field]: formData[field as keyof typeof formData]
      };
      await onSave(updateData);
      setEditingField(null);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelField = (field: EditingField) => {
    if (!field) return;

    // Reset field to profile value
    setFormData(prev => ({
      ...prev,
      [field]: (profile as any)[field] || ''
    }));

    // Reset date picker if canceling date field
    if (field === 'date_of_birth' && profile.date_of_birth) {
      try {
        const parsedDate = parse(profile.date_of_birth, 'yyyy-MM-dd', new Date());
        setSelectedDate(parsedDate);
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    }

    setEditingField(null);
  };

  const handleFieldClick = (field: EditingField) => {
    setEditingField(field);
  };

  // Auto-save on blur (when clicking outside)
  const handleBlur = async (field: EditingField) => {
    if (!field || field === 'document') return;

    // Check if value has changed
    const currentValue = formData[field as keyof typeof formData];
    const originalValue = (profile as any)[field] || '';

    if (currentValue !== originalValue) {
      await handleSaveField(field);
    } else {
      setEditingField(null);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = async (e: React.KeyboardEvent, field: EditingField) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelField(field);
    } else if (e.key === 'Enter' && field !== 'document') {
      e.preventDefault();
      await handleSaveField(field);
    }
  };

  const renderField = (
    field: EditingField,
    label: string,
    type: 'text' | 'email' | 'tel' | 'select' | 'date' = 'text',
    placeholder?: string,
    options?: { value: string; label: string }[]
  ) => {
    const fieldKey = field as keyof typeof formData;
    const isEditing = editingField === field;
    const displayValue = formData[fieldKey] || placeholder || `Click to add ${label.toLowerCase()}...`;

    return (
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{label}</label>
        {isEditing ? (
          <div className={styles.editingContainer}>
            {type === 'select' ? (
              <select
                ref={(el) => { inputRefs.current[field!] = el; }}
                name={fieldKey}
                value={formData[fieldKey]}
                onChange={handleChange}
                onBlur={() => handleBlur(field)}
                onKeyDown={(e) => handleKeyDown(e, field)}
                disabled={isSaving}
                className={`${styles.formInput} ${isSaving ? styles.saving : ''}`}
              >
                <option value="">Select {label.toLowerCase()}</option>
                {options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : type === 'date' ? (
              <div onBlur={() => handleBlur(field)}>
                <DatePicker
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  disabled={isSaving}
                />
              </div>
            ) : (
              <input
                ref={(el) => { inputRefs.current[field!] = el; }}
                type={type}
                name={fieldKey}
                value={formData[fieldKey]}
                onChange={handleChange}
                onBlur={() => handleBlur(field)}
                onKeyDown={(e) => handleKeyDown(e, field)}
                placeholder={placeholder}
                disabled={isSaving}
                className={`${styles.formInput} ${isSaving ? styles.saving : ''}`}
              />
            )}
            {isSaving && (
              <div className={styles.savingIndicator}>
                <span className={styles.savingText}>Saving...</span>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`${styles.displayValue} ${styles.editable}`}
            onClick={() => handleFieldClick(field)}
          >
            {type === 'date' && formData[fieldKey]
              ? format(parse(formData[fieldKey] as string, 'yyyy-MM-dd', new Date()), 'dd MMMM yyyy')
              : formData[fieldKey] || <span className={styles.placeholder}>{placeholder || `Click to add ${label.toLowerCase()}...`}</span>
            }
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.personalInfoForm}>
      <div className={styles.formContent}>
        {/* Name and Gender - 2 Column Layout */}
        <div className={formLayoutStyles.twoColumnGrid}>
          {renderField('first_name', 'First Name', 'text', 'Mike')}
          {renderField('last_name', 'Last Name', 'text', 'Quinn')}
          {renderField('gender', 'Gender', 'select', 'Select gender', [
            { value: 'Male', label: 'Male' },
            { value: 'Female', label: 'Female' },
            { value: 'Other', label: 'Other' },
            { value: 'Prefer not to say', label: 'Prefer not to say' }
          ])}
          {renderField('date_of_birth', 'Date of Birth', 'date', '01 October 1990')}
        </div>

        {/* Email and Phone - 2 Column Layout */}
        <div className={formLayoutStyles.twoColumnGrid}>
          {renderField('email', 'Email', 'email', 'mikequinn@gmail.com')}
          {renderField('phone', 'Phone', 'tel', '+44 07575 123456')}
        </div>

        {/* Address Fields - 2 Column Layout */}
        <div className={formLayoutStyles.twoColumnGrid}>
          <div className={formLayoutStyles.fullWidth}>
            {renderField('address_line1', 'Address', 'text', '100, The Royal Observatory')}
          </div>
          {renderField('town', 'Town', 'text', 'Greenwich')}
          {renderField('city', 'City', 'text', 'London')}
          {renderField('country', 'Country', 'text', 'United Kingdom')}
          {renderField('postal_code', 'Postcode/Zip Code', 'text', 'SE10 8XJ')}
        </div>

        {/* Identity Verification Document Upload */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Upload Identity Verification Document
          </label>
          <div
            className={`${styles.documentDisplay} ${styles.editable}`}
            onClick={() => document.getElementById('identityDocument')?.click()}
          >
            <input
              id="identityDocument"
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {uploadedFileName ? (
              <div className={styles.documentInfo}>
                <span className={styles.successText}>✓ {uploadedFileName}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDocument();
                  }}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            ) : (
              <span className={styles.placeholder}>Click to upload document...</span>
            )}
          </div>
          {fileError && <p className={styles.errorText}>{fileError}</p>}
          <p className={styles.helperText}>
            Passport, driver&apos;s license, or national ID (JPG, PNG, PDF - max 5MB)
          </p>
        </div>

        {/* Emergency Contact - 2 Column Layout */}
        <div className={formLayoutStyles.subsection}>
          <h3 className={styles.subsectionTitle}>Emergency Contact</h3>
          <div className={formLayoutStyles.twoColumnGrid}>
            {renderField('emergency_contact_name', 'Emergency Contact Name', 'text', 'John Doe')}
            {renderField('emergency_contact_email', 'Emergency Contact Email', 'email', 'emergency@example.com')}
          </div>
        </div>
      </div>
    </div>
  );
}
