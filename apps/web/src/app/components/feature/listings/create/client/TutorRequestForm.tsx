/**
 * Filename: TutorRequestForm.tsx
 * Purpose: Client tutoring request creation form
 * Pattern: Copied from agent OneToOneForm.tsx and customized for client requests
 * Created: 2026-01-22
 * Architecture: Uses HubForm components with unified state management
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateListingInput } from '@tutorwise/shared-types';
import HubForm from '@/app/components/hub/form/HubForm';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import CustomTimePicker from '@/app/components/feature/listings/create/shared-components/CustomTimePicker';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import Button from '@/app/components/ui/actions/Button';
import HubListItem from '@/app/components/hub/content/HubListItem/HubListItem';
import { useFormConfigs } from '@/hooks/useFormConfig';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
import toast from 'react-hot-toast';
import styles from './TutorRequestForm.module.css';

interface TutorRequestFormProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<CreateListingInput>;
}

type EditingField = 'tutoring_for' | 'subjects' | 'levels' | 'description' | 'hourly_rate' |
  'group_hourly_rate' | 'delivery_mode' | null;

type FieldType = 'text' | 'select' | 'multiselect' | 'textarea' | 'number';

type AvailabilityType = 'recurring' | 'one-time';

interface AvailabilityPeriod {
  id: string;
  type: AvailabilityType;
  days?: string[];
  fromDate: string;
  toDate?: string;
  startTime: string;
  endTime: string;
}

interface UnavailabilityPeriod {
  id: string;
  fromDate: string;
  toDate: string;
}

// Constants for select options
const tutoringForOptions = [
  { value: 'myself', label: 'Myself' },
  { value: 'my_child', label: 'My Child' },
  { value: 'other', label: 'Someone Else' },
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

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TutorRequestForm({ onSubmit, onCancel, isSaving = false, initialData = {} }: TutorRequestFormProps) {
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
    { fieldName: 'subjects', context: 'listing.client', fallback: { label: 'Subjects', placeholder: 'Select subjects', options: subjectsOptions } },
    { fieldName: 'levels', context: 'listing.client', fallback: { label: 'Education Levels', placeholder: 'Select levels', options: levelsOptions } },
    { fieldName: 'deliveryMode', context: 'listing.client', fallback: { label: 'Delivery Mode', placeholder: 'Select delivery mode', options: deliveryModeOptions } },
  ]);

  // Form data with unified state
  const [formData, setFormData] = useState({
    tutoring_for: (initialData as any).tutoring_for || '',
    subjects: (initialData.subjects as string[]) || [],
    levels: (initialData.levels as string[]) || [],
    description: initialData.description || '',
    hourly_rate: initialData.hourly_rate?.toString() || '',
    group_hourly_rate: (initialData as any).group_hourly_rate?.toString() || '',
    delivery_mode: Array.isArray(initialData.delivery_mode)
      ? initialData.delivery_mode[0]
      : (initialData as any).delivery_mode || '',
  });

  // Availability state
  const [availabilityType, setAvailabilityType] = useState<AvailabilityType>('recurring');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [availFromDate, setAvailFromDate] = useState('');
  const [availToDate, setAvailToDate] = useState('');
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('5:00 PM');
  const [availabilityPeriods, setAvailabilityPeriods] = useState<AvailabilityPeriod[]>([]);
  const [unavailabilityPeriods, setUnavailabilityPeriods] = useState<UnavailabilityPeriod[]>([]);
  const [availErrors, setAvailErrors] = useState<{ days?: string; dates?: string; times?: string }>({});
  const [unavailErrors, setUnavailErrors] = useState<{ dates?: string }>({});

  // Auto-save draft to localStorage
  useEffect(() => {
    const draftData = {
      ...formData,
      availabilityPeriods,
      unavailabilityPeriods,
    };
    localStorage.setItem('client_request_draft', JSON.stringify(draftData));
  }, [formData, availabilityPeriods, unavailabilityPeriods]);

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

  // Availability management
  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
    if (availErrors.days) {
      setAvailErrors(prev => ({ ...prev, days: undefined }));
    }
  };

  const validateAvailability = () => {
    const newErrors: { days?: string; dates?: string; times?: string } = {};

    if (availabilityType === 'recurring' && selectedDays.length === 0) {
      newErrors.days = 'Please select at least one day';
    }

    if (!availFromDate) {
      newErrors.dates = 'Please select a start date';
    }

    if (availabilityType === 'recurring' && !availToDate) {
      newErrors.dates = 'Please select an end date for recurring availability';
    }

    // Convert time strings to comparable values (handles AM/PM)
    const parseTime = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      return hour24 * 60 + minutes; // Return total minutes
    };

    if (startTime && endTime && parseTime(startTime) >= parseTime(endTime)) {
      newErrors.times = 'End time must be after start time';
    }

    setAvailErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleAddAvailability = () => {
    if (!validateAvailability()) return;

    const newPeriod: AvailabilityPeriod = {
      id: Date.now().toString(),
      type: availabilityType,
      days: availabilityType === 'recurring' ? selectedDays : undefined,
      fromDate: availFromDate,
      toDate: availabilityType === 'recurring' ? availToDate : undefined,
      startTime,
      endTime
    };

    setAvailabilityPeriods([...availabilityPeriods, newPeriod]);

    // Reset form
    setSelectedDays([]);
    setAvailFromDate('');
    setAvailToDate('');
    setStartTime('9:00 AM');
    setEndTime('5:00 PM');
    setAvailErrors({});
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

  const handleRemoveAvailability = (id: string) => {
    setAvailabilityPeriods(availabilityPeriods.filter(p => p.id !== id));
  };

  const handleRemoveUnavailability = (id: string) => {
    setUnavailabilityPeriods(unavailabilityPeriods.filter(p => p.id !== id));
  };

  const [unavailFromDate, setUnavailFromDate] = useState('');
  const [unavailToDate, setUnavailToDate] = useState('');

  const formatAvailabilityText = (period: AvailabilityPeriod) => {
    if (period.type === 'recurring') {
      const daysList = period.days?.join(', ');
      return `Every ${daysList}, ${period.startTime} - ${period.endTime}`;
    } else {
      return `${period.fromDate}, ${period.startTime} - ${period.endTime}`;
    }
  };

  const formatUnavailabilityText = (period: UnavailabilityPeriod) => {
    return `${period.fromDate} - ${period.toDate}`;
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.tutoring_for) {
      errors.push('Please select who needs tutoring');
    }
    if (formData.subjects.length === 0) {
      errors.push('Please select at least one preferred subject');
    }
    if (formData.levels.length === 0) {
      errors.push('Please select at least one preferred level');
    }
    if (!formData.description.trim() || formData.description.length < 50) {
      errors.push('Description must be at least 50 characters');
    }
    if (!formData.delivery_mode || formData.delivery_mode === '') {
      errors.push('Please select a preferred delivery mode');
    }
    if (!formData.hourly_rate || parseFloat(formData.hourly_rate) <= 0) {
      errors.push('Please enter a valid budget for one-to-one sessions');
    }
    if (availabilityPeriods.length === 0) {
      errors.push('Please add at least one availability period');
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
      // Generate a title from subjects and levels for the request
      const subjectsText = formData.subjects.length > 0
        ? formData.subjects.slice(0, 2).join(' & ') + (formData.subjects.length > 2 ? '...' : '')
        : 'Tutoring';
      const levelsText = formData.levels.length > 0
        ? formData.levels[0].split(' - ')[0] // Get first part like "Primary Education (KS1-KS2)"
        : 'All Levels';
      const generatedTitle = `${subjectsText} Tutor Needed - ${levelsText}`;

      const listingData: any = {
        listing_type: 'request',
        title: generatedTitle, // Required field - auto-generated from subjects/levels
        tutoring_for: formData.tutoring_for,
        subjects: formData.subjects,
        levels: formData.levels,
        description: formData.description,
        delivery_mode: formData.delivery_mode ? [formData.delivery_mode] : [],
        hourly_rate: parseFloat(formData.hourly_rate),
        group_hourly_rate: formData.group_hourly_rate ? parseFloat(formData.group_hourly_rate) : undefined,
        availability: availabilityPeriods,
        unavailability: unavailabilityPeriods,
        status: 'published',
      };

      console.log('[TutorRequestForm] Submitting request data:', listingData);
      await onSubmit(listingData);
      localStorage.removeItem('client_request_draft');
    } catch (error) {
      console.error('[TutorRequestForm] Failed to create request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create request');
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
      {/* Main Section - All basic request fields in ONE large section */}
      <HubForm.Section>
        <HubForm.Grid columns={1}>
          {renderField('tutoring_for', 'tutoring_for', 'Who Needs Tutoring', 'select', 'Select who needs tutoring', tutoringForOptions)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('subjects', 'subjects', 'Preferred Subjects', 'multiselect', 'Select subjects', configs.get('subjects')?.options || subjectsOptions)}
          {renderField('levels', 'levels', 'Preferred Levels', 'multiselect', 'Select levels', configs.get('levels')?.options || levelsOptions)}
        </HubForm.Grid>

        <HubForm.Grid>
          {renderField('hourly_rate', 'hourly_rate', 'Budget for One-to-One (£/hour)', 'number', '£25')}
          {renderField('group_hourly_rate', 'group_hourly_rate', 'Budget for Group Sessions (£/hour)', 'number', '£15')}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('description', 'description', 'Describe Your Tutoring Needs', 'textarea', 'Tell us about the student, their current situation, what challenges they\'re facing, and what kind of support would be most helpful...')}
        </HubForm.Grid>

        <HubForm.Grid columns={1}>
          {renderField('delivery_mode', 'delivery_mode', 'Preferred Delivery Mode', 'select', 'Select delivery mode', configs.get('deliveryMode')?.options || deliveryModeOptions)}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Availability Section - Separate section with title */}
      <HubForm.Section title="Availability">
        <div className={styles.availabilityGrid}>
          {/* Left Column: Availability Periods */}
          <div>
            {/* Availability Type */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Availability Periods</label>
              <div className={styles.dateGrid}>
                <button
                  type="button"
                  className={`${styles.checkboxItem} ${availabilityType === 'recurring' ? styles.selected : ''}`}
                  onClick={() => setAvailabilityType('recurring')}
                >
                  Recurring
                </button>
                <button
                  type="button"
                  className={`${styles.checkboxItem} ${availabilityType === 'one-time' ? styles.selected : ''}`}
                  onClick={() => setAvailabilityType('one-time')}
                >
                  One-time
                </button>
              </div>
            </div>

            {/* Days of Week (only for recurring) */}
            {availabilityType === 'recurring' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Days of Week</label>
                {availErrors.days && (
                  <p className={styles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                    {availErrors.days}
                  </p>
                )}
                <div className={styles.daysGrid}>
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day}
                      type="button"
                      className={`${styles.checkboxItem} ${selectedDays.includes(day) ? styles.selected : ''}`}
                      onClick={() => toggleDay(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date Pickers */}
            <div className={styles.formGroup}>
              {availErrors.dates && (
                <p className={styles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                  {availErrors.dates}
                </p>
              )}
              <div className={availabilityType === 'recurring' ? styles.dateGrid : ''}>
                <HubForm.Field label="From">
                  <DatePicker
                    selected={availFromDate ? new Date(availFromDate) : undefined}
                    onSelect={(date) => {
                      setAvailFromDate(date ? date.toISOString().split('T')[0] : '');
                      setAvailErrors(prev => ({ ...prev, dates: undefined }));
                    }}
                    placeholder="Select start date"
                  />
                </HubForm.Field>
                {availabilityType === 'recurring' && (
                  <HubForm.Field label="To">
                    <DatePicker
                      selected={availToDate ? new Date(availToDate) : undefined}
                      onSelect={(date) => {
                        setAvailToDate(date ? date.toISOString().split('T')[0] : '');
                        setAvailErrors(prev => ({ ...prev, dates: undefined }));
                      }}
                      placeholder="Select end date"
                    />
                  </HubForm.Field>
                )}
              </div>
            </div>

            {/* Time Pickers */}
            <div className={styles.formGroup}>
              {availErrors.times && (
                <p className={styles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                  {availErrors.times}
                </p>
              )}
              <div className={styles.timeGrid}>
                <HubForm.Field label="Start Time">
                  <CustomTimePicker
                    value={startTime}
                    onChange={(time) => {
                      setStartTime(time);
                      setAvailErrors(prev => ({ ...prev, times: undefined }));
                    }}
                  />
                </HubForm.Field>
                <HubForm.Field label="End Time">
                  <CustomTimePicker
                    value={endTime}
                    onChange={(time) => {
                      setEndTime(time);
                      setAvailErrors(prev => ({ ...prev, times: undefined }));
                    }}
                  />
                </HubForm.Field>
              </div>
            </div>

            {/* Add Button */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddAvailability}
              disabled={isSaving || localIsSaving}
              className={styles.addButton}
            >
              Add Availability
            </Button>

            {/* Display added availability periods */}
            {availabilityPeriods.length > 0 && (
              <div className={styles.periodsList}>
                <h4 className={styles.periodsTitle}>Added Periods:</h4>
                {availabilityPeriods.map(period => (
                  <HubListItem
                    key={period.id}
                    actions={
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveAvailability(period.id)}
                      >
                        Remove
                      </Button>
                    }
                  >
                    {formatAvailabilityText(period)}
                  </HubListItem>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Unavailability Periods */}
          <div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Unavailability Periods (Optional)</label>

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
        </div>
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
