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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h2>
        <p className="text-gray-600">
          Start by giving your tutoring service a clear title and description that will help students find you.
        </p>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Listing Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., GCSE Maths Tutoring - Exam Preparation Specialist"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          maxLength={200}
        />
        <div className="mt-1 flex justify-between items-center">
          {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
          <span className="text-xs text-gray-500 ml-auto">{title.length}/200</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Tip: Include the subject and level to attract the right students
        </p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your teaching approach, what students will learn, and what makes you a great tutor..."
          rows={8}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          maxLength={2000}
        />
        <div className="mt-1 flex justify-between items-center">
          {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
          <span className="text-xs text-gray-500 ml-auto">{description.length}/2000</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Tip: Mention your teaching style, student outcomes, and any unique qualifications
        </p>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleContinue} className="px-8">
          Continue →
        </Button>
      </div>
    </div>
  );
}
