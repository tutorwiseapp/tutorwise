/**
 * Filename: TutoringRequestForm.tsx
 * Purpose: Tutoring request listing creation form (client-specific)
 * Pattern: Copied from tutor/OneToOneForm.tsx and customized for client requests
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
import styles from '../tutor/OneToOneForm.module.css';

interface TutoringRequestFormProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<CreateListingInput>;
}

type EditingField = 'title' | 'description' | 'who_needs_tutoring' | 'subjects' | 'levels' |
  'preferred_experience_level' | 'session_type' | 'delivery_mode' |
  'hourly_rate' | 'preferred_qualifications' | 'preferred_credentials' |
  'preferred_teaching_background' | null;

type FieldType = 'text' | 'select' | 'multiselect' | 'textarea' | 'number';

// Constants for select options
const whoNeedsTutoringOptions = [
  { value: 'Myself (Adult Learner)', label: 'Myself (Adult Learner)' },
  { value: 'My Child/Student (Primary)', label: 'My Child/Student (Primary)' },
  { value: 'My Child/Student (Secondary)', label: 'My Child/Student (Secondary)' },
  { value: 'My Child/Student (College/University)', label: 'My Child/Student (College/University)' },
];

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

const levelsOptions = [
  { value: 'Primary (KS1-KS2) Age 5-11', label: 'Primary (KS1-KS2) Age 5-11' },
  { value: 'Secondary (KS3) Age 11-14', label: 'Secondary (KS3) Age 11-14' },
  { value: 'Secondary (KS4) Age 14-16', label: 'Secondary (KS4) Age 14-16' },
  { value: 'A-Levels Age 16-18', label: 'A-Levels Age 16-18' },
];

const preferredExperienceLevelOptions = [
  { value: 'Any', label: 'Any' },
  { value: 'New Tutor (0-2 years)', label: 'New Tutor (0-2 years)' },
  { value: 'Experienced (3-5 years)', label: 'Experienced (3-5 years)' },
  { value: 'Expert (5+ years)', label: 'Expert (5+ years)' },
];

const sessionTypeOptions = [
  { value: 'One-to-One Session', label: 'One-to-One Session' },
  { value: 'Group Session', label: 'Group Session' },
];

const deliveryModeOptions = [
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'In-person' },
  { value: 'hybrid', label: 'Hybrid (Online & In-person)' },
];

const preferredQualificationsOptions = [
  { value: 'University Degree', label: 'University Degree' },
  { value: "Master's", label: "Master's" },
  { value: 'PhD', label: 'PhD' },
  { value: 'Professional Certificate', label: 'Professional Certificate' },
];

const preferredCredentialsOptions = [
  { value: 'QTLS/QTS', label: 'QTLS/QTS' },
  { value: 'PGCE', label: 'PGCE' },
  { value: 'Teaching License', label: 'Teaching License' },
  { value: 'None', label: 'None' },
];

const preferredTeachingBackgroundOptions = [
  { value: 'Any', label: 'Any' },
  { value: 'New Teacher (0-3 years)', label: 'New Teacher (0-3 years)' },
  { value: 'Experienced (4-7 years)', label: 'Experienced (4-7 years)' },
  { value: 'Senior (8+ years)', label: 'Senior (8+ years)' },
];

export default function TutoringRequestForm({
  onSubmit,
  onCancel,
  isSaving = false,
  initialData = {}
}: TutoringRequestFormProps) {
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
    { fieldName: 'whoNeedsTutoring', context: 'listing.client', fallback: { label: 'Who Needs Tutoring?', placeholder: 'Select who needs tutoring', options: whoNeedsTutoringOptions } },
    { fieldName: 'subjects', context: 'listing.client', fallback: { label: 'Subjects Needed', placeholder: 'Select subjects', options: subjectsOptions } },
    { fieldName: 'levels', context: 'listing.client', fallback: { label: 'Education Levels', placeholder: 'Select levels', options: levelsOptions } },
    { fieldName: 'preferredExperienceLevel', context: 'listing.client', fallback: { label: 'Preferred Experience Level', placeholder: 'Select experience level', options: preferredExperienceLevelOptions } },
    { fieldName: 'sessionType', context: 'listing.client', fallback: { label: 'Preferred Session Type', placeholder: 'Select session types', options: sessionTypeOptions } },
    { fieldName: 'deliveryMode', context: 'listing.client', fallback: { label: 'Preferred Delivery Mode', placeholder: 'Select delivery modes', options: deliveryModeOptions } },
    { fieldName: 'preferredQualifications', context: 'listing.client', fallback: { label: 'Preferred Qualifications', placeholder: 'Select qualifications (optional)', options: preferredQualificationsOptions } },
    { fieldName: 'preferredCredentials', context: 'listing.client', fallback: { label: 'Preferred Credentials', placeholder: 'Select credentials (optional)', options: preferredCredentialsOptions } },
    { fieldName: 'preferredTeachingBackground', context: 'listing.client', fallback: { label: 'Preferred Teaching Background', placeholder: 'Select background (optional)', options: preferredTeachingBackgroundOptions } },
  ]);

  // Form data with unified state
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    who_needs_tutoring: '',
    subjects: (initialData.subjects as string[]) || [],
    levels: (initialData.levels as string[]) || [],
    description: initialData.description || '',
    preferred_experience_level: '',
    session_type: [] as string[],
    delivery_mode: [] as string[],
    hourly_rate: initialData.hourly_rate?.toString() || '',
    preferred_qualifications: [] as string[],
    preferred_credentials: [] as string[],
    preferred_teaching_background: '',
  });

  // Auto-save draft to localStorage
  useEffect(() => {
    const draftData = { ...formData };
    localStorage.setItem('tutoring_request_draft', JSON.stringify(draftData));
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
    } else if (e.key === 'Enter' && field !== 'description') {
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
    if (!formData.who_needs_tutoring) {
      errors.push('Please select who needs tutoring');
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
    if (!formData.preferred_experience_level) {
      errors.push('Please select preferred tutor experience level');
    }
    if (formData.session_type.length === 0) {
      errors.push('Please select at least one session type');
    }
    if (formData.delivery_mode.length === 0) {
      errors.push('Please select at least one delivery mode');
    }
    if (!formData.hourly_rate || parseFloat(formData.hourly_rate) <= 0) {
      errors.push('Please enter a valid hourly budget');
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
        listing_type: 'request',
        service_type: 'tutoring-request',
        title: formData.title,
        who_needs_tutoring: formData.who_needs_tutoring,
        subjects: formData.subjects,
        levels: formData.levels,
        description: formData.description,
        preferred_experience_level: formData.preferred_experience_level,
        session_type: formData.session_type,
        delivery_mode: formData.delivery_mode,
        hourly_rate: parseFloat(formData.hourly_rate),
        preferred_qualifications: formData.preferred_qualifications.length > 0 ? formData.preferred_qualifications : undefined,
        preferred_credentials: formData.preferred_credentials.length > 0 ? formData.preferred_credentials : undefined,
        preferred_teaching_background: formData.preferred_teaching_background || undefined,
        status: 'published',
      };

      await onSubmit(listingData);
      localStorage.removeItem('tutoring_request_draft');
    } catch (error) {
      console.error('Failed to create tutoring request:', error);
    } finally {
      setLocalIsSaving(false);
    }
  };

  // Handle save draft
  const handleSaveDraft = () => {
    toast.success('Draft saved successfully!');
  };

  // Render field helper (similar to tutor OneToOneForm)
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
      {/* Main Section - All basic request fields in ONE large section */}
      <HubForm.Section>
        <HubForm.Grid columns={1}>
          {renderField('title', 'title', 'Request Title', 'text', 'E.g., Looking for Maths Tutor for Year 7 Student')}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('who_needs_tutoring', 'who_needs_tutoring', 'Who Needs Tutoring?', 'select', 'Select who needs tutoring', configs.get('whoNeedsTutoring')?.options || whoNeedsTutoringOptions)}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('description', 'description', 'Learning Needs Description', 'textarea', 'Describe the learning needs, current situation, challenges, and what kind of support would be most helpful...')}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('subjects', 'subjects', 'Subjects Needed', 'multiselect', 'Select subjects', configs.get('subjects')?.options || subjectsOptions)}
          {renderField('levels', 'levels', 'Education Levels', 'multiselect', 'Select levels', configs.get('levels')?.options || levelsOptions)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('preferred_experience_level', 'preferred_experience_level', 'Preferred Tutor Experience Level', 'select', 'Select experience level', configs.get('preferredExperienceLevel')?.options || preferredExperienceLevelOptions)}
          {renderField('session_type', 'session_type', 'Preferred Session Type', 'multiselect', 'Select session types', configs.get('sessionType')?.options || sessionTypeOptions)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('delivery_mode', 'delivery_mode', 'Preferred Delivery Mode', 'multiselect', 'Select delivery modes', configs.get('deliveryMode')?.options || deliveryModeOptions)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('hourly_rate', 'hourly_rate', 'Hourly Budget (£/hour)', 'number', '£50')}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Optional Tutor Preferences Section */}
      <HubForm.Section title="Tutor Preferences (Optional)">
        <HubForm.Grid>
          {renderField('preferred_qualifications', 'preferred_qualifications', 'Preferred Qualifications', 'multiselect', 'Select qualifications (optional)', configs.get('preferredQualifications')?.options || preferredQualificationsOptions)}
          {renderField('preferred_credentials', 'preferred_credentials', 'Preferred Credentials', 'multiselect', 'Select credentials (optional)', configs.get('preferredCredentials')?.options || preferredCredentialsOptions)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('preferred_teaching_background', 'preferred_teaching_background', 'Preferred Teaching Background', 'select', 'Select background (optional)', configs.get('preferredTeachingBackground')?.options || preferredTeachingBackgroundOptions)}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Form Actions - Using HubForm.Actions */}
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
          {(isSaving || localIsSaving) ? 'Publishing...' : 'Publish Request'}
        </Button>
      </HubForm.Actions>
    </HubForm.Root>
  );
}
