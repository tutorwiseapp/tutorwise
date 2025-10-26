'use client';

import { useState, useEffect, useRef } from 'react';
import type { Profile } from '@/types';
import Button from '@/app/components/ui/Button';
import MultiSelectDropdown from '@/app/components/ui/form/MultiSelectDropdown';
import CustomDateInput from '@/app/components/listings/wizard-steps/CustomDateInput';
import CustomTimePicker from '@/app/components/listings/wizard-steps/CustomTimePicker';
import styles from './PersonalInfoForm.module.css';
import formLayoutStyles from '@/app/components/onboarding/PersonalInfoForm.module.css';
import wizardStyles from '@/app/components/onboarding/OnboardingWizard.module.css';

interface ProfessionalInfoFormProps {
  profile: Profile;
  onSave: (updatedProfile: Partial<Profile>) => Promise<void>;
}

type EditingField = 'bio' | 'status' | 'academic_qualifications' | 'key_stages' |
  'teaching_professional_qualifications' | 'subjects' | 'teaching_experience' |
  'session_type' | 'tutoring_experience' | 'one_on_one_rate' | 'group_session_rate' |
  'delivery_mode' | 'dbs_certificate' | null;

type FieldType = 'text' | 'select' | 'multiselect' | 'textarea' | 'number';

type AvailabilityType = 'recurring' | 'one-time';

interface AvailabilityPeriod {
  id: string;
  type: AvailabilityType;
  days?: string[]; // For recurring (e.g., ['Monday', 'Wednesday'])
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
const statusOptions = [
  { value: 'Professional Tutor', label: 'Professional Tutor' },
  { value: 'Solo Tutor', label: 'Solo Tutor' },
  { value: 'Part-time Tutor', label: 'Part-time Tutor' },
];

const academicQualificationsOptions = [
  { value: 'University Degree', label: 'University Degree' },
  { value: "Master's Degree", label: "Master's Degree" },
  { value: 'PhD', label: 'PhD' },
  { value: 'Professional Certificate', label: 'Professional Certificate' },
];

const keyStagesOptions = [
  { value: 'Secondary Education (KS4) - Age 14 to 16', label: 'Secondary Education (KS4) - Age 14 to 16' },
  { value: 'Primary Education (KS1-KS2) - Age 5 to 11', label: 'Primary Education (KS1-KS2) - Age 5 to 11' },
  { value: 'Secondary Education (KS3) - Age 11 to 14', label: 'Secondary Education (KS3) - Age 11 to 14' },
  { value: 'A-Levels - Age 16 to 18', label: 'A-Levels - Age 16 to 18' },
];

const teachingProfessionalQualificationsOptions = [
  { value: 'QTLS, QTS', label: 'QTLS, QTS' },
  { value: 'PGCE', label: 'PGCE' },
  { value: 'Teaching License', label: 'Teaching License' },
  { value: 'None', label: 'None' },
];

const subjectsOptions = [
  { value: 'Mathematics, English', label: 'Mathematics, English' },
  { value: 'Science', label: 'Science' },
  { value: 'History', label: 'History' },
  { value: 'Geography', label: 'Geography' },
  { value: 'Languages', label: 'Languages' },
];

const teachingExperienceOptions = [
  { value: 'Experienced Teacher (4-7 years)', label: 'Experienced Teacher (4-7 years)' },
  { value: 'New Teacher (0-3 years)', label: 'New Teacher (0-3 years)' },
  { value: 'Senior Teacher (8+ years)', label: 'Senior Teacher (8+ years)' },
];

const sessionTypeOptions = [
  { value: 'One-to-One Session, Group Session', label: 'One-to-One Session, Group Session' },
  { value: 'One-to-One Session', label: 'One-to-One Session' },
  { value: 'Group Session', label: 'Group Session' },
];

const tutoringExperienceOptions = [
  { value: 'Experienced Tutor (3-5 years)', label: 'Experienced Tutor (3-5 years)' },
  { value: 'New Tutor (0-2 years)', label: 'New Tutor (0-2 years)' },
  { value: 'Expert Tutor (5+ years)', label: 'Expert Tutor (5+ years)' },
];

const deliveryModeOptions = [
  { value: 'In-person, Online, Hybrid', label: 'In-person, Online, Hybrid' },
  { value: 'In-person', label: 'In-person' },
  { value: 'Online', label: 'Online' },
  { value: 'Hybrid', label: 'Hybrid' },
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ProfessionalInfoForm({ profile, onSave }: ProfessionalInfoFormProps) {
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Refs for auto-focus
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null }>({});

  // Form data with multi-select fields as arrays
  const [formData, setFormData] = useState({
    bio: profile.bio || '',
    status: '',
    academic_qualifications: [] as string[], // Multi-select
    key_stages: [] as string[], // Multi-select
    teaching_professional_qualifications: [] as string[], // Multi-select
    subjects: [] as string[], // Multi-select
    teaching_experience: '', // Single select
    session_type: [] as string[], // Multi-select
    tutoring_experience: '', // Single select
    one_on_one_rate: '',
    group_session_rate: '',
    delivery_mode: [] as string[], // Multi-select
    dbs_certificate: profile.dbs_certificate_number || '',
  });

  // Availability state
  const [availabilityType, setAvailabilityType] = useState<AvailabilityType>('recurring');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [availFromDate, setAvailFromDate] = useState('');
  const [availToDate, setAvailToDate] = useState('');
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('5:00 PM');
  const [availabilityPeriods, setAvailabilityPeriods] = useState<AvailabilityPeriod[]>([]);
  const [availErrors, setAvailErrors] = useState<{ days?: string; dates?: string; times?: string }>({});

  // Unavailability state
  const [unavailFromDate, setUnavailFromDate] = useState('');
  const [unavailToDate, setUnavailToDate] = useState('');
  const [unavailabilityPeriods, setUnavailabilityPeriods] = useState<UnavailabilityPeriod[]>([]);
  const [unavailErrors, setUnavailErrors] = useState<{ dates?: string }>({});

  // Update form data when profile changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      bio: profile.bio || '',
      dbs_certificate: profile.dbs_certificate_number || '',
    }));
  }, [profile]);

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

  const handleSaveField = async (field: EditingField) => {
    if (!field) return;

    // Only bio and dbs_certificate are editable for now
    if (field !== 'bio' && field !== 'dbs_certificate') {
      // Show "coming soon" message for other fields
      console.log(`Editing ${field} will be available soon`);
      setEditingField(null);
      return;
    }

    setIsSaving(true);
    try {
      let updateData: Partial<Profile> = {};

      if (field === 'bio') {
        updateData = { bio: formData.bio };
      } else if (field === 'dbs_certificate') {
        updateData = { dbs_certificate_number: formData.dbs_certificate };
      }

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
    if (field === 'bio') {
      setFormData(prev => ({ ...prev, bio: profile.bio || '' }));
    } else if (field === 'dbs_certificate') {
      setFormData(prev => ({ ...prev, dbs_certificate: profile.dbs_certificate_number || '' }));
    } else {
      const profileValue = (profile.professional_details?.tutor as any)?.[field];
      setFormData(prev => ({
        ...prev,
        [field]: Array.isArray(profileValue) ? profileValue.join(', ') : profileValue?.toString() || '',
      }));
    }

    setEditingField(null);
  };

  const handleFieldClick = (field: EditingField) => {
    setEditingField(field);
  };

  // Auto-save on blur
  const handleBlur = async (field: EditingField) => {
    if (!field) return;

    // Check if value has changed
    const currentValue = formData[field as keyof typeof formData];
    let originalValue = '';

    if (field === 'bio') {
      originalValue = profile.bio || '';
    } else if (field === 'dbs_certificate') {
      originalValue = profile.dbs_certificate_number || '';
    } else {
      const profileValue = (profile.professional_details?.tutor as any)?.[field];
      originalValue = Array.isArray(profileValue) ? profileValue.join(', ') : profileValue?.toString() || '';
    }

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
    } else if (e.key === 'Enter' && field !== 'bio') {
      e.preventDefault();
      await handleSaveField(field);
    }
  };

  // Availability/Unavailability helper functions
  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
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

    if (startTime >= endTime) {
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

  const recurringPeriods = availabilityPeriods.filter(p => p.type === 'recurring');
  const oneTimePeriods = availabilityPeriods.filter(p => p.type === 'one-time');

  const renderField = (
    field: EditingField,
    label: string,
    type: FieldType = 'text',
    placeholder?: string,
    options?: { value: string; label: string }[]
  ) => {
    const fieldKey = field as keyof typeof formData;
    const isEditing = editingField === field;
    const fieldValue = formData[fieldKey];

    // Display value handling for different field types
    const displayValue = Array.isArray(fieldValue)
      ? (fieldValue.length > 0 ? fieldValue.join(', ') : '')
      : fieldValue;

    return (
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{label}</label>
        {isEditing ? (
          <div className={styles.editingContainer}>
            {type === 'multiselect' ? (
              <div onBlur={() => handleBlur(field)}>
                <MultiSelectDropdown
                  triggerLabel={Array.isArray(fieldValue) && fieldValue.length > 0
                    ? fieldValue.join(', ')
                    : `Select ${label.toLowerCase()}...`}
                  options={options || []}
                  selectedValues={Array.isArray(fieldValue) ? fieldValue : []}
                  onSelectionChange={(values) => handleMultiSelectChange(fieldKey, values)}
                />
              </div>
            ) : type === 'select' ? (
              <select
                ref={(el) => { inputRefs.current[field!] = el; }}
                name={fieldKey}
                value={fieldValue as string}
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
            ) : type === 'textarea' ? (
              <>
                <textarea
                  ref={(el) => { inputRefs.current[field!] = el; }}
                  name={fieldKey}
                  value={fieldValue as string}
                  onChange={handleChange}
                  onBlur={() => handleBlur(field)}
                  onKeyDown={(e) => handleKeyDown(e, field)}
                  placeholder={placeholder}
                  disabled={isSaving}
                  maxLength={1000}
                  className={`${styles.formInput} ${isSaving ? styles.saving : ''}`}
                  rows={5}
                  style={{ resize: 'vertical', minHeight: '120px' }}
                />
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  marginTop: '4px',
                  textAlign: 'right'
                }}>
                  {(fieldValue as string).length}/1000 characters
                </div>
              </>
            ) : (
              <input
                ref={(el) => { inputRefs.current[field!] = el; }}
                type={type}
                name={fieldKey}
                value={fieldValue as string}
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
          <>
            <div
              className={`${styles.displayValue} ${styles.editable}`}
              onClick={() => handleFieldClick(field)}
            >
              {displayValue || <span className={styles.placeholder}>{placeholder || `Click to add ${label.toLowerCase()}...`}</span>}
            </div>
            {type === 'textarea' && displayValue && (
              <div style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginTop: '4px',
                textAlign: 'right'
              }}>
                {(fieldValue as string).length}/1000 characters
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className={styles.personalInfoForm}>
      <div className={styles.formContent}>
        {/* About - Full Width */}
        <div className={formLayoutStyles.fullWidth}>
          {renderField('bio', 'About: describe your tutoring or teaching style, strengths, and what areas you specialise in', 'textarea', 'I\'m an experienced mathematics tutor with a Master\'s degree and 10 years of teaching expertise. I make math engaging for students from middle school to college, specialising in algebra, calculus, and geometry. My personalised approach builds strong foundations, boosts problem-solving skills, and instills confidence.')}
        </div>

        {/* Status and Academic Qualifications - 2 Column */}
        <div className={formLayoutStyles.twoColumnGrid}>
          {renderField('status', 'Status', 'select', 'Select status', statusOptions)}
          {renderField('academic_qualifications', 'Academic Qualifications', 'multiselect', 'Select qualifications', academicQualificationsOptions)}
        </div>

        {/* Key Stages and Teaching Professional Qualifications - 2 Column */}
        <div className={formLayoutStyles.twoColumnGrid}>
          {renderField('key_stages', 'Key Stages', 'multiselect', 'Select key stage', keyStagesOptions)}
          {renderField('teaching_professional_qualifications', 'Teaching Professional Qualifications', 'multiselect', 'Select qualification', teachingProfessionalQualificationsOptions)}
        </div>

        {/* Subjects and Teaching Experience - 2 Column */}
        <div className={formLayoutStyles.twoColumnGrid}>
          {renderField('subjects', 'Subjects', 'multiselect', 'Mathematics, English', subjectsOptions)}
          {renderField('teaching_experience', 'Teaching Experience', 'select', 'Select experience', teachingExperienceOptions)}
        </div>

        {/* Session Type and Tutoring Experience - 2 Column */}
        <div className={formLayoutStyles.twoColumnGrid}>
          {renderField('session_type', 'Session Type', 'multiselect', 'Select session type', sessionTypeOptions)}
          {renderField('tutoring_experience', 'Tutoring Experience', 'select', 'Select tutoring experience', tutoringExperienceOptions)}
        </div>

        {/* Rates - 2 Column */}
        <div className={formLayoutStyles.twoColumnGrid}>
          {renderField('one_on_one_rate', 'One-on-One Session Rate (per 1 hour session, per student)', 'number', '£50')}
          {renderField('group_session_rate', 'Group Session Rate (per 1 hour session, per student)', 'number', '£25')}
        </div>

        {/* Delivery Mode and DBS Certificate - 2 Column */}
        <div className={formLayoutStyles.twoColumnGrid}>
          {renderField('delivery_mode', 'Delivery Mode', 'multiselect', 'Select delivery mode', deliveryModeOptions)}
          {renderField('dbs_certificate', 'DBS Certificate', 'text', 'John Smith DBS Cert')}
        </div>

        {/* Availability and Unavailability Periods - 2 Column */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '32px' }}>
          {/* Left Column: Availability Period */}
          <div>
            <h3 className={styles.subsectionTitle} style={{ marginBottom: '24px' }}>
              Availability Period
            </h3>

            {/* Availability Type */}
            <div className={wizardStyles.formGroup}>
              <label className={wizardStyles.formLabel}>Availability Periods</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  className={`${wizardStyles.checkboxItem} ${availabilityType === 'recurring' ? wizardStyles.selected : ''}`}
                  onClick={() => setAvailabilityType('recurring')}
                >
                  Recurring
                </button>
                <button
                  type="button"
                  className={`${wizardStyles.checkboxItem} ${availabilityType === 'one-time' ? wizardStyles.selected : ''}`}
                  onClick={() => setAvailabilityType('one-time')}
                >
                  One-time
                </button>
              </div>
            </div>

            {/* Days of Week (only for recurring) */}
            {availabilityType === 'recurring' && (
              <div className={wizardStyles.formGroup}>
                <label className={wizardStyles.formLabel}>Days of Week</label>
                {availErrors.days && (
                  <p className={wizardStyles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                    {availErrors.days}
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day}
                      type="button"
                      className={`${wizardStyles.checkboxItem} ${selectedDays.includes(day) ? wizardStyles.selected : ''}`}
                      onClick={() => toggleDay(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date Pickers */}
            <div className={wizardStyles.formGroup}>
              <div style={{ display: 'grid', gridTemplateColumns: availabilityType === 'recurring' ? '1fr 1fr' : '1fr', gap: '16px' }}>
                <CustomDateInput
                  label="From"
                  value={availFromDate}
                  onChange={setAvailFromDate}
                  error={availErrors.dates}
                  onClearError={() => setAvailErrors(prev => ({ ...prev, dates: undefined }))}
                />
                {availabilityType === 'recurring' && (
                  <CustomDateInput
                    label="To"
                    value={availToDate}
                    onChange={setAvailToDate}
                    onClearError={() => setAvailErrors(prev => ({ ...prev, dates: undefined }))}
                  />
                )}
              </div>
            </div>

            {/* Time Pickers */}
            <div className={wizardStyles.formGroup}>
              {availErrors.times && (
                <p className={wizardStyles.errorText} style={{ marginBottom: '8px' }}>
                  {availErrors.times}
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <CustomTimePicker
                  label="Start time"
                  value={startTime}
                  onChange={setStartTime}
                  onClearError={() => setAvailErrors(prev => ({ ...prev, times: undefined }))}
                />
                <CustomTimePicker
                  label="End time"
                  value={endTime}
                  onChange={setEndTime}
                  onClearError={() => setAvailErrors(prev => ({ ...prev, times: undefined }))}
                />
              </div>
            </div>

            {/* Add Button */}
            <div style={{ marginBottom: '32px' }}>
              <button
                type="button"
                onClick={handleAddAvailability}
                className={wizardStyles.buttonPrimary}
                style={{ width: '100%' }}
              >
                Add
              </button>
            </div>

            {/* Summary Sections */}
            {recurringPeriods.length > 0 && (
              <div className={wizardStyles.formGroup}>
                <label className={wizardStyles.formLabel}>Recurring Availability</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recurringPeriods.map(period => (
                    <div
                      key={period.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border, #dfe1e5)'
                      }}
                    >
                      <span style={{ fontSize: '0.875rem' }}>{formatAvailabilityText(period)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAvailability(period.id)}
                        className={wizardStyles.buttonSecondary}
                        style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {oneTimePeriods.length > 0 && (
              <div className={wizardStyles.formGroup}>
                <label className={wizardStyles.formLabel}>One-time Availability</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {oneTimePeriods.map(period => (
                    <div
                      key={period.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border, #dfe1e5)'
                      }}
                    >
                      <span style={{ fontSize: '0.875rem' }}>{formatAvailabilityText(period)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAvailability(period.id)}
                        className={wizardStyles.buttonSecondary}
                        style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Unavailability Period */}
          <div>
            <h3 className={styles.subsectionTitle} style={{ marginBottom: '24px' }}>
              Unavailability Period
            </h3>

            {/* Date Pickers */}
            <div className={wizardStyles.formGroup}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <CustomDateInput
                  label="From"
                  value={unavailFromDate}
                  onChange={setUnavailFromDate}
                  error={unavailErrors.dates}
                  onClearError={() => setUnavailErrors(prev => ({ ...prev, dates: undefined }))}
                />
                <CustomDateInput
                  label="To"
                  value={unavailToDate}
                  onChange={setUnavailToDate}
                  onClearError={() => setUnavailErrors(prev => ({ ...prev, dates: undefined }))}
                />
              </div>
            </div>

            {/* Add Button */}
            <div style={{ marginBottom: '32px' }}>
              <button
                type="button"
                onClick={handleAddUnavailability}
                className={wizardStyles.buttonPrimary}
                style={{ width: '100%' }}
              >
                Add
              </button>
            </div>

            {/* Summary Section */}
            {unavailabilityPeriods.length > 0 && (
              <div className={wizardStyles.formGroup}>
                <label className={wizardStyles.formLabel}>Unavailable Period</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {unavailabilityPeriods.map(period => (
                    <div
                      key={period.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border, #dfe1e5)'
                      }}
                    >
                      <span style={{ fontSize: '0.875rem' }}>{formatUnavailabilityText(period)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveUnavailability(period.id)}
                        className={wizardStyles.buttonSecondary}
                        style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
