/**
 * Filename: WorkshopForm.tsx
 * Purpose: Workshop service listing creation form
 * Pattern: Copied from OneToOneForm.tsx and customized for workshop creation
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
import CustomTimePicker from '@/app/components/feature/listings/wizard-steps/CustomTimePicker';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import Button from '@/app/components/ui/actions/Button';
import HubListItem from '@/app/components/hub/content/HubListItem/HubListItem';
import { useFormConfigs } from '@/hooks/useFormConfig';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
import toast from 'react-hot-toast';
import styles from './WorkshopForm.module.css';

interface WorkshopFormProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<CreateListingInput>;
}

type EditingField = 'title' | 'subjects' | 'levels' | 'description' | 'session_duration' |
  'hourly_rate_min' | 'hourly_rate_max' | 'delivery_mode' | 'images' | 'max_participants' |
  'workshop_date' | 'workshop_start_time' | 'workshop_end_time' | null;

type FieldType = 'text' | 'select' | 'multiselect' | 'textarea' | 'number' | 'date' | 'time';

interface UnavailabilityPeriod {
  id: string;
  fromDate: string;
  toDate: string;
}

// Constants for select options
const sessionDurationOptions = [
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
];

const deliveryModeOptions = [
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'In-person' },
  { value: 'hybrid', label: 'Hybrid (Online & In-person)' },
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

export default function WorkshopForm({ onSubmit, onCancel, isSaving = false, initialData = {} }: WorkshopFormProps) {
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
    { fieldName: 'sessionDuration', context: 'listing', fallback: { label: 'Session Duration', placeholder: 'Select duration', options: sessionDurationOptions } },
    { fieldName: 'deliveryMode', context: 'listing', fallback: { label: 'Delivery Mode', placeholder: 'Select delivery mode', options: deliveryModeOptions } },
  ]);

  // Form data with unified state
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    subjects: (initialData.subjects as string[]) || [],
    levels: (initialData.levels as string[]) || [],
    description: initialData.description || '',
    session_duration: '',
    hourly_rate_min: initialData.hourly_rate_min?.toString() || '',
    hourly_rate_max: initialData.hourly_rate_max?.toString() || '',
    delivery_mode: '',
    images: (initialData.images as string[]) || [],
    max_participants: (initialData as any).max_participants || '',
    workshop_date: (initialData as any).workshop_date || '',
    workshop_start_time: (initialData as any).workshop_start_time || '',
    workshop_end_time: (initialData as any).workshop_end_time || '',
  });

  // Unavailability state
  const [unavailabilityPeriods, setUnavailabilityPeriods] = useState<UnavailabilityPeriod[]>([]);
  const [unavailErrors, setUnavailErrors] = useState<{ dates?: string }>({});
  const [unavailFromDate, setUnavailFromDate] = useState('');
  const [unavailToDate, setUnavailToDate] = useState('');

  // Auto-save draft to localStorage
  useEffect(() => {
    const draftData = {
      ...formData,
      unavailabilityPeriods,
    };
    localStorage.setItem('workshop_draft', JSON.stringify(draftData));
  }, [formData, unavailabilityPeriods]);

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

  const validateUnavailability = () => {
    const newErrors: { dates?: string } = {};

    if (!unavailFromDate) {
      newErrors.dates = 'Please select a start date';
    }

    if (!unavailToDate) {
      newErrors.dates = 'Please select an end date';
    }

    setUnavailErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddUnavailability = () => {
    if (!validateUnavailability()) return;

    const newPeriod: UnavailabilityPeriod = {
      id: Date.now().toString(),
      fromDate: unavailFromDate,
      toDate: unavailToDate
    };

    setUnavailabilityPeriods([...unavailabilityPeriods, newPeriod]);

    // Reset form
    setUnavailFromDate('');
    setUnavailToDate('');
    setUnavailErrors({});
  };

  const handleRemoveUnavailability = (id: string) => {
    setUnavailabilityPeriods(unavailabilityPeriods.filter(p => p.id !== id));
  };

  const formatUnavailabilityText = (period: UnavailabilityPeriod) => {
    return `${period.fromDate} - ${period.toDate}`;
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
    if (!formData.session_duration) {
      errors.push('Please select a session duration');
    }
    if (!formData.delivery_mode) {
      errors.push('Please select a delivery mode');
    }
    if (!formData.hourly_rate_min || parseFloat(formData.hourly_rate_min) <= 0) {
      errors.push('Please enter a valid hourly rate');
    }
    if (formData.hourly_rate_max && parseFloat(formData.hourly_rate_max) < parseFloat(formData.hourly_rate_min)) {
      errors.push('Maximum rate must be greater than minimum rate');
    }
    if (!formData.max_participants || parseFloat(formData.max_participants as string) <= 0) {
      errors.push('Please enter a valid maximum number of participants');
    }
    if (!formData.workshop_date) {
      errors.push('Please select a workshop date');
    }
    if (!formData.workshop_start_time) {
      errors.push('Please select a workshop start time');
    }
    if (!formData.workshop_end_time) {
      errors.push('Please select a workshop end time');
    }
    if (formData.workshop_start_time && formData.workshop_end_time &&
        formData.workshop_start_time >= formData.workshop_end_time) {
      errors.push('Workshop end time must be after start time');
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
        service_type: 'workshop',
        title: formData.title,
        subjects: formData.subjects,
        levels: formData.levels,
        description: formData.description,
        session_duration: formData.session_duration,
        delivery_mode: formData.delivery_mode,
        hourly_rate_min: parseFloat(formData.hourly_rate_min),
        hourly_rate_max: formData.hourly_rate_max ? parseFloat(formData.hourly_rate_max) : undefined,
        max_participants: parseFloat(formData.max_participants as string),
        workshop_date: formData.workshop_date,
        workshop_start_time: formData.workshop_start_time,
        workshop_end_time: formData.workshop_end_time,
        unavailability: unavailabilityPeriods,
        images: formData.images,
        status: 'published',
      };

      await onSubmit(listingData);
      localStorage.removeItem('workshop_draft');
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
    options?: { value: string; label: string }[],
    required?: boolean
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

    // For date inputs
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
              const dateString = date ? date.toISOString().split('T')[0] : '';
              const syntheticEvent = {
                target: { name: fieldKey, value: dateString }
              } as React.ChangeEvent<HTMLInputElement>;
              handleChange(syntheticEvent);
            }}
            placeholder={placeholder || 'Select date'}
          />
        </HubForm.Field>
      );
    }

    // For time inputs
    if (type === 'time') {
      return (
        <HubForm.Field
          label={label}
          isEditing={true}
          onClick={undefined}
        >
          <CustomTimePicker
            value={fieldValue as string || '9:00 AM'}
            onChange={(time) => {
              const syntheticEvent = {
                target: { name: fieldKey, value: time }
              } as React.ChangeEvent<HTMLInputElement>;
              handleChange(syntheticEvent);
            }}
          />
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
          {renderField('title', 'title', 'Workshop Title', 'text', 'E.g., Intensive GCSE Maths Revision Workshop - Exam Success', undefined, true)}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('description', 'description', 'Workshop Description', 'textarea', 'Describe your workshop, learning objectives, teaching approach, what participants will gain...', undefined, true)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('subjects', 'subjects', 'Subjects Covered', 'multiselect', 'Select subjects', configs.get('subjects')?.options || subjectsOptions, true)}
          {renderField('levels', 'levels', 'Education Levels', 'multiselect', 'Select levels', configs.get('levels')?.options || levelsOptions, true)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('session_duration', 'session_duration', 'Session Duration', 'select', 'Select duration', configs.get('sessionDuration')?.options || sessionDurationOptions, true)}
          {renderField('delivery_mode', 'delivery_mode', 'Delivery Mode', 'select', 'Select delivery mode', configs.get('deliveryMode')?.options || deliveryModeOptions, true)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('hourly_rate_min', 'hourly_rate_min', 'Minimum Hourly Rate (£)', 'number', '£25', undefined, true)}
          {renderField('hourly_rate_max', 'hourly_rate_max', 'Maximum Hourly Rate (£)', 'number', '£50 (optional)')}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('max_participants', 'max_participants', 'Maximum Participants', 'number', 'Enter maximum participants', undefined, true)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('workshop_date', 'workshop_date', 'Workshop Date', 'date', 'Select workshop date', undefined, true)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('workshop_start_time', 'workshop_start_time', 'Start Time', 'time', 'Select start time', undefined, true)}
          {renderField('workshop_end_time', 'workshop_end_time', 'End Time', 'time', 'Select end time', undefined, true)}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Unavailability Section */}
      <HubForm.Section title="Instructor Unavailability (Optional)">
        <div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Unavailability Periods</label>

            {unavailErrors.dates && (
              <p className={styles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                {unavailErrors.dates}
              </p>
            )}

            <div className={styles.dateGrid}>
              <HubForm.Field label="From">
                <DatePicker
                  selected={unavailFromDate ? new Date(unavailFromDate) : undefined}
                  onSelect={(date) => {
                    setUnavailFromDate(date ? date.toISOString().split('T')[0] : '');
                    setUnavailErrors(prev => ({ ...prev, dates: undefined }));
                  }}
                  placeholder="Select start date"
                />
              </HubForm.Field>
              <HubForm.Field label="To">
                <DatePicker
                  selected={unavailToDate ? new Date(unavailToDate) : undefined}
                  onSelect={(date) => {
                    setUnavailToDate(date ? date.toISOString().split('T')[0] : '');
                    setUnavailErrors(prev => ({ ...prev, dates: undefined }));
                  }}
                  placeholder="Select end date"
                />
              </HubForm.Field>
            </div>
          </div>

          {/* Add Button */}
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddUnavailability}
            disabled={isSaving || localIsSaving}
            className={styles.addButton}
          >
            Add Unavailability
          </Button>

          {/* Display added unavailability periods */}
          {unavailabilityPeriods.length > 0 && (
            <div className={styles.periodsList}>
              <h4 className={styles.periodsTitle}>Added Periods:</h4>
              {unavailabilityPeriods.map(period => (
                <HubListItem
                  key={period.id}
                  actions={
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveUnavailability(period.id)}
                    >
                      Remove
                    </Button>
                  }
                >
                  {formatUnavailabilityText(period)}
                </HubListItem>
              ))}
            </div>
          )}
        </div>
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
