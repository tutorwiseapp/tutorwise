/**
 * Filename: WorkshopForm.tsx
 * Purpose: Complete workshop listing form
 * Usage: Provider (tutor/agent) workshop service type
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
  FormActionsSection,
} from '../shared';
import {
  BasicInformationSection,
  PricingSection,
  ImagesSection,
} from './index';
import { WorkshopFields } from '../types';
import styles from '../shared/FormSections.module.css';

interface WorkshopFormProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<CreateListingInput>;
}

export default function WorkshopForm({
  onSubmit,
  onCancel,
  isSaving = false,
  initialData = {},
}: WorkshopFormProps) {
  const [title, setTitle] = useState(initialData.title || '');
  const [subjects, setSubjects] = useState<string[]>(initialData.subjects || []);
  const [levels, setLevels] = useState<string[]>(initialData.levels || []);
  const [description, setDescription] = useState(initialData.description || '');
  const [maxAttendees, setMaxAttendees] = useState(initialData.max_attendees?.toString() || '');
  const [eventDate, setEventDate] = useState(initialData.event_date || '');
  const [startTime, setStartTime] = useState(initialData.start_time || '');
  const [endTime, setEndTime] = useState(initialData.end_time || '');
  const [location, setLocation] = useState(initialData.location || '');
  const [deliveryMode, setDeliveryMode] = useState(initialData.delivery_mode || []);
  const [packagePrice, setPackagePrice] = useState(initialData.package_price?.toString() || '');
  const [images, setImages] = useState<string[]>(initialData.images || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem('workshop_draft', JSON.stringify({
      title, subjects, levels, description, maxAttendees, eventDate,
      startTime, endTime, location, deliveryMode, packagePrice, images
    }));
  }, [title, subjects, levels, description, maxAttendees, eventDate, startTime, endTime, location, deliveryMode, packagePrice, images]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim() || title.length < 10) newErrors.title = 'Title must be at least 10 characters';
    if (subjects.length === 0) newErrors.subjects = 'Please select at least one subject';
    if (levels.length === 0) newErrors.levels = 'Please select at least one level';
    if (!description.trim() || description.length < 50) newErrors.description = 'Description must be at least 50 characters';
    if (!maxAttendees || parseInt(maxAttendees) < 10 || parseInt(maxAttendees) > 500) newErrors.maxAttendees = 'Max participants must be between 10 and 500';
    if (!eventDate) newErrors.eventDate = 'Please select an event date';
    if (!startTime) newErrors.startTime = 'Please select a start time';
    if (!endTime) newErrors.endTime = 'Please select an end time';
    if (!location.trim()) newErrors.location = 'Please enter a location';
    if (deliveryMode.length === 0) newErrors.deliveryMode = 'Please select at least one delivery mode';
    if (!packagePrice || parseFloat(packagePrice) <= 0) newErrors.packagePrice = 'Please enter a valid workshop price';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePublish = () => {
    if (!validateForm()) {
      document.querySelector(`.${styles.inputError}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    onSubmit({
      listing_type: 'service',
      service_type: 'workshop',
      title,
      subjects,
      levels,
      description,
      max_attendees: parseInt(maxAttendees),
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      location,
      delivery_mode: deliveryMode,
      package_price: parseFloat(packagePrice),
      images,
      status: 'published',
    } as any);
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h1 className={styles.formTitle}>Create Workshop Event</h1>
        <p className={styles.formSubtitle}>Set up your educational workshop or seminar</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handlePublish(); }}>
        <BasicInformationSection title={title} onTitleChange={setTitle} showHeadline={false} showBio={false}
          titleLabel="Workshop Title" titlePlaceholder="E.g., GCSE Maths Intensive Revision Workshop" errors={errors} />

        <div className={styles.twoColumnLayout}>
          <SubjectsSection selectedSubjects={subjects} onSubjectsChange={setSubjects} label="Topics Covered"
            placeholder="Select subjects" required={true} errors={errors} />
          <LevelsSection selectedLevels={levels} onLevelsChange={setLevels} label="Target Audience Levels"
            placeholder="Select levels" required={true} errors={errors} />
        </div>

        <DescriptionSection description={description} onDescriptionChange={setDescription} label="Workshop Description"
          placeholder="Describe what participants will learn, the workshop format, materials provided..." minLength={50} maxLength={1000} required={true} errors={errors} />

        <WorkshopFields maxAttendees={maxAttendees} eventDate={eventDate} startTime={startTime} endTime={endTime} location={location}
          onMaxAttendeesChange={setMaxAttendees} onEventDateChange={setEventDate} onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime} onLocationChange={setLocation} required={true} errors={errors} />

        <PricingSection packagePrice={packagePrice} onPackagePriceChange={setPackagePrice} showHourlyRate={false}
          showPackagePricing={true} packagePriceLabel="Workshop Price" required={true} errors={errors} packageSessions="" onPackageSessionsChange={() => {}} />

        <DeliveryModeSection deliveryMode={deliveryMode} onDeliveryModeChange={setDeliveryMode} label="Workshop Format" required={true} errors={errors} />

        <ImagesSection images={images} onImagesChange={setImages} label="Workshop Images" helpText="Add photos to showcase your workshop"
          required={false} errors={errors} />

        <FormActionsSection onSaveDraft={() => alert('Draft saved!')} onCancel={onCancel} onPublish={handlePublish} isSaving={isSaving} publishLabel="Publish Workshop" />
      </form>
    </div>
  );
}
