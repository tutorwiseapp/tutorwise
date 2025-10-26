'use client';

import { useState, useEffect, useRef } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import type { CreateListingInput } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';
import ImageUpload, { type ImageUploadRef } from '@/app/components/listings/ImageUpload';
import { toast } from 'sonner';
import styles from './CreateListings.module.css';

interface CreateListingsProps {
  formData: Partial<CreateListingInput>;
  onSubmit: (data: Partial<CreateListingInput>) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  isSaving?: boolean;
}

// Predefined AI tools list
const AI_TOOLS_OPTIONS = [
  'ChatGPT',
  'Claude',
  'Grammarly',
  'Khan Academy',
  'Quizlet',
  'Duolingo',
  'Photomath',
  'Socratic',
  'Other'
];

// Duration options in minutes
const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' }
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
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const imageUploadRef = useRef<ImageUploadRef>(null);

  // Form state
  const [title, setTitle] = useState(formData.title || '');
  const [description, setDescription] = useState(formData.description || '');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(formData.subjects || []);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(formData.levels || []);
  const [hourlyRate, setHourlyRate] = useState(formData.hourly_rate?.toString() || '');
  const [useCustomRate, setUseCustomRate] = useState(false);
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

  // Profile data
  const profileSubjects = profile?.professional_details?.tutor?.subjects || [];
  const profileLevels = (profile?.professional_details?.tutor as any)?.key_stages || [];
  const profileRate = (profile?.professional_details?.tutor as any)?.one_on_one_rate || null;
  const profileDeliveryMode = (profile?.professional_details?.tutor as any)?.delivery_mode || null;

  // Initialize with profile data
  useEffect(() => {
    if (profile && !formData.hourly_rate) {
      if (profileRate) {
        setHourlyRate(profileRate.toString());
      }
    }
    if (profile && !formData.location_type && profileDeliveryMode) {
      setDeliveryMode(profileDeliveryMode);
    }
  }, [profile, profileRate, profileDeliveryMode, formData]);

  const handleUploadComplete = (urls: string[]) => {
    setImageUrls(urls);
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const toggleLevel = (level: string) => {
    setSelectedLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const toggleAITool = (tool: string) => {
    setSelectedAITools(prev =>
      prev.includes(tool)
        ? prev.filter(t => t !== tool)
        : [...prev, tool]
    );
  };

  const toggleDuration = (duration: number) => {
    setSelectedDurations(prev =>
      prev.includes(duration)
        ? prev.filter(d => d !== duration)
        : [...prev, duration]
    );
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
      toast.info('Uploading images...');

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
      listing_type: 'Tutor: One-on-One Session',
      title: title.trim(),
      description: description.trim(),
      subjects: selectedSubjects,
      levels: selectedLevels,
      hourly_rate: parseFloat(hourlyRate),
      location_type: deliveryMode,
      location_details: locationDetails.trim() || undefined,
      free_trial: freeTrial,
      instant_booking_enabled: instantBooking,
      ai_tools_used: selectedAITools.length > 0 ? selectedAITools : null,
      cancellation_policy: cancellationPolicy.trim() || null,
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

  if (!profile) {
    return (
      <div className={styles.errorContainer}>
        <h2>Profile Required</h2>
        <p>Please complete your profile before creating a listing.</p>
        <Button onClick={onCancel}>Back</Button>
      </div>
    );
  }

  // Check if profile has required data
  if (profileSubjects.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <h2>Profile Incomplete</h2>
        <p>Please add subjects to your profile before creating a listing.</p>
        <Button onClick={() => window.location.href = '/my-profile'}>Update Profile</Button>
      </div>
    );
  }

  return (
    <div className={styles.createListingsContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Create Listing</h1>
        <p className={styles.subtitle}>
          Create a one-on-one tutoring session listing using your profile information
        </p>
      </div>

      <div className={styles.twoColumnLayout}>
        {/* LEFT COLUMN - Main Fields */}
        <div className={styles.leftColumn}>
          {/* Listing Type (Fixed for MVP) */}
          <div className={styles.formSection}>
            <label className={styles.label}>
              Listing Type
            </label>
            <div className={styles.readOnlyField}>
              Tutor: One-on-One Session
            </div>
            <p className={styles.helperText}>
              More listing types coming soon!
            </p>
          </div>

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

          {/* Description */}
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

          {/* Free Trial */}
          <div className={styles.formSection}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={freeTrial}
                onChange={(e) => setFreeTrial(e.target.checked)}
                className={styles.checkbox}
              />
              <span>Offer Free Trial Session</span>
            </label>
            <p className={styles.helperText}>
              Attract more students with a free trial lesson
            </p>
          </div>

          {/* Cancellation Policy */}
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

          {/* Session Durations */}
          <div className={styles.formSection}>
            <label className={styles.label}>
              Available Session Durations <span className={styles.required}>*</span>
            </label>
            <div className={styles.checkboxGrid}>
              {DURATION_OPTIONS.map(({ value, label }) => (
                <label key={value} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedDurations.includes(value)}
                    onChange={() => toggleDuration(value)}
                    className={styles.checkbox}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {errors.durations && <p className={styles.errorText}>{errors.durations}</p>}
          </div>

          {/* Location Details */}
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

          {/* Images */}
          <div className={styles.formSection}>
            <label className={styles.label}>
              Photos (Optional)
            </label>
            <p className={styles.helperText}>
              Your profile picture is already set as your main image. Add additional photos here.
            </p>
            <ImageUpload
              ref={imageUploadRef}
              onUploadComplete={handleUploadComplete}
              existingImages={imageUrls.slice(1)}
            />
          </div>
        </div>

        {/* RIGHT COLUMN - Profile Data Selection */}
        <div className={styles.rightColumn}>
          {/* Subjects from Profile */}
          <div className={styles.formSection}>
            <label className={styles.label}>
              Subjects <span className={styles.required}>*</span>
            </label>
            <p className={styles.helperText}>Select from your profile</p>
            <div className={styles.checkboxList}>
              {profileSubjects.map((subject) => (
                <label key={subject} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedSubjects.includes(subject)}
                    onChange={() => toggleSubject(subject)}
                    className={styles.checkbox}
                  />
                  <span>{subject}</span>
                </label>
              ))}
            </div>
            {errors.subjects && <p className={styles.errorText}>{errors.subjects}</p>}
            {profileSubjects.length === 0 && (
              <p className={styles.warningText}>
                No subjects in profile. <a href="/my-profile">Update Profile</a>
              </p>
            )}
          </div>

          {/* Levels from Profile */}
          <div className={styles.formSection}>
            <label className={styles.label}>
              Levels <span className={styles.required}>*</span>
            </label>
            <p className={styles.helperText}>Select from your profile</p>
            <div className={styles.checkboxList}>
              {profileLevels.map((level) => (
                <label key={level} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedLevels.includes(level)}
                    onChange={() => toggleLevel(level)}
                    className={styles.checkbox}
                  />
                  <span>{level}</span>
                </label>
              ))}
            </div>
            {errors.levels && <p className={styles.errorText}>{errors.levels}</p>}
          </div>

          {/* Hourly Rate */}
          <div className={styles.formSection}>
            <label className={styles.label}>
              Hourly Rate (£) <span className={styles.required}>*</span>
            </label>
            {profileRate && !useCustomRate ? (
              <div>
                <div className={styles.rateDisplay}>
                  £{profileRate}/hour (from profile)
                </div>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={useCustomRate}
                    onChange={(e) => setUseCustomRate(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>Use custom rate for this listing</span>
                </label>
              </div>
            ) : (
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="50"
                className={`${styles.input} ${errors.hourlyRate ? styles.inputError : ''}`}
                min="0"
                step="0.01"
              />
            )}
            {errors.hourlyRate && <p className={styles.errorText}>{errors.hourlyRate}</p>}
          </div>

          {/* Delivery Mode */}
          <div className={styles.formSection}>
            <label className={styles.label}>
              Delivery Mode <span className={styles.required}>*</span>
            </label>
            <select
              value={deliveryMode}
              onChange={(e) => setDeliveryMode(e.target.value)}
              className={styles.select}
            >
              {DELIVERY_MODES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Instant Booking */}
          <div className={styles.formSection}>
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

          {/* AI Tools Used */}
          <div className={styles.formSection}>
            <label className={styles.label}>
              AI Tools Used (Optional)
            </label>
            <p className={styles.helperText}>Select tools you use in tutoring</p>
            <div className={styles.checkboxList}>
              {AI_TOOLS_OPTIONS.map((tool) => (
                <label key={tool} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedAITools.includes(tool)}
                    onChange={() => toggleAITool(tool)}
                    className={styles.checkbox}
                  />
                  <span>{tool}</span>
                </label>
              ))}
            </div>
          </div>
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
