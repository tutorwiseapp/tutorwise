/**
 * Filename: ClientRequestForm.tsx
 * Purpose: Complete client request listing form
 * Usage: Client role only - for creating tutoring service requests
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
  LearnerTypeSection,
  BudgetSection,
  TutorPreferencesSection,
  LearningGoalsSection,
  SpecialRequirementsSection,
} from './index';
import styles from '../shared/FormSections.module.css';

interface ClientRequestFormProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<CreateListingInput>;
}

export default function ClientRequestForm({
  onSubmit,
  onCancel,
  isSaving = false,
  initialData = {},
}: ClientRequestFormProps) {
  // Form state
  const [learnerType, setLearnerType] = useState('');
  const [subjects, setSubjects] = useState<string[]>(initialData.subjects || []);
  const [levels, setLevels] = useState<string[]>(initialData.levels || []);
  const [description, setDescription] = useState(initialData.description || '');
  const [learningGoals, setLearningGoals] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('');
  const [availability, setAvailability] = useState(initialData.availability || []);
  const [unavailability, setUnavailability] = useState<any[]>([]);
  const [oneToOneBudget, setOneToOneBudget] = useState(
    initialData.hourly_rate_min?.toString() || ''
  );
  const [groupBudget, setGroupBudget] = useState(initialData.hourly_rate_max?.toString() || '');
  const [preferredQualifications, setPreferredQualifications] = useState<string[]>([]);
  const [preferredCredentials, setPreferredCredentials] = useState<string[]>([]);
  const [preferredTeachingExp, setPreferredTeachingExp] = useState('');
  const [preferredTutorExp, setPreferredTutorExp] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-save draft to localStorage
  useEffect(() => {
    const draftData = {
      learnerType,
      subjects,
      levels,
      description,
      learningGoals,
      specialRequirements,
      deliveryMode,
      availability,
      unavailability,
      oneToOneBudget,
      groupBudget,
      preferredQualifications,
      preferredCredentials,
      preferredTeachingExp,
      preferredTutorExp,
    };
    localStorage.setItem('client_request_draft', JSON.stringify(draftData));
  }, [
    learnerType,
    subjects,
    levels,
    description,
    learningGoals,
    specialRequirements,
    deliveryMode,
    availability,
    unavailability,
    oneToOneBudget,
    groupBudget,
    preferredQualifications,
    preferredCredentials,
    preferredTeachingExp,
    preferredTutorExp,
  ]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!learnerType) {
      newErrors.learnerType = 'Please select who needs tutoring';
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
    if (!learningGoals.trim()) {
      newErrors.learningGoals = 'Please describe your learning goals';
    }
    if (!deliveryMode) {
      newErrors.deliveryMode = 'Please select a delivery mode';
    }
    if (availability.length === 0) {
      newErrors.availability = 'Please add at least one availability period';
    }
    if (!oneToOneBudget || parseFloat(oneToOneBudget) <= 0) {
      newErrors.oneToOneBudget = 'Please enter a valid budget';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle publish
  const handlePublish = () => {
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorElement = document.querySelector(`.${styles.inputError}`);
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const formData: any = {
      listing_type: 'request',
      title: `Tutoring Request: ${subjects.join(', ')}`,
      subjects,
      levels,
      description,
      location_type: deliveryMode as any,
      availability,
      hourly_rate_min: parseFloat(oneToOneBudget),
      hourly_rate_max: groupBudget ? parseFloat(groupBudget) : undefined,
      // Client-specific fields
      learner_type: learnerType,
      learning_goals: learningGoals,
      special_requirements: specialRequirements,
      delivery_mode: deliveryMode,
      unavailability,
      preferred_qualifications: preferredQualifications,
      preferred_credentials: preferredCredentials,
      preferred_teaching_exp: preferredTeachingExp,
      preferred_tutor_exp: preferredTutorExp,
    };

    onSubmit(formData);
  };

  // Handle save draft
  const handleSaveDraft = () => {
    // Draft is already auto-saved to localStorage
    // Could add toast notification here
    alert('Draft saved successfully!');
  };

  return (
    <div className={styles.formContainer}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handlePublish();
        }}
      >
        {/* Who Needs Tutoring */}
        <LearnerTypeSection
          learnerType={learnerType}
          onLearnerTypeChange={setLearnerType}
          required={true}
          errors={errors}
        />

        {/* Subjects & Levels */}
        <div className={styles.twoColumnLayout}>
          <SubjectsSection
            selectedSubjects={subjects}
            onSubjectsChange={setSubjects}
            label="Subjects Needed"
            placeholder="Select subjects"
            helpText="Choose all subjects you need help with"
            required={true}
            errors={errors}
          />

          <LevelsSection
            selectedLevels={levels}
            onLevelsChange={setLevels}
            label="Education Levels"
            placeholder="Select levels"
            helpText="Choose the student's current or target level"
            required={true}
            errors={errors}
          />
        </div>

        {/* Budget */}
        <BudgetSection
          oneToOneBudget={oneToOneBudget}
          groupBudget={groupBudget}
          onOneToOneBudgetChange={setOneToOneBudget}
          onGroupBudgetChange={setGroupBudget}
          showGroupBudget={true}
          required={true}
          errors={errors}
        />

        {/* Description */}
        <DescriptionSection
          description={description}
          onDescriptionChange={setDescription}
          label="Describe Your Tutoring Needs"
          placeholder="Tell us about the student, their current situation, what challenges they're facing, and what kind of support would be most helpful..."
          helpText="Be specific about what you're looking for to help tutors understand your needs"
          minLength={50}
          maxLength={1000}
          required={true}
          errors={errors}
        />

        {/* Learning Goals */}
        <LearningGoalsSection
          learningGoals={learningGoals}
          onLearningGoalsChange={setLearningGoals}
          maxLength={500}
          errors={errors}
        />

        {/* Special Requirements */}
        <SpecialRequirementsSection
          specialRequirements={specialRequirements}
          onSpecialRequirementsChange={setSpecialRequirements}
          maxLength={500}
          errors={errors}
        />

        {/* Tutor Preferences */}
        <TutorPreferencesSection
          preferredQualifications={preferredQualifications}
          preferredCredentials={preferredCredentials}
          preferredTeachingExp={preferredTeachingExp}
          preferredTutorExp={preferredTutorExp}
          onPreferredQualificationsChange={setPreferredQualifications}
          onPreferredCredentialsChange={setPreferredCredentials}
          onPreferredTeachingExpChange={setPreferredTeachingExp}
          onPreferredTutorExpChange={setPreferredTutorExp}
          errors={errors}
        />

        {/* Delivery Mode */}
        <DeliveryModeSection
          deliveryMode={deliveryMode}
          onDeliveryModeChange={setDeliveryMode}
          label="Preferred Session Format"
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

        {/* Form Actions */}
        <FormActionsSection
          onSaveDraft={handleSaveDraft}
          onCancel={onCancel}
          onPublish={handlePublish}
          isSaving={isSaving}
          publishLabel="Publish Request"
          saveDraftLabel="Save Draft"
          cancelLabel="Cancel"
        />
      </form>
    </div>
  );
}
