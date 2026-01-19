/**
 * Filename: FormActionsSection.tsx
 * Purpose: Reusable form action buttons section
 * Usage: All forms (provider and client)
 * Created: 2026-01-19
 */

import Button from '@/app/components/ui/actions/Button';
import styles from './FormSections.module.css';

interface FormActionsSectionProps {
  onSaveDraft: () => void;
  onCancel: () => void;
  onPublish: () => void;
  isSaving?: boolean;
  publishLabel?: string;
  saveDraftLabel?: string;
  cancelLabel?: string;
}

export function FormActionsSection({
  onSaveDraft,
  onCancel,
  onPublish,
  isSaving = false,
  publishLabel = 'Publish Listing',
  saveDraftLabel = 'Save Draft',
  cancelLabel = 'Cancel',
}: FormActionsSectionProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end',
        padding: '1.5rem 0',
        borderTop: '1px solid #e5e7eb',
        marginTop: '2rem',
      }}
    >
      <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
        {cancelLabel}
      </Button>
      <Button variant="outline" onClick={onSaveDraft} disabled={isSaving}>
        {saveDraftLabel}
      </Button>
      <Button variant="primary" onClick={onPublish} disabled={isSaving}>
        {isSaving ? 'Publishing...' : publishLabel}
      </Button>
    </div>
  );
}
