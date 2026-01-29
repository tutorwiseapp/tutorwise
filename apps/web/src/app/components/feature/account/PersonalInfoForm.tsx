'use client';

import { useState, useEffect, useRef } from 'react';
import { format, parse } from 'date-fns';
import type { Profile } from '@/types';
import HubForm from '@/app/components/hub/form/HubForm';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import Button from '@/app/components/ui/actions/Button';
import { useFormConfig } from '@/hooks/useFormConfig';
import styles from './PersonalInfoForm.module.css';
import hubFormStyles from '@/app/components/hub/form/HubForm.module.css';

interface PersonalInfoFormProps {
  profile: Profile;
  onSave: (updatedProfile: Partial<Profile>) => Promise<void>;
}

type EditingField = 'first_name' | 'last_name' | 'gender' | 'date_of_birth' | 'email' | 'phone' |
  'address_line1' | 'town' | 'city' | 'country' | 'postal_code' |
  'emergency_contact_name' | 'emergency_contact_email' | null;

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' }
];

export default function PersonalInfoForm({ profile, onSave }: PersonalInfoFormProps) {
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Refs for auto-focus
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null }>({});

  // Fetch dynamic form config for gender field (with fallback to hardcoded values)
  const { config: genderConfig } = useFormConfig({
    fieldName: 'gender',
    context: 'account',
    fallback: {
      label: 'Gender',
      placeholder: 'Select gender',
      options: genderOptions
    }
  });

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

  const handleSaveField = async (field: EditingField) => {
    if (!field) return;

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

  // Safety button handlers (manual save/cancel)
  const handleSaveAll = async () => {
    if (editingField) {
      await handleSaveField(editingField);
    }
  };

  const handleCancelAll = () => {
    if (editingField) {
      handleCancelField(editingField);
    }
  };

  // Auto-save on blur with 150ms delay (matching OrganisationInfoForm)
  const handleBlur = (field: EditingField) => {
    if (!field) return;
    if (isSaving) return; // Prevent re-triggering while saving

    setTimeout(() => {
      if (editingField !== field) return;

      const currentValue = formData[field as keyof typeof formData];
      const originalValue = (profile as any)[field] || '';

      if (currentValue !== originalValue) {
        handleSaveField(field);
      } else {
        setEditingField(null);
      }
    }, 150);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = async (e: React.KeyboardEvent, field: EditingField) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelField(field);
    } else if (e.key === 'Enter') {
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
    if (!field) return null;

    const fieldKey = field as keyof typeof formData;
    const isEditing = editingField === field;

    // For select fields, always show the dropdown (no click-to-edit) - matches ProfessionalInfoForm
    if (type === 'select') {
      return (
        <HubForm.Field
          label={label}
          isEditing={true}
          onClick={undefined}
        >
          <UnifiedSelect
            ref={(el) => { inputRefs.current[field] = el; }}
            value={formData[fieldKey]}
            onChange={(value) => {
              const event = {
                target: {
                  name: fieldKey,
                  value: String(value)
                }
              } as React.ChangeEvent<HTMLSelectElement>;
              handleChange(event);
            }}
            options={options || []}
            placeholder={placeholder || `Select ${label.toLowerCase()}`}
            disabled={isSaving}
            onBlur={() => handleBlur(field)}
            onKeyDown={(e) => handleKeyDown(e as any, field)}
          />
        </HubForm.Field>
      );
    }

    // For date fields, always show the DatePicker (no click-to-edit) - matches ProfessionalInfoForm
    if (type === 'date') {
      return (
        <HubForm.Field
          label={label}
          isEditing={true}
          onClick={undefined}
        >
          <DatePicker
            selected={selectedDate}
            onSelect={handleDateChange}
          />
        </HubForm.Field>
      );
    }

    // For text inputs (text, email, tel), use click-to-edit pattern
    return (
      <HubForm.Field
        label={label}
        isEditing={isEditing}
        onClick={() => !isEditing && handleFieldClick(field)}
      >
        {isEditing ? (
          <>
            <input
              ref={(el) => { inputRefs.current[field] = el; }}
              className={hubFormStyles.input}
              type={type}
              name={fieldKey}
              value={formData[fieldKey]}
              onChange={handleChange}
              onBlur={() => handleBlur(field)}
              onKeyDown={(e) => handleKeyDown(e, field)}
              placeholder={placeholder}
              disabled={isSaving}
              {...(isSaving && { style: { opacity: 0.6, cursor: 'wait' } })}
            />
            {isSaving && editingField === field && (
              <span className={styles.savingIndicator}>Saving...</span>
            )}
          </>
        ) : (
          <>
            {formData[fieldKey] || <span className={styles.placeholder}>{placeholder || `Click to add ${label.toLowerCase()}...`}</span>}
          </>
        )}
      </HubForm.Field>
    );
  };

  return (
    <HubForm.Root>
      {/* Section 1: Name and Gender */}
      <HubForm.Section>
        <HubForm.Grid>
          {renderField('first_name', 'First Name', 'text', 'Mike')}
          {renderField('last_name', 'Last Name', 'text', 'Quinn')}
          {renderField('gender', genderConfig.label || 'Gender', 'select', genderConfig.placeholder || 'Select gender', genderConfig.options || genderOptions)}
          {renderField('date_of_birth', 'Date of Birth', 'date', '01 October 1990')}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Section 2: Contact Information */}
      <HubForm.Section>
        <HubForm.Grid>
          {renderField('email', 'Email', 'email', 'mikequinn@gmail.com')}
          {renderField('phone', 'Phone', 'tel', '+44 07575 123456')}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Section 3: Address */}
      <HubForm.Section>
        <HubForm.Grid>
          {renderField('address_line1', 'Address', 'text', '100, The Royal Observatory')}
          {renderField('town', 'Town', 'text', 'Greenwich')}
          {renderField('city', 'City', 'text', 'London')}
          {renderField('country', 'Country', 'text', 'United Kingdom')}
          {renderField('postal_code', 'Postcode/Zip Code', 'text', 'SE10 8XJ')}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Section 4: Emergency Contact */}
      <HubForm.Section title="Emergency Contact">
        <HubForm.Grid>
          {renderField('emergency_contact_name', 'Emergency Contact Name', 'text', 'John Doe')}
          {renderField('emergency_contact_email', 'Emergency Contact Email', 'email', 'emergency@example.com')}
        </HubForm.Grid>
      </HubForm.Section>

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleCancelAll}
          disabled={!editingField || isSaving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleSaveAll}
          disabled={!editingField || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </HubForm.Root>
  );
}
