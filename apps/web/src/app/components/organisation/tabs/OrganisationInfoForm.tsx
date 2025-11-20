/**
 * Filename: OrganisationInfoForm.tsx
 * Purpose: Organisation Info Form with Gold Standard Auto-save Logic
 * Version: v4 (Pure Auto-save Pattern)
 * Created: 2025-11-20
 * Design: Transplanted from PersonalInfoForm.tsx (Superior Logic) + HubForm (Superior Visuals)
 *
 * Features:
 * - Click-to-Edit pattern for all fields
 * - Auto-save on blur (optimistic update)
 * - Logo upload with immediate auto-save
 * - Validation blocks save (keeps field in edit mode)
 * - Keyboard shortcuts (Enter to save, Esc to cancel)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Organisation, updateOrganisation } from '@/lib/api/organisation';
import { HubForm } from '@/app/components/ui/hub-form';
import { useImageUpload } from '@/hooks/useImageUpload';
import toast from 'react-hot-toast';
import styles from './OrganisationInfoForm.module.css';

interface OrganisationInfoFormProps {
  organisation: Organisation;
}

type EditingFieldValue =
  | 'name'
  | 'slug'
  | 'description'
  | 'website'
  | 'contact_name'
  | 'contact_email'
  | 'contact_phone'
  | 'address_line1'
  | 'address_town'
  | 'address_city'
  | 'address_postcode'
  | 'address_country'
  | 'logo';

type EditingField = EditingFieldValue | null;

export default function OrganisationInfoForm({ organisation }: OrganisationInfoFormProps) {
  const queryClient = useQueryClient();
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(organisation.avatar_url);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<EditingFieldValue, string>>>({});

  // Refs for auto-focus
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement | null }>({});

  const [formData, setFormData] = useState({
    name: organisation.name || '',
    slug: organisation.slug || '',
    description: organisation.description || '',
    website: organisation.website || '',
    contact_name: organisation.contact_name || '',
    contact_email: organisation.contact_email || '',
    contact_phone: organisation.contact_phone || '',
    address_line1: organisation.address_line1 || '',
    address_town: organisation.address_town || '',
    address_city: organisation.address_city || '',
    address_postcode: organisation.address_postcode || '',
    address_country: organisation.address_country || '',
  });

  // Update form when organisation changes
  useEffect(() => {
    setFormData({
      name: organisation.name || '',
      slug: organisation.slug || '',
      description: organisation.description || '',
      website: organisation.website || '',
      contact_name: organisation.contact_name || '',
      contact_email: organisation.contact_email || '',
      contact_phone: organisation.contact_phone || '',
      address_line1: organisation.address_line1 || '',
      address_town: organisation.address_town || '',
      address_city: organisation.address_city || '',
      address_postcode: organisation.address_postcode || '',
      address_country: organisation.address_country || '',
    });
    setLogoPreview(organisation.avatar_url);
  }, [organisation]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (editingField && editingField !== 'logo' && inputRefs.current[editingField]) {
      inputRefs.current[editingField]?.focus();
    }
  }, [editingField]);

  // Logo Upload Hook
  const { isUploading: isUploadingLogo, handleFileSelect } = useImageUpload({
    onUploadSuccess: async (url) => {
      setLogoPreview(url);
      // Auto-save logo immediately
      try {
        await updateOrganisation(organisation.id, { avatar_url: url });
        queryClient.invalidateQueries({ queryKey: ['organisation'] });
        toast.success('Logo uploaded successfully');
      } catch (error) {
        toast.error('Failed to save logo');
        console.error('Logo save error:', error);
      }
    },
    onUploadError: (error) => {
      toast.error(error);
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<typeof formData>) => {
      return updateOrganisation(organisation.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisation'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update organisation');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[name as EditingFieldValue]) {
      setValidationErrors((prev) => ({ ...prev, [name as EditingFieldValue]: undefined }));
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && organisation.profile_id) {
      await handleFileSelect(file, organisation.profile_id);
    }
  };

  // Validation
  const validateField = (field: EditingField): string | null => {
    if (!field || field === 'logo') return null;

    const value = formData[field as keyof typeof formData];

    if (field === 'name' && !value.trim()) {
      return 'Organisation name is required';
    }

    if (field === 'slug' && value && !/^[a-z0-9-]+$/.test(value)) {
      return 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    if (field === 'website' && value && !value.startsWith('http')) {
      return 'Website must start with http:// or https://';
    }

    if (field === 'contact_email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address';
    }

    return null;
  };

  // Save Field
  const handleSaveField = async (field: EditingField) => {
    if (!field || field === 'logo') return;

    // Validate
    const error = validateField(field);
    if (error) {
      setValidationErrors((prev) => ({ ...prev, [field]: error }));
      toast.error(error);
      return; // Keep in edit mode, don't save
    }

    setIsSaving(true);
    try {
      const updates = {
        [field]: formData[field as keyof typeof formData] || undefined,
      };
      await updateMutation.mutateAsync(updates);
      setEditingField(null);
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
      toast.success('Saved');
    } catch (error) {
      console.error('Failed to save field:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel Field
  const handleCancelField = (field: EditingField) => {
    if (!field) return;

    // Reset field to organisation value
    setFormData((prev) => ({
      ...prev,
      [field]: (organisation as any)[field] || '',
    }));

    setEditingField(null);
    setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Field Click Handler
  const handleFieldClick = (field: EditingField) => {
    setEditingField(field);
  };

  // Auto-save on blur
  const handleBlur = (field: EditingField) => {
    if (!field || field === 'logo') return;
    if (isSaving) return; // Prevent re-triggering while saving

    // Small delay to allow click events to complete (e.g., clicking Save/Cancel buttons)
    setTimeout(() => {
      // Check if still editing this field (user might have cancelled or switched fields)
      if (editingField !== field) return;

      // Check if value has changed
      const currentValue = formData[field as keyof typeof formData];
      const originalValue = (organisation as any)[field] || '';

      if (currentValue !== originalValue) {
        handleSaveField(field);
      } else {
        setEditingField(null);
      }
    }, 150);
  };

  // Keyboard shortcuts
  const handleKeyDown = async (e: React.KeyboardEvent, field: EditingField) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelField(field);
    } else if (e.key === 'Enter' && field !== 'description') {
      e.preventDefault();
      await handleSaveField(field);
    }
  };

  // Render Field
  const renderField = (
    field: EditingField,
    label: string,
    type: 'text' | 'email' | 'tel' | 'url' | 'textarea' = 'text',
    placeholder?: string,
    required?: boolean
  ) => {
    if (!field) return null;

    const fieldKey = field as keyof typeof formData;
    const isEditing = editingField === field;
    const displayValue = formData[fieldKey] || '';
    const error = validationErrors[field as EditingFieldValue];

    return (
      <HubForm.Field
        label={label}
        required={required}
        error={error}
        isEditing={isEditing}
        onClick={() => !isEditing && handleFieldClick(field)}
      >
        {isEditing ? (
          type === 'textarea' ? (
            <textarea
              ref={(el) => {
                inputRefs.current[field!] = el;
              }}
              name={fieldKey}
              value={formData[fieldKey]}
              onChange={handleChange}
              onBlur={() => handleBlur(field)}
              onKeyDown={(e) => handleKeyDown(e, field)}
              placeholder={placeholder}
              disabled={isSaving}
              rows={4}
              className={isSaving ? styles.saving : ''}
            />
          ) : (
            <input
              ref={(el) => {
                inputRefs.current[field!] = el;
              }}
              type={type}
              name={fieldKey}
              value={formData[fieldKey]}
              onChange={handleChange}
              onBlur={() => handleBlur(field)}
              onKeyDown={(e) => handleKeyDown(e, field)}
              placeholder={placeholder}
              disabled={isSaving}
              className={isSaving ? styles.saving : ''}
            />
          )
        ) : (
          <>
            {displayValue || <span className={styles.placeholder}>{placeholder || `Click to add ${label.toLowerCase()}...`}</span>}
          </>
        )}
        {isSaving && isEditing && <span className={styles.savingIndicator}>Saving...</span>}
      </HubForm.Field>
    );
  };

  // Manual Save All (Safety Button)
  const handleSaveAll = async () => {
    if (editingField && editingField !== 'logo') {
      await handleSaveField(editingField);
    }
  };

  // Manual Cancel All (Safety Button)
  const handleCancelAll = () => {
    if (editingField) {
      handleCancelField(editingField);
    }
  };

  return (
    <HubForm.Root>
      {/* Section 1: Logo and Basic Info */}
      <HubForm.Section>
        <div className={styles.identityLayout}>
          {/* Logo Upload */}
          <div className={styles.logoSection}>
            <div className={styles.logoUploadContainer}>
              <div className={styles.logoPreview}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Organisation logo" className={styles.logoImage} />
                ) : (
                  <div className={styles.logoPlaceholder}>No logo</div>
                )}
                <input
                  type="file"
                  id="logo"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className={styles.fileInput}
                  disabled={isUploadingLogo}
                />
                <label htmlFor="logo" className={styles.fileLabel}>
                  {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </label>
              </div>
            </div>
          </div>

          {/* Name and Slug */}
          <HubForm.Grid>
            {renderField('name', 'Organisation Name', 'text', 'ABC Tutoring', true)}
            {renderField('slug', 'URL Slug', 'text', 'abc-tutoring', true)}
          </HubForm.Grid>
        </div>
      </HubForm.Section>

      {/* Section 2: Details */}
      <HubForm.Section title="Details">
        <HubForm.Grid columns={1}>
          {renderField('description', 'Description', 'textarea', 'ABC Tutoring is specialising in...', true)}
          {renderField('website', 'Website', 'url', 'https://www.abctutoring.com')}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Section 3: Contact & Location */}
      <HubForm.Section title="Contact & Location">
        <HubForm.Grid>
          {renderField('contact_name', 'Contact Name', 'text', 'John Smith')}
          {renderField('contact_email', 'Email Address', 'email', 'johnsmith@abc.com')}
          {renderField('contact_phone', 'Phone Number', 'tel', '+44 20 7123...')}
          {renderField('address_line1', 'Address', 'text', '123, High Street')}
          {renderField('address_town', 'Town', 'text', 'City of London')}
          {renderField('address_city', 'City', 'text', 'London')}
          {renderField('address_postcode', 'Postcode', 'text', 'EC1 1AA')}
          {renderField('address_country', 'Country', 'text', 'United Kingdom')}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button
          type="button"
          onClick={handleCancelAll}
          disabled={!editingField || isSaving}
          className={`${styles.button} ${styles.secondary}`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={!editingField || isSaving}
          className={`${styles.button} ${styles.primary}`}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </HubForm.Root>
  );
}
