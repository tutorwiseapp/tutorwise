'use client';

import { useState } from 'react';
import { z } from 'zod';
import type { CreateListingInput, LocationType } from '@tutorwise/shared-types';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Textarea from '@/app/components/ui/form/Textarea';
import Select from '@/app/components/ui/form/Select';
import Button from '@/app/components/ui/Button';
import Chip from '@/app/components/ui/Chip';

// Validation schema
const listingSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters').max(2000, 'Description must be less than 2000 characters'),
  subjects: z.array(z.string()).min(1, 'Select at least one subject'),
  levels: z.array(z.string()).min(1, 'Select at least one level'),
  location_type: z.enum(['online', 'in_person', 'hybrid']),
  hourly_rate: z.number().min(0).optional(),
});

interface CreateListingFormProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'English', 'Spanish', 'French', 'German',
  'History', 'Geography', 'Computer Science', 'Art',
  'Music', 'Economics', 'Business Studies', 'Psychology'
];

const LEVELS = [
  'Primary (KS1-2)', 'Secondary (KS3)', 'GCSE', 'A-Level',
  'IB', 'University', 'Adult Learning', 'Professional'
];

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Mandarin',
  'Arabic', 'Hindi', 'Portuguese', 'Italian', 'Japanese'
];

export default function CreateListingForm({ onSubmit, onCancel, isSaving = false }: CreateListingFormProps) {
  // Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Teaching Details
  const [subjects, setSubjects] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['English']);

  // Pricing
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [freeTrial, setFreeTrial] = useState(false);
  const [trialDuration, setTrialDuration] = useState<string>('30');

  // Location
  const [locationType, setLocationType] = useState<LocationType>('online');
  const [locationCity, setLocationCity] = useState('');
  const [locationPostcode, setLocationPostcode] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleSubject = (subject: string) => {
    setSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const toggleLevel = (level: string) => {
    setLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const toggleLanguage = (language: string) => {
    setLanguages(prev =>
      prev.includes(language)
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  const handleSubmit = (e: React.FormEvent, asDraft: boolean = false) => {
    e.preventDefault();
    setErrors({});

    const formData: CreateListingInput = {
      title,
      description,
      subjects,
      levels,
      languages,
      location_type: locationType,
      location_city: locationCity || undefined,
      location_postcode: locationPostcode || undefined,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      free_trial: freeTrial,
      trial_duration_minutes: freeTrial && trialDuration ? parseInt(trialDuration) : undefined,
      status: asDraft ? 'draft' : 'published',
    };

    try {
      listingSchema.parse(formData);
      onSubmit(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  return (
    <form className="space-y-6">
      {/* Basic Info */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

        <FormGroup label="Listing Title" required error={errors.title}>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Experienced Maths Tutor - GCSE & A-Level Specialist"
            maxLength={200}
          />
          <p className="text-sm text-gray-500 mt-1">{title.length}/200 characters</p>
        </FormGroup>

        <FormGroup label="Description" required error={errors.description}>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your teaching experience, qualifications, teaching style, and what makes you unique..."
            rows={8}
            maxLength={2000}
          />
          <p className="text-sm text-gray-500 mt-1">{description.length}/2000 characters</p>
        </FormGroup>
      </div>

      {/* Teaching Details */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">What You Teach</h2>

        <FormGroup label="Subjects" required error={errors.subjects}>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map(subject => (
              <Chip
                key={subject}
                label={subject}
                selected={subjects.includes(subject)}
                onClick={() => toggleSubject(subject)}
              />
            ))}
          </div>
        </FormGroup>

        <FormGroup label="Education Levels" required error={errors.levels}>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map(level => (
              <Chip
                key={level}
                label={level}
                selected={levels.includes(level)}
                onClick={() => toggleLevel(level)}
              />
            ))}
          </div>
        </FormGroup>

        <FormGroup label="Languages You Teach In">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(language => (
              <Chip
                key={language}
                label={language}
                selected={languages.includes(language)}
                onClick={() => toggleLanguage(language)}
              />
            ))}
          </div>
        </FormGroup>
      </div>

      {/* Pricing */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Pricing</h2>

        <FormGroup label="Hourly Rate (£)" error={errors.hourly_rate}>
          <Input
            id="hourly_rate"
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="e.g., 35"
            min="0"
            step="0.01"
          />
          <p className="text-sm text-gray-500 mt-1">Leave blank if you prefer to discuss pricing with students</p>
        </FormGroup>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="free_trial"
            checked={freeTrial}
            onChange={(e) => setFreeTrial(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="free_trial" className="text-sm text-gray-700">
            Offer a free trial lesson
          </label>
        </div>

        {freeTrial && (
          <FormGroup label="Trial Duration (minutes)">
            <Select
              id="trial_duration"
              value={trialDuration}
              onChange={(e) => setTrialDuration(e.target.value)}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </Select>
          </FormGroup>
        )}
      </div>

      {/* Location */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Location & Availability</h2>

        <FormGroup label="Teaching Location" required error={errors.location_type}>
          <Select
            id="location_type"
            value={locationType}
            onChange={(e) => setLocationType(e.target.value as LocationType)}
          >
            <option value="online">Online Only</option>
            <option value="in_person">In-Person Only</option>
            <option value="hybrid">Both Online & In-Person</option>
          </Select>
        </FormGroup>

        {(locationType === 'in_person' || locationType === 'hybrid') && (
          <>
            <FormGroup label="City">
              <Input
                id="location_city"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="e.g., London"
              />
            </FormGroup>

            <FormGroup label="Postcode">
              <Input
                id="location_postcode"
                value={locationPostcode}
                onChange={(e) => setLocationPostcode(e.target.value)}
                placeholder="e.g., SW1A 1AA"
              />
            </FormGroup>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          variant="secondary"
          disabled={isSaving}
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          onClick={(e) => handleSubmit(e, false)}
          disabled={isSaving}
        >
          {isSaving ? 'Publishing...' : 'Publish Listing'}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          disabled={isSaving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
