'use client';

import { useState } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';

interface Step2Props {
  formData: Partial<CreateListingInput>;
  onNext: (data: Partial<CreateListingInput>) => void;
  onBack: () => void;
  isFirstStep: boolean;
}

const SUBJECTS = [
  'Mathematics',
  'English',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Geography',
  'Computer Science',
  'Economics',
  'Business Studies',
  'Psychology',
  'Sociology',
  'Art',
  'Music',
  'Drama',
  'Physical Education',
  'Religious Studies',
  'Modern Foreign Languages',
  'Other'
];

const KEY_STAGES = [
  { value: 'Primary (KS1 & KS2)', label: 'Primary Education (KS1 & KS2) - Age 5 to 11' },
  { value: 'KS3', label: 'Secondary (KS3) - Age 11 to 14' },
  { value: 'GCSE', label: 'GCSE / KS4 - Age 14 to 16' },
  { value: 'A-Level', label: 'A-Level - Age 16 to 18' },
  { value: 'IB', label: 'International Baccalaureate (IB)' },
  { value: 'Undergraduate', label: 'University/Undergraduate' },
  { value: 'Postgraduate', label: 'Postgraduate' },
  { value: 'Adult Learning', label: 'Adult Learning' },
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Mandarin',
  'Arabic',
  'Italian',
  'Portuguese',
  'Russian',
  'Japanese',
  'Korean',
  'Other'
];

export default function Step2TeachingDetails({ formData, onNext, onBack }: Step2Props) {
  const [subjects, setSubjects] = useState<string[]>(formData.subjects || []);
  const [levels, setLevels] = useState<string[]>(formData.levels || []);
  const [languages, setLanguages] = useState<string[]>(formData.languages || ['English']);
  const [errors, setErrors] = useState<{ subjects?: string; levels?: string }>({});

  const toggleSubject = (subject: string) => {
    setSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const toggleLevel = (level: string) => {
    setLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const toggleLanguage = (language: string) => {
    setLanguages(prev =>
      prev.includes(language) ? prev.filter(l => l !== language) : [...prev, language]
    );
  };

  const validate = () => {
    const newErrors: { subjects?: string; levels?: string } = {};

    if (subjects.length === 0) {
      newErrors.subjects = 'Please select at least one subject';
    }

    if (levels.length === 0) {
      newErrors.levels = 'Please select at least one key stage/level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validate()) {
      onNext({ subjects, levels, languages });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Teaching Details</h2>
        <p className="text-gray-600">
          Select the subjects and levels you teach. This helps students find the right tutor.
        </p>
      </div>

      {/* Subjects */}
      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-3">
          Subjects <span className="text-red-500">*</span>
        </label>
        {errors.subjects && (
          <p className="mb-2 text-sm text-red-600">{errors.subjects}</p>
        )}
        <p className="text-sm text-gray-600 mb-4">
          Select all subjects you teach (you can offer different rates for different subjects later)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SUBJECTS.map((subject) => (
            <label
              key={subject}
              className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                subjects.includes(subject)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={subjects.includes(subject)}
                onChange={() => toggleSubject(subject)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-900">{subject}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Key Stages/Levels */}
      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-3">
          Key Stages / Education Levels <span className="text-red-500">*</span>
        </label>
        {errors.levels && (
          <p className="mb-2 text-sm text-red-600">{errors.levels}</p>
        )}
        <p className="text-sm text-gray-600 mb-4">
          Which levels do you teach?
        </p>
        <div className="space-y-2">
          {KEY_STAGES.map((stage) => (
            <label
              key={stage.value}
              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                levels.includes(stage.value)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={levels.includes(stage.value)}
                onChange={() => toggleLevel(stage.value)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-900">{stage.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-3">
          Languages Spoken
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Which languages can you teach in?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {LANGUAGES.map((language) => (
            <label
              key={language}
              className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                languages.includes(language)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={languages.includes(language)}
                onChange={() => toggleLanguage(language)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-900">{language}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <Button onClick={handleContinue}>
          Continue →
        </Button>
      </div>
    </div>
  );
}
