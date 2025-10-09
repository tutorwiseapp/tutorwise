'use client';

/**
 * CreateListingForm - MINIMAL STUB
 * 
 * This is a temporary placeholder to unblock builds.
 * The full listing creation feature requires additional work.
 */

import type { CreateListingInput } from '@tutorwise/shared-types';

interface CreateListingFormProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function CreateListingForm({ onSubmit, onCancel, isSaving = false }: CreateListingFormProps) {
  return (
    <div className="space-y-6 p-6">
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          Feature In Development
        </h3>
        <p className="text-yellow-800 mb-4">
          The listing creation form is currently being developed.
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
