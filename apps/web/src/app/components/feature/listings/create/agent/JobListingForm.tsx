/**
 * Filename: JobListingForm.tsx
 * Purpose: Agent job listing creation form (30 comprehensive fields)
 * Pattern: Copied from OneToOneForm.tsx and customized for job postings
 * Created: 2026-01-20
 * Architecture: Uses HubForm components with unified state management
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateListingInput } from '@tutorwise/shared-types';
import HubForm from '@/app/components/hub/form/HubForm';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import Button from '@/app/components/ui/actions/Button';
import { useFormConfigs } from '@/hooks/useFormConfig';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
import toast from 'react-hot-toast';
import styles from './JobListingForm.module.css';

interface JobListingFormProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<CreateListingInput>;
}

type EditingField = 'job_title' | 'description' | 'employment_type' | 'contract_length' |
  'start_date' | 'end_date' | 'application_deadline' | 'subjects' | 'levels' |
  'student_numbers' | 'class_type' | 'delivery_mode' | 'work_location' |
  'hours_per_week' | 'schedule_flexibility' | 'timezone_requirements' |
  'compensation_type' | 'compensation_min' | 'compensation_max' | 'benefits' |
  'additional_benefits' | 'minimum_qualifications' | 'teaching_credentials' |
  'minimum_experience' | 'dbs_check' | 'other_requirements' | 'how_to_apply' |
  'application_instructions' | 'about_organisation' | 'organisation_type' | null;

type FieldType = 'text' | 'select' | 'multiselect' | 'textarea' | 'number' | 'date';

// Constants for select options
const employmentTypeOptions = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance/Self-employed' },
];

const contractLengthOptions = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'fixed-3m', label: 'Fixed-term (3 months)' },
  { value: 'fixed-6m', label: 'Fixed-term (6 months)' },
  { value: 'fixed-1y', label: 'Fixed-term (1 year)' },
  { value: 'temporary', label: 'Temporary/Cover' },
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
  { value: 'Primary KS1-KS2', label: 'Primary KS1-KS2' },
  { value: 'Secondary KS3', label: 'Secondary KS3' },
  { value: 'Secondary KS4', label: 'Secondary KS4' },
  { value: 'A-Levels', label: 'A-Levels' },
  { value: 'University', label: 'University' },
];

const studentNumbersOptions = [
  { value: '1-5', label: '1-5 students/week' },
  { value: '6-10', label: '6-10 students/week' },
  { value: '11-20', label: '11-20 students/week' },
  { value: '20+', label: '20+ students/week' },
];

const classTypeOptions = [
  { value: 'one-to-one', label: 'One-to-one' },
  { value: 'small-group', label: 'Small group (2-5)' },
  { value: 'medium-group', label: 'Medium group (6-10)' },
  { value: 'large-group', label: 'Large group (10+)' },
];

const deliveryModeOptions = [
  { value: 'online', label: 'Online' },
  { value: 'in-person', label: 'In-person' },
  { value: 'hybrid', label: 'Hybrid' },
];

const hoursPerWeekOptions = [
  { value: 'under-10', label: 'Under 10 hours' },
  { value: '10-20', label: '10-20 hours' },
  { value: '20-30', label: '20-30 hours' },
  { value: '30-40', label: '30-40 hours' },
  { value: '40+', label: '40+ hours' },
];

const scheduleFlexibilityOptions = [
  { value: 'fixed', label: 'Fixed schedule' },
  { value: 'flexible', label: 'Flexible hours' },
  { value: 'weekends', label: 'Weekends available' },
  { value: 'evenings', label: 'Evenings available' },
];

const compensationTypeOptions = [
  { value: 'hourly', label: 'Hourly Rate' },
  { value: 'annual', label: 'Annual Salary' },
  { value: 'per-session', label: 'Per Session' },
  { value: 'commission', label: 'Commission-based' },
];

const benefitsOptions = [
  { value: 'flexible-schedule', label: 'Flexible schedule' },
  { value: 'professional-dev', label: 'Professional development' },
  { value: 'paid-training', label: 'Paid training' },
  { value: 'materials-provided', label: 'Materials provided' },
  { value: 'holiday-pay', label: 'Holiday pay' },
  { value: 'pension', label: 'Pension' },
  { value: 'health-insurance', label: 'Health insurance' },
  { value: 'other', label: 'Other' },
];

const minimumQualificationsOptions = [
  { value: 'university-degree', label: 'University Degree' },
  { value: 'masters', label: "Master's" },
  { value: 'phd', label: 'PhD' },
  { value: 'professional-cert', label: 'Professional Certificate' },
  { value: 'a-levels', label: 'A-Levels' },
  { value: 'none', label: 'None required' },
];

const teachingCredentialsOptions = [
  { value: 'qtls-qts', label: 'QTLS/QTS' },
  { value: 'pgce', label: 'PGCE' },
  { value: 'teaching-license', label: 'Teaching License' },
  { value: 'none', label: 'None required' },
];

const minimumExperienceOptions = [
  { value: 'entry', label: 'Entry Level (0-1 years)' },
  { value: 'junior', label: 'Junior (1-3 years)' },
  { value: 'mid', label: 'Mid-level (3-5 years)' },
  { value: 'senior', label: 'Senior (5+ years)' },
  { value: 'any', label: 'Any experience level' },
];

const dbsCheckOptions = [
  { value: 'required', label: 'Yes (Required before start)' },
  { value: 'assist', label: 'Will assist with obtaining' },
  { value: 'no', label: 'No' },
];

const howToApplyOptions = [
  { value: 'tutorwise', label: 'Tutorwise Messages' },
  { value: 'network', label: 'Network & Connections' },
  { value: 'organisation', label: "Organisation's Join Our Team page" },
];

const organisationTypeOptions = [
  { value: 'tutoring-agency', label: 'Tutoring Agency' },
  { value: 'company', label: 'Company' },
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'university', label: 'University' },
  { value: 'charity', label: 'Charity' },
  { value: 'other', label: 'Other' },
];

export default function JobListingForm({ onSubmit, onCancel, isSaving = false, initialData = {} }: JobListingFormProps) {
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
  ]);

  // Form data with unified state (30 fields)
  const [formData, setFormData] = useState({
    // Section 1: Job Basics
    job_title: initialData.title || '',
    description: initialData.description || '',
    employment_type: '',
    contract_length: '',
    start_date: '',
    end_date: '',
    application_deadline: '',

    // Section 2: Teaching Details
    subjects: (initialData.subjects as string[]) || [],
    levels: (initialData.levels as string[]) || [],
    student_numbers: '',
    class_type: [] as string[],

    // Section 3: Location & Schedule
    delivery_mode: [] as string[],
    work_location: '',
    hours_per_week: '',
    schedule_flexibility: '',
    timezone_requirements: '',

    // Section 4: Compensation & Benefits
    compensation_type: '',
    compensation_min: '',
    compensation_max: '',
    benefits: [] as string[],
    additional_benefits: '',

    // Section 5: Requirements & Qualifications
    minimum_qualifications: [] as string[],
    teaching_credentials: [] as string[],
    minimum_experience: '',
    dbs_check: '',
    other_requirements: '',

    // Section 6: Application Process
    how_to_apply: '',
    application_instructions: '',

    // Section 7: About Organisation (auto-filled if available)
    about_organisation: (initialData as any).about_organisation || '',
    organisation_type: (initialData as any).organisation_type || '',
  });

  // Auto-save draft to localStorage
  useEffect(() => {
    localStorage.setItem('job_listing_draft', JSON.stringify(formData));
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
    } else if (e.key === 'Enter' && field !== 'description' && field !== 'additional_benefits' && field !== 'other_requirements' && field !== 'application_instructions' && field !== 'about_organisation') {
      e.preventDefault();
      setEditingField(null);
    }
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const errors: string[] = [];

    // Section 1: Job Basics (5 required)
    if (!formData.job_title.trim() || formData.job_title.length < 10) {
      errors.push('Job title must be at least 10 characters');
    }
    if (!formData.description.trim() || formData.description.length < 50) {
      errors.push('Description must be at least 50 characters');
    }
    if (!formData.employment_type) {
      errors.push('Please select an employment type');
    }
    if (!formData.contract_length) {
      errors.push('Please select a contract length');
    }
    if (!formData.start_date) {
      errors.push('Please select a start date');
    }

    // Conditional: end_date required if Fixed-term or Temporary
    if ((formData.contract_length.includes('fixed') || formData.contract_length === 'temporary') && !formData.end_date) {
      errors.push('End date is required for fixed-term or temporary contracts');
    }

    // Section 2: Teaching Details (4 required)
    if (formData.subjects.length === 0) {
      errors.push('Please select at least one subject');
    }
    if (formData.levels.length === 0) {
      errors.push('Please select at least one education level');
    }
    if (!formData.student_numbers) {
      errors.push('Please select expected student numbers');
    }
    if (formData.class_type.length === 0) {
      errors.push('Please select at least one class type');
    }

    // Section 3: Location & Schedule (2 required + 1 conditional)
    if (formData.delivery_mode.length === 0) {
      errors.push('Please select at least one delivery mode');
    }
    if (!formData.hours_per_week) {
      errors.push('Please select hours per week');
    }
    // Conditional: work_location required if In-person or Hybrid
    if ((formData.delivery_mode.includes('in-person') || formData.delivery_mode.includes('hybrid')) && !formData.work_location.trim()) {
      errors.push('Work location is required for in-person or hybrid delivery');
    }

    // Section 4: Compensation & Benefits (3 required)
    if (!formData.compensation_type) {
      errors.push('Please select a compensation type');
    }
    if (!formData.compensation_min || parseFloat(formData.compensation_min) <= 0) {
      errors.push('Please enter a valid minimum compensation');
    }
    if (!formData.compensation_max || parseFloat(formData.compensation_max) <= 0) {
      errors.push('Please enter a valid maximum compensation');
    }
    if (formData.compensation_max && parseFloat(formData.compensation_max) < parseFloat(formData.compensation_min)) {
      errors.push('Maximum compensation must be greater than minimum');
    }

    // Section 5: Requirements & Qualifications (4 required)
    if (formData.minimum_qualifications.length === 0) {
      errors.push('Please select at least one minimum qualification');
    }
    if (formData.teaching_credentials.length === 0) {
      errors.push('Please select at least one teaching credential requirement');
    }
    if (!formData.minimum_experience) {
      errors.push('Please select minimum experience level');
    }
    if (!formData.dbs_check) {
      errors.push('Please specify DBS check requirement');
    }

    // Section 6: Application Process (1 required)
    if (!formData.how_to_apply) {
      errors.push('Please select how applicants should apply');
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
        listing_type: 'job',
        service_type: 'job-listing',
        title: formData.job_title,
        description: formData.description,
        employment_type: formData.employment_type,
        contract_length: formData.contract_length,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        application_deadline: formData.application_deadline || undefined,
        subjects: formData.subjects,
        levels: formData.levels,
        student_numbers: formData.student_numbers,
        class_type: formData.class_type,
        delivery_mode: formData.delivery_mode,
        work_location: formData.work_location || undefined,
        hours_per_week: formData.hours_per_week,
        schedule_flexibility: formData.schedule_flexibility || undefined,
        timezone_requirements: formData.timezone_requirements || undefined,
        compensation_type: formData.compensation_type,
        compensation_min: parseFloat(formData.compensation_min),
        compensation_max: parseFloat(formData.compensation_max),
        benefits: formData.benefits,
        additional_benefits: formData.additional_benefits || undefined,
        minimum_qualifications: formData.minimum_qualifications,
        teaching_credentials: formData.teaching_credentials,
        minimum_experience: formData.minimum_experience,
        dbs_check: formData.dbs_check,
        other_requirements: formData.other_requirements || undefined,
        how_to_apply: formData.how_to_apply,
        application_instructions: formData.application_instructions || undefined,
        about_organisation: formData.about_organisation || undefined,
        organisation_type: formData.organisation_type || undefined,
        status: 'published',
      };

      await onSubmit(listingData);
      localStorage.removeItem('job_listing_draft');
    } catch (error) {
      console.error('Failed to create job listing:', error);
    } finally {
      setLocalIsSaving(false);
    }
  };

  // Handle save draft
  const handleSaveDraft = () => {
    toast.success('Draft saved successfully!');
  };

  // Render field helper (similar to OneToOneForm)
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

    // For date fields
    if (type === 'date') {
      return (
        <HubForm.Field
          label={label}
          isEditing={true}
          onClick={undefined}
        >
          <DatePicker
            selected={fieldValue ? new Date(fieldValue) : undefined}
            onSelect={(date) => {
              const syntheticEvent = {
                target: { name: fieldKey, value: date ? date.toISOString().split('T')[0] : '' }
              } as React.ChangeEvent<HTMLInputElement>;
              handleChange(syntheticEvent);
            }}
            placeholder={placeholder || `Select ${label.toLowerCase()}`}
          />
        </HubForm.Field>
      );
    }

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
                maxLength={2000}
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
      {/* Section 1: Job Basics */}
      <HubForm.Section title="Job Basics">
        <HubForm.Grid columns={1}>
          {renderField('job_title', 'job_title', 'Job Title', 'text', 'E.g., Maths Tutor - GCSE Level')}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('description', 'description', 'Job Description', 'textarea', 'Describe the role, responsibilities, and what makes this opportunity unique...')}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('employment_type', 'employment_type', 'Employment Type', 'select', 'Select type', employmentTypeOptions)}
          {renderField('contract_length', 'contract_length', 'Contract Length', 'select', 'Select length', contractLengthOptions)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('start_date', 'start_date', 'Start Date', 'date', 'Select start date')}
          {renderField('end_date', 'end_date', 'End Date (if applicable)', 'date', 'Select end date')}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('application_deadline', 'application_deadline', 'Application Deadline (Optional)', 'date', 'Select deadline')}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Section 2: Teaching Details */}
      <HubForm.Section title="Teaching Details">
        <HubForm.Grid>
          {renderField('subjects', 'subjects', 'Subjects', 'multiselect', 'Select subjects', configs.get('subjects')?.options || subjectsOptions)}
          {renderField('levels', 'levels', 'Education Levels', 'multiselect', 'Select levels', configs.get('levels')?.options || levelsOptions)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('student_numbers', 'student_numbers', 'Expected Student Numbers', 'select', 'Select range', studentNumbersOptions)}
          {renderField('class_type', 'class_type', 'Class Type', 'multiselect', 'Select types', classTypeOptions)}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Section 3: Location & Schedule */}
      <HubForm.Section title="Location & Schedule">
        <HubForm.Grid>
          {renderField('delivery_mode', 'delivery_mode', 'Delivery Mode', 'multiselect', 'Select modes', deliveryModeOptions)}
          {renderField('work_location', 'work_location', 'Work Location', 'text', 'E.g., London, SW1')}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('hours_per_week', 'hours_per_week', 'Hours Per Week', 'select', 'Select hours', hoursPerWeekOptions)}
          {renderField('schedule_flexibility', 'schedule_flexibility', 'Schedule Flexibility (Optional)', 'select', 'Select flexibility', scheduleFlexibilityOptions)}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('timezone_requirements', 'timezone_requirements', 'Timezone Requirements (Optional)', 'text', 'E.g., Must work UK hours (9am-5pm GMT)')}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Section 4: Compensation & Benefits */}
      <HubForm.Section title="Compensation & Benefits">
        <HubForm.Grid columns={1}>
          {renderField('compensation_type', 'compensation_type', 'Compensation Type', 'select', 'Select type', compensationTypeOptions)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('compensation_min', 'compensation_min', 'Minimum Compensation (£)', 'number', 'E.g., 25')}
          {renderField('compensation_max', 'compensation_max', 'Maximum Compensation (£)', 'number', 'E.g., 50')}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('benefits', 'benefits', 'Benefits (Optional)', 'multiselect', 'Select benefits', benefitsOptions)}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('additional_benefits', 'additional_benefits', 'Additional Benefits (Optional)', 'textarea', 'Describe any other benefits...')}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Section 5: Requirements & Qualifications */}
      <HubForm.Section title="Requirements & Qualifications">
        <HubForm.Grid>
          {renderField('minimum_qualifications', 'minimum_qualifications', 'Minimum Qualifications', 'multiselect', 'Select qualifications', minimumQualificationsOptions)}
          {renderField('teaching_credentials', 'teaching_credentials', 'Teaching Credentials', 'multiselect', 'Select credentials', teachingCredentialsOptions)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('minimum_experience', 'minimum_experience', 'Minimum Experience', 'select', 'Select experience', minimumExperienceOptions)}
          {renderField('dbs_check', 'dbs_check', 'DBS Check Required', 'select', 'Select requirement', dbsCheckOptions)}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('other_requirements', 'other_requirements', 'Other Requirements (Optional)', 'textarea', 'Any other requirements or preferences...')}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Section 6: Application Process */}
      <HubForm.Section title="Application Process">
        <HubForm.Grid columns={1}>
          {renderField('how_to_apply', 'how_to_apply', 'How to Apply', 'select', 'Select method', howToApplyOptions)}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('application_instructions', 'application_instructions', 'Application Instructions (Optional)', 'textarea', 'Provide specific instructions for applicants...')}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Section 7: About the Organisation */}
      <HubForm.Section title="About the Organisation">
        <HubForm.Grid columns={1}>
          {renderField('about_organisation', 'about_organisation', 'About the Organisation (Optional)', 'textarea', 'Describe your organisation, mission, and culture...')}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('organisation_type', 'organisation_type', 'Organisation Type (Optional)', 'select', 'Select type', organisationTypeOptions)}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Form Actions */}
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
          {(isSaving || localIsSaving) ? 'Publishing...' : 'Publish Job Listing'}
        </Button>
      </HubForm.Actions>
    </HubForm.Root>
  );
}
