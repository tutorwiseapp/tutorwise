'use client';

import { useState } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';

interface Step1Props {
  formData: Partial<CreateListingInput>;
  onNext: (data: Partial<CreateListingInput>) => void;
  isFirstStep: boolean;
}

export default function Step1BasicInfo({ formData, onNext }: Step1Props) {
  const [title, setTitle] = useState(formData.title || '');
  const [description, setDescription] = useState(formData.description || '');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  const validate = () => {
    const newErrors: { title?: string; description?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.trim().length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validate()) {
      onNext({ title: title.trim(), description: description.trim() });
    }
  };

  return (
    <div className="text-center">
      {/* Header - matching onboarding style */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Basic Information</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Create a clear title and description for your tutoring service
        </p>
      </div>

      {/* Form Fields - centered, max-width */}
      <div className="max-w-3xl mx-auto space-y-8 text-left">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-2">
            Service Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., GCSE Mathematics Tutor"
            className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            maxLength={200}
          />
          <div className="mt-2 flex justify-between items-center">
            {errors.title ? (
              <p className="text-sm text-red-600">{errors.title}</p>
            ) : (
              <p className="text-xs text-gray-500">Include the subject and education level</p>
            )}
            <span className="text-xs text-gray-400">{title.length}/200</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
            Description <span className="text-red-500">*</span> (minimum 50 characters)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your teaching approach, experience, and what makes your tutoring effective..."
            rows={8}
            className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            maxLength={2000}
          />
          <div className="mt-2 flex justify-between items-center">
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
            <span className="text-xs text-gray-400 ml-auto">{description.length}/2000</span>
          </div>
        </div>
      </div>

      {/* Continue Button - centered, matching onboarding */}
      <div className="mt-12 flex justify-center gap-4">
        <Button
          onClick={handleContinue}
          className="bg-teal-700 hover:bg-teal-800 text-white px-8 py-3 rounded-lg font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
