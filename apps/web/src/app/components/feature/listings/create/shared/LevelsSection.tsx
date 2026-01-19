/**
 * Filename: LevelsSection.tsx
 * Purpose: Reusable education levels multi-select section
 * Usage: Both provider (levels I teach) and client (student's level)
 * Created: 2026-01-19
 */

import { useQuery } from '@tanstack/react-query';
import { fetchFieldsForContext } from '@/lib/api/sharedFields';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
import styles from './FormSections.module.css';

interface LevelsSectionProps {
  selectedLevels: string[];
  onLevelsChange: (levels: string[]) => void;
  label?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  errors?: Record<string, string>;
}

export function LevelsSection({
  selectedLevels,
  onLevelsChange,
  label = 'Education Levels',
  placeholder = 'Select levels',
  helpText,
  required = true,
  errors = {},
}: LevelsSectionProps) {
  const { activeRole } = useUserProfile();

  const listingContext = activeRole === 'tutor'
    ? 'listing.tutor'
    : activeRole === 'agent'
    ? 'listing.agent'
    : 'listing.client';

  const { data: contextFields = [] } = useQuery({
    queryKey: ['listing-fields', listingContext],
    queryFn: () => fetchFieldsForContext(listingContext),
    enabled: !!activeRole,
  });

  const levelOptions = getLevelOptions(contextFields);

  return (
    <div className={styles.formSection}>
      <label className={styles.label}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      <UnifiedMultiSelect
        triggerLabel={formatMultiSelectLabel(selectedLevels, placeholder)}
        options={levelOptions}
        selectedValues={selectedLevels}
        onSelectionChange={onLevelsChange}
      />
      {errors.levels && <p className={styles.errorText}>{errors.levels}</p>}
      {helpText && !errors.levels && (
        <p className={styles.helperText}>{helpText}</p>
      )}
    </div>
  );
}

function getLevelOptions(fields: any[]) {
  const field = fields.find(f => f.shared_fields?.field_name === 'keyStages');
  if (!field?.shared_fields?.options) return [];
  return field.shared_fields.options.map((opt: any) => ({
    value: String(opt.value),
    label: opt.label,
  }));
}
