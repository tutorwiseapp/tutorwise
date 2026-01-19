/**
 * Filename: OneToOneForm.tsx
 * Purpose: Complete one-to-one tutoring service listing form
 * Usage: Provider (tutor/agent) one-to-one service type
 * Created: 2026-01-19
 */

'use client';

import { useState, useEffect } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import {
  SubjectsSection,
  LevelsSection,
  DescriptionSection,
  DeliveryModeSection,
  AvailabilitySection,
  FormActionsSection,
} from '../shared';
import {
  BasicInformationSection,
  PricingSection,
  ImagesSection,
} from './index';
import { OneToOneFields } from '../types';
import styles from '../shared/FormSections.module.css';

interface OneToOneFormProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<CreateListingInput>;
}

export default function OneToOneForm({
  onSubmit,
  onCancel,
  isSaving = false,
  initialData = {},
}: OneToOneFormProps) {
  // Form state
  const [title, setTitle] = useState(initialData.title || '');
  const [subjects, setSubjects] = useState<string[]>(initialData.subjects || []);
  const [levels, setLevels] = useState<string[]>(initialData.levels || []);
  const [description, setDescription] = useState(initialData.description || '');
  const [sessionDuration, setSessionDuration] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('');
  const [availability, setAvailability] = useState(initialData.availability || []);
  const [unavailability, setUnavailability] = useState<any[]>([]);
  const [hourlyRateMin, setHourlyRateMin] = useState(
    initialData.hourly_rate_min?.toString() || ''
  );
  const [hourlyRateMax, setHourlyRateMax] = useState(
    initialData.hourly_rate_max?.toString() || ''
  );
  const [images, setImages] = useState<string[]>(initialData.images || []);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-save draft to localStorage
  useEffect(() => {
    const draftData = {
      title,
      subjects,
      levels,
      description,
      sessionDuration,
      deliveryMode,
      availability,
      unavailability,
      hourlyRateMin,
      hourlyRateMax,
      images,
    };
    localStorage.setItem('one_to_one_draft', JSON.stringify(draftData));
  }, [
    title,
    subjects,
    levels,
    description,
    sessionDuration,
    deliveryMode,
    availability,
    unavailability,
    hourlyRateMin,
    hourlyRateMax,
    images,
  ]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim() || title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }
    if (subjects.length === 0) {
      newErrors.subjects = 'Please select at least one subject';
    }
    if (levels.length === 0) {
      newErrors.levels = 'Please select at least one level';
    }
    if (!description.trim() || description.length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }
    if (!sessionDuration) {
      newErrors.sessionDuration = 'Please select a session duration';
    }
    if (!deliveryMode) {
      newErrors.deliveryMode = 'Please select at least one delivery mode';
    }
    if (availability.length === 0) {
      newErrors.availability = 'Please add at least one availability period';
    }
    if (!hourlyRateMin || parseFloat(hourlyRateMin) <= 0) {
      newErrors.hourlyRateMin = 'Please enter a valid hourly rate';
    }
    if (hourlyRateMax && parseFloat(hourlyRateMax) < parseFloat(hourlyRateMin)) {
      newErrors.hourlyRateMax = 'Maximum rate must be greater than minimum rate';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle publish
  const handlePublish = () => {
    if (!validateForm()) {
      const firstErrorElement = document.querySelector(`.${styles.inputError}`);
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const formData: any = {
      listing_type: 'service',
      service_type: 'one-to-one',
      title,
      subjects,
      levels,
      description,
      session_duration: sessionDuration,
      delivery_mode: deliveryMode,
      availability,
      unavailability,
      hourly_rate_min: parseFloat(hourlyRateMin),
      hourly_rate_max: hourlyRateMax ? parseFloat(hourlyRateMax) : undefined,
      images,
      status: 'published',
    };

    onSubmit(formData);
  };

  // Handle save draft
  const handleSaveDraft = () => {
    alert('Draft saved successfully!');
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h1 className={styles.formTitle}>Create One-to-One Tutoring Service</h1>
        <p className={styles.formSubtitle}>
          Set up your personalized one-to-one tutoring service
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handlePublish();
        }}
      >
        {/* Basic Information */}
        <BasicInformationSection
          title={title}
          onTitleChange={setTitle}
          showHeadline={false}
          showBio={false}
          titleLabel="Service Title"
          titlePlaceholder="E.g., Expert GCSE Maths Tutor - Build Confidence & Achieve A*"
          errors={errors}
        />

        {/* Subjects & Levels */}
        <div className={styles.twoColumnLayout}>
          <SubjectsSection
            selectedSubjects={subjects}
            onSubjectsChange={setSubjects}
            label="Subjects You Teach"
            placeholder="Select subjects"
            required={true}
            errors={errors}
          />

          <LevelsSection
            selectedLevels={levels}
            onLevelsChange={setLevels}
            label="Education Levels"
            placeholder="Select levels"
            required={true}
            errors={errors}
          />
        </div>

        {/* Description */}
        <DescriptionSection
          description={description}
          onDescriptionChange={setDescription}
          label="Service Description"
          placeholder="Describe your teaching approach, what makes you unique, what students can expect..."
          minLength={50}
          maxLength={1000}
          required={true}
          errors={errors}
        />

        {/* Session Duration */}
        <OneToOneFields
          sessionDuration={sessionDuration}
          onSessionDurationChange={setSessionDuration}
          required={true}
          errors={errors}
        />

        {/* Pricing */}
        <PricingSection
          hourlyRateMin={hourlyRateMin}
          hourlyRateMax={hourlyRateMax}
          onHourlyRateMinChange={setHourlyRateMin}
          onHourlyRateMaxChange={setHourlyRateMax}
          showHourlyRate={true}
          showPackagePricing={false}
          hourlyRateLabel="Hourly Rate"
          required={true}
          errors={errors}
        />

        {/* Delivery Mode */}
        <DeliveryModeSection
          deliveryMode={deliveryMode}
          onDeliveryModeChange={setDeliveryMode}
          label="How Will You Deliver Sessions?"
          required={true}
          errors={errors}
        />

        {/* Availability */}
        <AvailabilitySection
          availability={availability}
          unavailability={unavailability}
          onAvailabilityChange={setAvailability}
          onUnavailabilityChange={setUnavailability}
          showUnavailability={true}
          errors={errors}
        />

        {/* Images */}
        <ImagesSection
          images={images}
          onImagesChange={setImages}
          label="Service Images"
          helpText="Add photos to make your listing stand out"
          required={false}
          errors={errors}
        />

        {/* Form Actions */}
        <FormActionsSection
          onSaveDraft={handleSaveDraft}
          onCancel={onCancel}
          onPublish={handlePublish}
          isSaving={isSaving}
          publishLabel="Publish Listing"
        />
      </form>
    </div>
  );
}
