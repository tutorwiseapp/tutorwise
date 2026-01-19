/**
 * Filename: StudyPackageForm.tsx
 * Purpose: Study Package (digital product) listing creation form
 * Pattern: Copied from OneToOneForm.tsx and customized for study packages
 * Created: 2026-01-19
 * Architecture: Uses HubForm components with unified state management
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateListingInput } from '@tutorwise/shared-types';
import HubForm from '@/app/components/hub/form/HubForm';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import Button from '@/app/components/ui/actions/Button';
import { useFormConfigs } from '@/hooks/useFormConfig';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
import toast from 'react-hot-toast';
import styles from './StudyPackageForm.module.css';

interface StudyPackageFormProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<CreateListingInput>;
}

type EditingField = 'title' | 'subjects' | 'levels' | 'description' | 'package_type' |
  'package_contents' | 'hourly_rate_min' | 'hourly_rate_max' | 'images' | null;

type FieldType = 'text' | 'select' | 'multiselect' | 'textarea' | 'number';

// Constants for select options
const packageTypeOptions = [
  { value: 'pdf', label: 'PDF Document' },
  { value: 'video', label: 'Video Course' },
  { value: 'bundle', label: 'Bundle (PDF + Video)' },
];

const subjectsOptions = [
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'English', label: 'English' },
  { value: 'Science', label: 'Science' },
  { value: 'History', label: 'History' },
  { value: 'Geography', label: 'Geography' },
  { value: 'Languages', label: 'Languages' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Biology', label: 'Biology' },
];

const levelsOptions = [
  { value: 'Primary Education (KS1-KS2) - Age 5 to 11', label: 'Primary Education (KS1-KS2) - Age 5 to 11' },
  { value: 'Secondary Education (KS3) - Age 11 to 14', label: 'Secondary Education (KS3) - Age 11 to 14' },
  { value: 'Secondary Education (KS4) - Age 14 to 16', label: 'Secondary Education (KS4) - Age 14 to 16' },
  { value: 'A-Levels - Age 16 to 18', label: 'A-Levels - Age 16 to 18' },
  { value: 'University/Undergraduate', label: 'University/Undergraduate' },
];

export default function StudyPackageForm({ onSubmit, onCancel, isSaving = false, initialData = {} }: StudyPackageFormProps) {
  const router = useRouter();
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [localIsSaving, setLocalIsSaving] = useState(false);

  // Refs for auto-focus
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null }>({});

  const setInputRef = (field: EditingField, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => {
    if (field) {
      inputRefs.current[field] = el;
    }
  };

  // Fetch dynamic form configs
  const { configs } = useFormConfigs([
    { fieldName: 'subjects', context: 'listing', fallback: { label: 'Subjects', placeholder: 'Select subjects', options: subjectsOptions } },
    { fieldName: 'levels', context: 'listing', fallback: { label: 'Education Levels', placeholder: 'Select levels', options: levelsOptions } },
    { fieldName: 'packageType', context: 'listing', fallback: { label: 'Package Type', placeholder: 'Select package type', options: packageTypeOptions } },
  ]);

  // Form data with unified state
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    subjects: (initialData.subjects as string[]) || [],
    levels: (initialData.levels as string[]) || [],
    description: initialData.description || '',
    package_type: (initialData as any).package_type || '',
    package_contents: (initialData as any).package_contents || '',
    hourly_rate_min: initialData.hourly_rate_min?.toString() || '',
    hourly_rate_max: initialData.hourly_rate_max?.toString() || '',
    images: (initialData.images as string[]) || [],
  });

  // Auto-save draft to localStorage
  useEffect(() => {
    const draftData = {
      ...formData,
    };
    localStorage.setItem('study_package_draft', JSON.stringify(draftData));
  }, [formData]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (editingField && inputRefs.current[editingField]) {
      inputRefs.current[editingField]?.focus();
    }
  }, [editingField]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (field: string, values: string[]) => {
    setFormData(prev => ({ ...prev, [field]: values }));
  };

  const handleFieldClick = (field: EditingField) => {
    setEditingField(field);
  };

  const handleBlur = (field: EditingField) => {
    // For listings, we don't auto-save on blur, just close editing
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: EditingField) => {
    if (e.key === 'Escape') {
      setEditingField(null);
    } else if (e.key === 'Enter' && field !== 'description' && field !== 'package_contents') {
      e.preventDefault();
      setEditingField(null);
    }
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.title.trim() || formData.title.length < 10) {
      errors.push('Title must be at least 10 characters');
    }
    if (formData.subjects.length === 0) {
      errors.push('Please select at least one subject');
    }
    if (formData.levels.length === 0) {
      errors.push('Please select at least one education level');
    }
    if (!formData.description.trim() || formData.description.length < 50) {
      errors.push('Description must be at least 50 characters');
    }
    if (!formData.package_type) {
      errors.push('Please select a package type');
    }
    if (!formData.package_contents.trim() || formData.package_contents.length < 20) {
      errors.push('Package contents must be at least 20 characters');
    }
    if (!formData.hourly_rate_min || parseFloat(formData.hourly_rate_min) <= 0) {
      errors.push('Please enter a valid package price');
    }
    if (formData.hourly_rate_max && parseFloat(formData.hourly_rate_max) < parseFloat(formData.hourly_rate_min)) {
      errors.push('Maximum price must be greater than minimum price');
    }

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return false;
    }

    return true;
  };

  // Handle publish
  const handlePublish = async () => {
    if (!validateForm()) return;

    setLocalIsSaving(true);
    try {
      const listingData: any = {
        listing_type: 'service',
        service_type: 'study-package',
        title: formData.title,
        subjects: formData.subjects,
        levels: formData.levels,
        description: formData.description,
        package_type: formData.package_type,
        package_contents: formData.package_contents,
        hourly_rate_min: parseFloat(formData.hourly_rate_min),
        hourly_rate_max: formData.hourly_rate_max ? parseFloat(formData.hourly_rate_max) : undefined,
        images: formData.images,
        status: 'published',
      };

      await onSubmit(listingData);
      localStorage.removeItem('study_package_draft');
    } catch (error) {
      console.error('Failed to create listing:', error);
    } finally {
      setLocalIsSaving(false);
    }
  };

  // Handle save draft
  const handleSaveDraft = () => {
    toast.success('Draft saved successfully!');
  };

  // Render field helper (similar to ProfessionalInfoForm)
  const renderField = (
    field: EditingField,
    fieldKey: string,
    label: string,
    type: FieldType,
    placeholder?: string,
    options?: { value: string; label: string }[]
  ) => {
    const isEditing = editingField === field;
    const fieldValue = (formData as any)[fieldKey];

    // Display value handling
    const displayValue = Array.isArray(fieldValue)
      ? (fieldValue.length > 0 ? fieldValue.join(', ') : '')
      : fieldValue;

    // For select/multiselect, always show the dropdown
    if (type === 'select' || type === 'multiselect') {
      return (
        <HubForm.Field
          label={label}
          isEditing={true}
          onClick={undefined}
        >
          {type === 'multiselect' ? (
            <UnifiedMultiSelect
              triggerLabel={formatMultiSelectLabel(Array.isArray(fieldValue) ? fieldValue : [], placeholder || `Select ${label.toLowerCase()}...`)}
              placeholder={placeholder || `Select ${label.toLowerCase()}...`}
              options={options || []}
              selectedValues={Array.isArray(fieldValue) ? fieldValue : []}
              onSelectionChange={(values) => handleMultiSelectChange(fieldKey, values)}
              disabled={isSaving || localIsSaving}
            />
          ) : (
            <UnifiedSelect
              value={fieldValue as string}
              onChange={(value) => {
                const syntheticEvent = {
                  target: { name: fieldKey, value }
                } as React.ChangeEvent<HTMLSelectElement>;
                handleChange(syntheticEvent);
              }}
              onBlur={() => handleBlur(field)}
              onKeyDown={(e) => handleKeyDown(e as any, field)}
              options={options || []}
              placeholder={placeholder || `Select ${label.toLowerCase()}`}
              disabled={isSaving || localIsSaving}
            />
          )}
        </HubForm.Field>
      );
    }

    // For text inputs and textareas
    return (
      <HubForm.Field
        label={label}
        isEditing={isEditing}
        onClick={() => !isEditing && handleFieldClick(field)}
      >
        {isEditing ? (
          <>
            {type === 'textarea' ? (
              <textarea
                ref={(el) => setInputRef(field, el)}
                name={fieldKey}
                value={fieldValue as string}
                onChange={handleChange}
                onBlur={() => handleBlur(field)}
                onKeyDown={(e) => handleKeyDown(e, field)}
                placeholder={placeholder}
                disabled={isSaving || localIsSaving}
                maxLength={1000}
                rows={4}
              />
            ) : (
              <input
                ref={(el) => setInputRef(field, el)}
                type={type}
                name={fieldKey}
                value={fieldValue as string}
                onChange={handleChange}
                onBlur={() => handleBlur(field)}
                onKeyDown={(e) => handleKeyDown(e, field)}
                placeholder={placeholder}
                disabled={isSaving || localIsSaving}
              />
            )}
          </>
        ) : (
          <>
            {displayValue || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>{placeholder || `Click to add ${label.toLowerCase()}...`}</span>}
          </>
        )}
      </HubForm.Field>
    );
  };

  return (
    <HubForm.Root>
      {/* Main Section - All basic listing fields in ONE large section like ProfessionalInfoForm */}
      <HubForm.Section>
        <HubForm.Grid columns={1}>
          {renderField('title', 'title', 'Package Title', 'text', 'E.g., Complete GCSE Maths Study Guide - PDF & Video Bundle')}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('description', 'description', 'Package Description', 'textarea', 'Describe your study package, what makes it valuable, what students will learn...')}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('package_contents', 'package_contents', 'Package Contents', 'textarea', 'Describe what\'s included in this package (files, videos, resources, etc.)')}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('subjects', 'subjects', 'Subjects Covered', 'multiselect', 'Select subjects', configs.get('subjects')?.options || subjectsOptions)}
          {renderField('levels', 'levels', 'Education Levels', 'multiselect', 'Select levels', configs.get('levels')?.options || levelsOptions)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('package_type', 'package_type', 'Package Type', 'select', 'Select package type', configs.get('packageType')?.options || packageTypeOptions)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('hourly_rate_min', 'hourly_rate_min', 'Package Price (Minimum) (£)', 'number', '£25')}
          {renderField('hourly_rate_max', 'hourly_rate_max', 'Package Price (Maximum) (£)', 'number', '£50 (optional)')}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Form Actions - Using HubForm.Actions like ProfessionalInfoForm */}
      <HubForm.Actions>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onCancel}
          disabled={isSaving || localIsSaving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleSaveDraft}
          disabled={isSaving || localIsSaving}
        >
          Save Draft
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handlePublish}
          disabled={isSaving || localIsSaving}
        >
          {(isSaving || localIsSaving) ? 'Publishing...' : 'Publish Listing'}
        </Button>
      </HubForm.Actions>
    </HubForm.Root>
  );
}
