/**
 * Filename: SubjectsSection.tsx
 * Purpose: Reusable subjects multi-select section
 * Usage: Both provider (subjects I teach) and client (subjects needed)
 * Created: 2026-01-19
 */

import { useQuery } from '@tanstack/react-query';
import { fetchFieldsForContext } from '@/lib/api/sharedFields';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
import styles from './FormSections.module.css';

interface SubjectsSectionProps {
  selectedSubjects: string[];
  onSubjectsChange: (subjects: string[]) => void;
  label?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  errors?: Record<string, string>;
}

export function SubjectsSection({
  selectedSubjects,
  onSubjectsChange,
  label = 'Subjects',
  placeholder = 'Select subjects',
  helpText,
  required = true,
  errors = {},
}: SubjectsSectionProps) {
  const { activeRole } = useUserProfile();

  // Determine context based on role
  const listingContext = activeRole === 'tutor'
    ? 'listing.tutor'
    : activeRole === 'agent'
    ? 'listing.agent'
    : 'listing.client';

  // Fetch subject options from shared_fields
  const { data: contextFields = [] } = useQuery({
    queryKey: ['listing-fields', listingContext],
    queryFn: () => fetchFieldsForContext(listingContext),
    enabled: !!activeRole,
  });

  const subjectOptions = getSubjectOptions(contextFields);

  return (
    <div className={styles.formSection}>
      <label className={styles.label}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      <UnifiedMultiSelect
        triggerLabel={formatMultiSelectLabel(selectedSubjects, placeholder)}
        options={subjectOptions}
        selectedValues={selectedSubjects}
        onSelectionChange={onSubjectsChange}
      />
      {errors.subjects && <p className={styles.errorText}>{errors.subjects}</p>}
      {helpText && !errors.subjects && (
        <p className={styles.helperText}>{helpText}</p>
      )}
    </div>
  );
}

// Helper: Extract subject options from shared fields
function getSubjectOptions(fields: any[]) {
  const field = fields.find(f => f.shared_fields?.field_name === 'subjects');
  if (!field?.shared_fields?.options) return [];
  return field.shared_fields.options.map((opt: any) => ({
    value: String(opt.value),
    label: opt.label,
  }));
}
