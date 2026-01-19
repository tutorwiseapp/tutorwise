/**
 * Filename: GroupSessionForm.tsx
 * Purpose: Complete group session listing form
 * Usage: Provider (tutor/agent) group-session service type
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
import { GroupSessionFields } from '../types';
import styles from '../shared/FormSections.module.css';

interface GroupSessionFormProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<CreateListingInput>;
}

export default function GroupSessionForm({
  onSubmit,
  onCancel,
  isSaving = false,
  initialData = {},
}: GroupSessionFormProps) {
  // Form state
  const [title, setTitle] = useState(initialData.title || '');
  const [subjects, setSubjects] = useState<string[]>(initialData.subjects || []);
  const [levels, setLevels] = useState<string[]>(initialData.levels || []);
  const [description, setDescription] = useState(initialData.description || '');
  const [sessionDuration, setSessionDuration] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
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
      maxAttendees,
      deliveryMode,
      availability,
      unavailability,
      hourlyRateMin,
      hourlyRateMax,
      images,
    };
    localStorage.setItem('group_session_draft', JSON.stringify(draftData));
  }, [
    title,
    subjects,
    levels,
    description,
    sessionDuration,
    maxAttendees,
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
    if (!maxAttendees || parseInt(maxAttendees) < 2 || parseInt(maxAttendees) > 10) {
      newErrors.maxAttendees = 'Max attendees must be between 2 and 10';
    }
    if (!deliveryMode) {
      newErrors.deliveryMode = 'Please select at least one delivery mode';
    }
    if (availability.length === 0) {
      newErrors.availability = 'Please add at least one availability period';
    }
    if (!hourlyRateMin || parseFloat(hourlyRateMin) <= 0) {
      newErrors.hourlyRateMin = 'Please enter a valid rate per student';
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
      service_type: 'group-session',
      title,
      subjects,
      levels,
      description,
      session_duration: sessionDuration,
      max_attendees: parseInt(maxAttendees),
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
        <h1 className={styles.formTitle}>Create Group Session Service</h1>
        <p className={styles.formSubtitle}>
          Set up your small group tutoring sessions (2-10 students)
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
          titlePlaceholder="E.g., Small Group GCSE Maths Revision Sessions"
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
          placeholder="Describe your group session approach, group dynamics, what students can expect..."
          minLength={50}
          maxLength={1000}
          required={true}
          errors={errors}
        />

        {/* Group Session Fields */}
        <GroupSessionFields
          sessionDuration={sessionDuration}
          maxAttendees={maxAttendees}
          onSessionDurationChange={setSessionDuration}
          onMaxAttendeesChange={setMaxAttendees}
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
          hourlyRateLabel="Rate Per Student Per Hour"
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
