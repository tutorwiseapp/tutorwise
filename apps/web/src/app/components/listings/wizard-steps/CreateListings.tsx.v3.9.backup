'use client';

import { useState, useEffect, useRef } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import type { CreateListingInput } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';
import ImageUpload, { type ImageUploadRef } from '@/app/components/listings/ImageUpload';
import MultiSelectDropdown from '@/app/components/ui/form/MultiSelectDropdown';
import toast from 'react-hot-toast';
import styles from './CreateListings.module.css';

interface CreateListingsProps {
  formData: Partial<CreateListingInput>;
  onSubmit: (data: Partial<CreateListingInput>) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  isSaving?: boolean;
}

// Comprehensive subject options
const SUBJECT_OPTIONS = [
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'English', label: 'English' },
  { value: 'Science', label: 'Science' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Biology', label: 'Biology' },
  { value: 'History', label: 'History' },
  { value: 'Geography', label: 'Geography' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Languages', label: 'Languages' },
  { value: 'French', label: 'French' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'German', label: 'German' },
  { value: 'Art & Design', label: 'Art & Design' },
  { value: 'Music', label: 'Music' },
  { value: 'Business Studies', label: 'Business Studies' },
  { value: 'Economics', label: 'Economics' }
];

// Level/Key Stage options
const LEVEL_OPTIONS = [
  { value: 'Primary (KS1-KS2)', label: 'Primary (KS1-KS2) - Age 5-11' },
  { value: 'Secondary (KS3)', label: 'Secondary (KS3) - Age 11-14' },
  { value: 'GCSE (KS4)', label: 'GCSE (KS4) - Age 14-16' },
  { value: 'A-Level', label: 'A-Level - Age 16-18' },
  { value: 'University', label: 'University/Adult' },
  { value: 'Professional', label: 'Professional Development' }
];

// Predefined AI tools list
const AI_TOOLS_OPTIONS = [
  { value: 'ChatGPT', label: 'ChatGPT' },
  { value: 'Claude', label: 'Claude' },
  { value: 'Grammarly', label: 'Grammarly' },
  { value: 'Khan Academy', label: 'Khan Academy' },
  { value: 'Quizlet', label: 'Quizlet' },
  { value: 'Duolingo', label: 'Duolingo' },
  { value: 'Photomath', label: 'Photomath' },
  { value: 'Socratic', label: 'Socratic' },
  { value: 'Other', label: 'Other' }
];

// Duration options in minutes
const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' }
];

// Listing type options
const LISTING_TYPE_OPTIONS = [
  { value: 'One-on-One Session', label: 'One-on-One Session', disabled: false },
  { value: 'Group Session', label: 'Group Session', disabled: true },
  { value: 'Workshop/Webinar', label: 'Workshop/Webinar', disabled: true },
  { value: 'Learning Package', label: 'Learning Package', disabled: true }
];

// Delivery modes
const DELIVERY_MODES = [
  { value: 'online', label: 'Online' },
  { value: 'in-person', label: 'In-Person' },
  { value: 'hybrid', label: 'Hybrid (Online & In-Person)' }
];

export default function CreateListings({
  formData,
  onSubmit,
  onCancel,
  onSaveDraft,
  isSaving = false
}: CreateListingsProps) {
  const { profile, activeRole, isLoading: isProfileLoading } = useUserProfile();
  const imageUploadRef = useRef<ImageUploadRef>(null);

  // Form state
  const [listingType, setListingType] = useState('One-on-One Session');
  const [title, setTitle] = useState(formData.title || '');
  const [description, setDescription] = useState(formData.description || '');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(formData.subjects || []);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(formData.levels || []);
  const [hourlyRate, setHourlyRate] = useState(formData.hourly_rate?.toString() || '');
  const [deliveryMode, setDeliveryMode] = useState(formData.location_type || 'online');
  const [locationDetails, setLocationDetails] = useState(formData.location_details || '');
  const [freeTrial, setFreeTrial] = useState(formData.free_trial || false);
  const [instantBooking, setInstantBooking] = useState(formData.instant_booking_enabled || false);
  const [selectedAITools, setSelectedAITools] = useState<string[]>(formData.ai_tools_used || []);
  const [cancellationPolicy, setCancellationPolicy] = useState(formData.cancellation_policy || '');
  const [selectedDurations, setSelectedDurations] = useState<number[]>(formData.duration_options || [60]);
  const [imageUrls, setImageUrls] = useState<string[]>(formData.images || []);
  const [isUploading, setIsUploading] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Profile data - role-aware (for pre-filling only)
  useEffect(() => {
    if (!profile || selectedSubjects.length > 0) return; // Don't override user selections

    let profileSubjects: string[] = [];
    let profileLevels: string[] = [];
    let profileRate: number | null = null;
    let profileDeliveryMode: string | null = null;

    if (profile.professional_details) {
      if (activeRole === 'tutor' && profile.professional_details.tutor) {
        profileSubjects = profile.professional_details.tutor.subjects || [];
        profileLevels = (profile.professional_details.tutor as any)?.key_stages || [];
        profileRate = (profile.professional_details.tutor as any)?.one_on_one_rate || null;
        profileDeliveryMode = (profile.professional_details.tutor as any)?.delivery_mode || null;
      } else if (activeRole === 'agent' && profile.professional_details.agent) {
        profileSubjects = profile.professional_details.agent.subject_specializations || [];
      } else if (activeRole === 'client' && profile.professional_details.client) {
        profileSubjects = profile.professional_details.client.subjects || [];
      }
    }

    // Pre-fill from profile if available
    if (profileSubjects.length > 0) setSelectedSubjects(profileSubjects);
    if (profileLevels.length > 0) setSelectedLevels(profileLevels);
    if (profileRate && !formData.hourly_rate) setHourlyRate(profileRate.toString());
    if (profileDeliveryMode && !formData.location_type) {
      setDeliveryMode(profileDeliveryMode as 'online' | 'hybrid' | 'in_person');
    }
  }, [profile, activeRole]);

  const handleUploadComplete = (urls: string[]) => {
    setImageUrls(urls);
  };

  // Handler for duration dropdown
  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    if (value && !selectedDurations.includes(value)) {
      setSelectedDurations(prev => [...prev, value]);
    }
  };

  const removeDuration = (duration: number) => {
    setSelectedDurations(prev => prev.filter(d => d !== duration));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Service title is required';
    } else if (title.trim().length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.trim().length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }

    if (selectedSubjects.length === 0) {
      newErrors.subjects = 'Please select at least one subject from your profile';
    }

    if (selectedLevels.length === 0) {
      newErrors.levels = 'Please select at least one level from your profile';
    }

    if (!hourlyRate || parseFloat(hourlyRate) <= 0) {
      newErrors.hourlyRate = 'Please enter a valid hourly rate';
    }

    if (selectedDurations.length === 0) {
      newErrors.durations = 'Please select at least one session duration';
    }

    if (deliveryMode !== 'online' && !locationDetails.trim()) {
      newErrors.locationDetails = 'Please provide location details for in-person/hybrid sessions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    // Handle image upload if there are unuploaded files
    let finalImages = imageUrls;
    if (imageUploadRef.current?.hasUnuploadedFiles()) {
      setIsUploading(true);
      toast('Uploading images...');

      try {
        const uploadedUrls = await imageUploadRef.current.uploadImages();
        const profilePicture = profile?.avatar_url;
        finalImages = profilePicture
          ? [profilePicture, ...uploadedUrls.filter(url => url !== profilePicture)]
          : uploadedUrls;
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload images. Please try again.');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const listingData: Partial<CreateListingInput> = {
      listing_type: `Tutor: ${listingType}`,
      title: title.trim(),
      description: description.trim(),
      subjects: selectedSubjects,
      levels: selectedLevels,
      hourly_rate: parseFloat(hourlyRate),
      location_type: deliveryMode,
      location_details: locationDetails.trim() || undefined,
      free_trial: freeTrial,
      instant_booking_enabled: instantBooking,
      ai_tools_used: selectedAITools.length > 0 ? selectedAITools : undefined,
      cancellation_policy: cancellationPolicy.trim() || undefined,
      duration_options: selectedDurations,
      images: finalImages,
      full_name: profile?.full_name || '',
      currency: 'GBP',
      location_country: 'United Kingdom',
      timezone: 'Europe/London'
    };

    onSubmit(listingData);
  };

  if (isProfileLoading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Loading your profile...</p>
      </div>
    );
  }

  // Profile loading or not exists - show minimal check
  if (!profile) {
    return (
      <div className={styles.errorContainer}>
        <h2>Profile Required</h2>
        <p>Please complete your profile before creating a listing.</p>
        <Button onClick={onCancel}>Back</Button>
      </div>
    );
  }

  // NOTE: Removed strict subject validation check.
  // Users can create listings even without subjects in profile.
  // Subjects will be required at form submission time instead.

  return (
    <div className={styles.createListingsContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Create Listing</h1>
        <p className={styles.subtitle}>
          Create a one-on-one tutoring session listing using your profile information
        </p>
      </div>

      {/* LISTING TYPE - Full-width at top */}
      <div className={styles.fullWidthSection}>
        <div className={styles.formSection}>
          <label className={styles.label}>
            Listing Type <span className={styles.required}>*</span>
          </label>
          <select
            value={listingType}
            onChange={(e) => setListingType(e.target.value)}
            className={styles.select}
          >
            {LISTING_TYPE_OPTIONS.map(({ value, label, disabled }) => (
              <option key={value} value={value} disabled={disabled}>
                {label} {disabled ? '(Coming Soon)' : ''}
              </option>
            ))}
          </select>
          <p className={styles.helperText}>
            Additional listing types coming soon!
          </p>
        </div>
      </div>

      {/* TWO-COLUMN GRID - Aligned fields only */}
      <div className={styles.twoColumnLayout}>
        {/* Service Title */}
        <div className={styles.formSection}>
          <label className={styles.label}>
            Service Title <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., GCSE Mathematics Tutor - Experienced & Results-Focused"
            className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
            maxLength={200}
          />
          {errors.title ? (
            <p className={styles.errorText}>{errors.title}</p>
          ) : (
            <p className={styles.helperText}>Min. 10 characters ({title.length}/200)</p>
          )}
        </div>

        {/* Subjects */}
        <div className={styles.formSection}>
          <label className={styles.label}>
            Subjects <span className={styles.required}>*</span>
          </label>
          <MultiSelectDropdown
            triggerLabel={
              selectedSubjects.length > 0
                ? selectedSubjects.length === 1
                  ? selectedSubjects[0]
                  : `${selectedSubjects.length} subjects selected`
                : 'Select subjects'
            }
            options={SUBJECT_OPTIONS}
            selectedValues={selectedSubjects}
            onSelectionChange={setSelectedSubjects}
          />
          {errors.subjects && <p className={styles.errorText}>{errors.subjects}</p>}
          <p className={styles.helperText}>Choose one or more subjects you can teach</p>
        </div>

        {/* Hourly Rate */}
        <div className={styles.formSection}>
          <label className={styles.label}>
            Hourly Rate (£) <span className={styles.required}>*</span>
          </label>
          <input
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="50"
            className={`${styles.input} ${errors.hourlyRate ? styles.inputError : ''}`}
            min="0"
            step="1"
            inputMode="decimal"
          />
          {errors.hourlyRate && <p className={styles.errorText}>{errors.hourlyRate}</p>}
          <p className={styles.helperText}>Your rate per hour in GBP</p>
        </div>

        {/* Education Levels */}
        <div className={styles.formSection}>
          <label className={styles.label}>
            Education Levels <span className={styles.required}>*</span>
          </label>
          <MultiSelectDropdown
            triggerLabel={
              selectedLevels.length > 0
                ? selectedLevels.length === 1
                  ? selectedLevels[0]
                  : `${selectedLevels.length} levels selected`
                : 'Select levels'
            }
            options={LEVEL_OPTIONS}
            selectedValues={selectedLevels}
            onSelectionChange={setSelectedLevels}
          />
          {errors.levels && <p className={styles.errorText}>{errors.levels}</p>}
          <p className={styles.helperText}>Choose education levels you can teach</p>
        </div>

        {/* Delivery Mode */}
        <div className={styles.formSection}>
          <label className={styles.label}>
            Delivery Mode <span className={styles.required}>*</span>
          </label>
          <select
            value={deliveryMode}
            onChange={(e) => setDeliveryMode(e.target.value as "online" | "in_person" | "hybrid")}
            className={styles.select}
          >
            {DELIVERY_MODES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Session Durations */}
        <div className={styles.formSection}>
          <label className={styles.label}>
            Available Session Durations <span className={styles.required}>*</span>
          </label>
          <select
            value=""
            onChange={handleDurationChange}
            className={styles.select}
          >
            <option value="">Add duration...</option>
            {DURATION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value} disabled={selectedDurations.includes(value)}>
                {label}
              </option>
            ))}
          </select>
          {selectedDurations.length > 0 && (
            <div className={styles.durationChipsContainer}>
              {selectedDurations.map(duration => {
                const option = DURATION_OPTIONS.find(opt => opt.value === duration);
                return (
                  <span key={duration} className={styles.durationChip}>
                    {option?.label}
                    <button
                      type="button"
                      onClick={() => removeDuration(duration)}
                      className={styles.durationChipRemove}
                      aria-label={`Remove ${option?.label}`}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          {errors.durations && <p className={styles.errorText}>{errors.durations}</p>}
        </div>
      </div>

      {/* DESCRIPTION - Full-width section */}
      <div className={styles.fullWidthSection}>
        <div className={styles.formSection}>
          <label className={styles.label}>
            Description <span className={styles.required}>*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your teaching approach, experience, and what makes your tutoring effective..."
            rows={8}
            className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
            maxLength={2000}
          />
          {errors.description ? (
            <p className={styles.errorText}>{errors.description}</p>
          ) : (
            <p className={styles.helperText}>Min. 50 characters ({description.length}/2000)</p>
          )}
        </div>
      </div>

      {/* CANCELLATION POLICY - Full-width */}
      <div className={styles.fullWidthSection}>
        <div className={styles.formSection}>
          <label className={styles.label}>
            Cancellation Policy (Optional)
          </label>
          <textarea
            value={cancellationPolicy}
            onChange={(e) => setCancellationPolicy(e.target.value)}
            placeholder="e.g., 24-hour cancellation notice required for full refund"
            rows={3}
            className={styles.textarea}
            maxLength={500}
          />
          <p className={styles.helperText}>
            Set clear expectations for cancellations ({cancellationPolicy.length}/500)
          </p>
        </div>
      </div>

      {/* ADDITIONAL OPTIONS - Two-column layout */}
      <div className={styles.twoColumnLayout}>
        {/* Booking Options */}
        <div className={styles.formSection}>
          <label className={styles.label}>
            Booking Options
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={freeTrial}
              onChange={(e) => setFreeTrial(e.target.checked)}
              className={styles.checkbox}
            />
            <span>Offer Free Trial Session</span>
          </label>
          <p className={styles.helperText} style={{ marginBottom: '1rem' }}>
            Attract more students with a free trial lesson
          </p>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={instantBooking}
              onChange={(e) => setInstantBooking(e.target.checked)}
              className={styles.checkbox}
            />
            <span>Enable Instant Booking</span>
          </label>
          <p className={styles.helperText}>
            Students can book immediately without approval
          </p>
        </div>

        {/* Hero Image Upload */}
        <div className={styles.formSection}>
          <label className={styles.label}>
            Hero Image (Optional)
          </label>
          <p className={styles.helperText}>
            Your profile picture is already set as your main image. Add a hero image here.
          </p>
          <ImageUpload
            ref={imageUploadRef}
            onUploadComplete={handleUploadComplete}
            existingImages={imageUrls.slice(1)}
          />
        </div>

        {/* Location Details - Conditional */}
        {deliveryMode !== 'online' && (
          <div className={styles.formSection}>
            <label className={styles.label}>
              Location Details <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={locationDetails}
              onChange={(e) => setLocationDetails(e.target.value)}
              placeholder="e.g., Central Library Meeting Room, City Centre"
              className={`${styles.input} ${errors.locationDetails ? styles.inputError : ''}`}
            />
            {errors.locationDetails && <p className={styles.errorText}>{errors.locationDetails}</p>}
            <p className={styles.helperText}>
              Provide specific location information for in-person sessions
            </p>
          </div>
        )}

        {/* AI Tools */}
        <div className={styles.formSection}>
          <label className={styles.label}>
            AI Tools Used (Optional)
          </label>
          <MultiSelectDropdown
            triggerLabel={
              selectedAITools.length > 0
                ? `${selectedAITools.length} tool${selectedAITools.length > 1 ? 's' : ''} selected`
                : 'Select AI tools'
            }
            options={AI_TOOLS_OPTIONS}
            selectedValues={selectedAITools}
            onSelectionChange={setSelectedAITools}
          />
          <p className={styles.helperText}>AI tools you incorporate in lessons</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isUploading || isSaving}
        >
          Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={onSaveDraft}
          disabled={isUploading || isSaving}
        >
          Save Draft
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isUploading || isSaving}
        >
          {isUploading ? 'Uploading...' : isSaving ? 'Publishing...' : 'Publish Listing'}
        </Button>
      </div>
    </div>
  );
}
