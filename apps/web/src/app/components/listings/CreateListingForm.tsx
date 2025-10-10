'use client';

import CreateListingWizard from './CreateListingWizard';
import type { CreateListingInput } from '@tutorwise/shared-types';

interface CreateListingFormProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<CreateListingInput>;
}

export default function CreateListingForm({
  onSubmit,
  onCancel,
  isSaving = false,
  initialData
}: CreateListingFormProps) {
  return (
    <CreateListingWizard
      onSubmit={onSubmit}
      onCancel={onCancel}
      isSaving={isSaving}
      initialData={initialData}
    />
  );
}
