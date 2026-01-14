/*
 * Filename: apps/web/src/app/components/listings/wizard-steps/CreateListings.tsx
 * Purpose: Dynamic multi-service listing creation form
 * Version: 4.0
 * Updated: 2025-11-04
 *
 * Features:
 * - Support for 4 service types: One-to-One, Group Session, Workshop, Study Package
 * - Dynamic field rendering based on service type
 * - Integrated availability management
 * - Design system compliant
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import type { CreateListingInput, ServiceType, AvailabilityPeriod } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/actions/Button';
import Card from '@/app/components/ui/data-display/Card';
import HubForm from '@/app/components/hub/form/HubForm';
import ImageUpload, { type ImageUploadRef } from '@/app/components/feature/listings/ImageUpload';
import AvailabilityFormSection from '@/app/components/feature/listings/AvailabilityFormSection';
import UnavailabilityFormSection from '@/app/components/feature/listings/UnavailabilityFormSection';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
import { fetchFieldsForContext } from '@/lib/api/sharedFields';
import toast from 'react-hot-toast';
import styles from './CreateListings.module.css';

interface CreateListingsProps {
  formData: Partial<CreateListingInput>;
  onSubmit: (data: Partial<CreateListingInput>) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  isSaving?: boolean;
}

// Helper function to extract options from shared field
function getOptionsFromField(field: any): Array<{ value: string; label: string }> {
  if (!field) return [];
  const sharedFields = (field as any).shared_fields;
  if (!sharedFields?.options) return [];
  return sharedFields.options.map((opt: any) => ({
    value: String(opt.value),
    label: opt.label,
  }));
}

export default function CreateListings({
  formData,
  onSubmit,
  onCancel,
  onSaveDraft,
  isSaving = false
}: CreateListingsProps) {
  const { profile, activeRole, isLoading: isProfileLoading } = useUserProfile();
  const imageUploadRef = useRef<ImageUploadRef>(null);

  // Fetch field options from shared_fields API based on user role
  const listingContext = activeRole === 'tutor' ? 'listing.tutor' : activeRole === 'agent' ? 'listing.agent' : 'listing.client';

  const { data: contextFields = [], isLoading: isLoadingFields } = useQuery({
    queryKey: ['listing-fields', listingContext],
    queryFn: () => fetchFieldsForContext(listingContext),
    enabled: !!activeRole,
  });

  // Extract options from shared fields with fallbacks
  const SUBJECT_OPTIONS = getOptionsFromField(contextFields.find(f => (f as any).shared_fields?.field_name === 'subjects'));
  const LEVEL_OPTIONS = getOptionsFromField(contextFields.find(f => (f as any).shared_fields?.field_name === 'keyStages'));
  const AI_TOOLS_OPTIONS = getOptionsFromField(contextFields.find(f => (f as any).shared_fields?.field_name === 'aiTools'));

  const durationField = contextFields.find(f => (f as any).shared_fields?.field_name === 'sessionDuration');
  const DURATION_OPTIONS = durationField ? getOptionsFromField(durationField).map(opt => ({
    value: parseInt(opt.value as string),
    label: opt.label
  })) : [];

  const SERVICE_TYPE_OPTIONS = getOptionsFromField(contextFields.find(f => (f as any).shared_fields?.field_name === 'serviceType')) as Array<{ value: ServiceType; label: string }>;
  const CATEGORY_OPTIONS = getOptionsFromField(contextFields.find(f => (f as any).shared_fields?.field_name === 'category'));
  const PACKAGE_TYPE_OPTIONS = getOptionsFromField(contextFields.find(f => (f as any).shared_fields?.field_name === 'packageType'));
  const DELIVERY_MODES = getOptionsFromField(contextFields.find(f => (f as any).shared_fields?.field_name === 'deliveryMode'));

  // v4.0: Form state with new service type fields
  const [serviceType, setServiceType] = useState<ServiceType>('one-to-one');
  const [serviceName, setServiceName] = useState(formData.title || '');
  const [description, setDescription] = useState(formData.description || '');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState(formData.hourly_rate?.toString() || '');
  const [tags, setTags] = useState<string[]>([]);

  // Service-specific fields
  const [sessionDuration, setSessionDuration] = useState<number>(60);
  const [maxAttendees, setMaxAttendees] = useState<number>(5);
  const [availability, setAvailability] = useState<AvailabilityPeriod[]>([]);
  const [unavailability, setUnavailability] = useState<Array<{ id: string; fromDate: string; toDate: string }>>([]);

  // Workshop fields
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('16:00');
  const [speakerBio, setSpeakerBio] = useState('');
  const [eventAgenda, setEventAgenda] = useState('');

  // Study Package fields
  const [packageType, setPackageType] = useState<'pdf' | 'video' | 'bundle'>('pdf');
  const [materialUrl, setMaterialUrl] = useState('');

  // Legacy fields (kept for backward compatibility)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(formData.subjects || []);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(formData.levels || []);
  const [deliveryMode, setDeliveryMode] = useState(formData.location_type || 'online');
  const [locationDetails, setLocationDetails] = useState(formData.location_details || '');
  const [freeTrial, setFreeTrial] = useState(formData.free_trial || false);
  const [instantBooking, setInstantBooking] = useState(formData.instant_booking_enabled || false);
  const [selectedAITools, setSelectedAITools] = useState<string[]>(formData.ai_tools_used || []);
  const [cancellationPolicy, setCancellationPolicy] = useState(formData.cancellation_policy || '');
  const [selectedDurations, setSelectedDurations] = useState<number[]>(formData.duration_options || [60]);
  const [imageUrls, setImageUrls] = useState<string[]>(formData.images || []);
  const [isUploading, setIsUploading] = useState(false);

  // Phase 4: Referral Partner delegation (SDD v4.3, Section 3.1)
  const [delegateCommissionTo, setDelegateCommissionTo] = useState<string>('');
  const [connections, setConnections] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Phase 4: Fetch connections for delegation dropdown (SDD v4.3)
  useEffect(() => {
    if (!profile) return;

    const fetchConnections = async () => {
      setIsLoadingConnections(true);
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();

        // Fetch accepted connections where user is either requester or receiver
        const { data, error } = await supabase
          .from('profile_graph')
          .select('requester_id, receiver_id, requester:requester_id(id, full_name, email), receiver:receiver_id(id, full_name, email)')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

        if (error) throw error;

        // Map to connection list (get the OTHER person in the connection)
        const connectionList = (data || []).map((conn: any) => {
          const isRequester = conn.requester_id === profile.id;
          const otherPerson = isRequester ? conn.receiver : conn.requester;
          return {
            id: otherPerson.id,
            full_name: otherPerson.full_name || 'Unknown',
            email: otherPerson.email
          };
        });

        setConnections(connectionList);
      } catch (error) {
        console.error('Failed to fetch connections:', error);
      } finally {
        setIsLoadingConnections(false);
      }
    };

    fetchConnections();
  }, [profile]);

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
    if (profileRate && !formData.hourly_rate) setAmount(profileRate.toString());
    if (profileDeliveryMode && !formData.location_type) {
      setDeliveryMode(profileDeliveryMode as 'online' | 'hybrid' | 'in_person');
    }
  }, [profile, activeRole, formData.hourly_rate, formData.location_type, selectedSubjects.length]);

  const handleUploadComplete = (urls: string[]) => {
    setImageUrls(urls);
  };

  // v4.0: Load availability from profile
  const handleLoadAvailabilityFromProfile = () => {
    if (!profile) return;

    const roleData = profile.professional_details?.tutor;

    if (roleData && (roleData as any).availability) {
      const profileAvailability = (roleData as any).availability as AvailabilityPeriod[];
      setAvailability(profileAvailability);
      toast.success('Loaded availability from your profile');
    } else {
      toast.error('No availability found in your profile');
    }
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

  // v4.0: Dynamic validation based on service type
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Common validations
    if (!serviceName.trim()) {
      newErrors.serviceName = 'Service name is required';
    } else if (serviceName.trim().length < 10) {
      newErrors.serviceName = 'Service name must be at least 10 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.trim().length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }

    if (!category) {
      newErrors.category = 'Please select a category';
    }

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid price';
    }

    // Service-type specific validations
    if (serviceType === 'one-to-one' || serviceType === 'group-session') {
      if (!sessionDuration) {
        newErrors.sessionDuration = 'Please select a session duration';
      }

      if (availability.length === 0) {
        newErrors.availability = 'Please add at least one availability period';
      }

      if (serviceType === 'group-session') {
        if (!maxAttendees || maxAttendees < 2 || maxAttendees > 10) {
          newErrors.maxAttendees = 'Max attendees must be between 2 and 10';
        }
      }
    }

    if (serviceType === 'workshop') {
      if (!maxAttendees || maxAttendees < 10 || maxAttendees > 500) {
        newErrors.maxAttendees = 'Max participants must be between 10 and 500';
      }

      if (!eventDate) {
        newErrors.eventDate = 'Event date is required';
      }

      if (!startTime) {
        newErrors.startTime = 'Start time is required';
      }

      if (!endTime) {
        newErrors.endTime = 'End time is required';
      }
    }

    if (serviceType === 'study-package') {
      if (!packageType) {
        newErrors.packageType = 'Please select a package type';
      }
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

    // v4.0: Build service-type specific data structure
    const baseData = {
      service_name: serviceName.trim(),
      description: description.trim(),
      category,
      amount: parseFloat(amount),
      currency: 'GBP',
      hero_image_url: finalImages[0] || undefined,
      images: finalImages,
      tags: tags.length > 0 ? tags : undefined,
      status: 'draft' as const,
    };

    let serviceSpecificData: any = {};

    switch (serviceType) {
      case 'one-to-one':
        serviceSpecificData = {
          service_type: 'one-to-one',
          session_duration: sessionDuration,
          availability,
          max_attendees: 1,
        };
        break;

      case 'group-session':
        serviceSpecificData = {
          service_type: 'group-session',
          session_duration: sessionDuration,
          max_attendees: maxAttendees,
          availability,
        };
        break;

      case 'workshop':
        serviceSpecificData = {
          service_type: 'workshop',
          max_attendees: maxAttendees,
          event_date: eventDate,
          start_time: startTime,
          end_time: endTime,
          speaker_bio: speakerBio.trim() || undefined,
          event_agenda: eventAgenda.trim() || undefined,
        };
        break;

      case 'study-package':
        serviceSpecificData = {
          service_type: 'study-package',
          package_type: packageType,
          material_url: materialUrl || undefined,
        };
        break;
    }

    const listingData = {
      ...baseData,
      ...serviceSpecificData,
      // Legacy compatibility fields for backward compatibility with existing API
      title: serviceName.trim(),
      listing_type: `Tutor: ${SERVICE_TYPE_OPTIONS.find(opt => opt.value === serviceType)?.label}`,
      subjects: selectedSubjects,
      levels: selectedLevels,
      hourly_rate: parseFloat(amount),
      location_type: deliveryMode,
      location_details: locationDetails.trim() || undefined,
      free_trial: freeTrial,
      instant_booking_enabled: instantBooking,
      ai_tools_used: selectedAITools.length > 0 ? selectedAITools : undefined,
      cancellation_policy: cancellationPolicy.trim() || undefined,
      duration_options: selectedDurations,
      full_name: profile?.full_name || '',
      location_country: 'United Kingdom',
      timezone: 'Europe/London',
      // Phase 4: Commission delegation (SDD v4.3, Section 3.1)
      delegate_commission_to_profile_id: delegateCommissionTo || undefined
    };

    onSubmit(listingData);
  };

  if (isProfileLoading || isLoadingFields) {
    return (
      <div className={styles.loadingContainer}>
        <p>Loading form configuration...</p>
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

  // Check if we have the minimum required options loaded
  if (contextFields.length === 0 || SERVICE_TYPE_OPTIONS.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <h2>Configuration Loading</h2>
        <p>Loading form configuration from admin settings...</p>
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
          Choose your service type and provide details
        </p>
      </div>

      {/* CARD 1: Service Type Selector */}
      <Card>
        <HubForm.Section title="Service Type">
          <div className={styles.formSection}>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
              className={styles.select}
            >
              {SERVICE_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </HubForm.Section>
      </Card>

      {/* CARD 2: Core Details (Dynamic) */}
      <Card>
        <HubForm.Section title="Core Details">
          <div className={styles.twoColumnLayout}>
            {/* Service Name */}
            <div className={styles.formSection}>
              <label className={styles.label}>
                Service Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g., GCSE Maths Tutor"
                className={`${styles.input} ${errors.serviceName ? styles.inputError : ''}`}
                maxLength={200}
              />
              {errors.serviceName && <p className={styles.errorText}>{errors.serviceName}</p>}
            </div>

            {/* Category */}
            <div className={styles.formSection}>
              <label className={styles.label}>
                Category <span className={styles.required}>*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`${styles.select} ${errors.category ? styles.inputError : ''}`}
              >
                <option value="">Select a category...</option>
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.category && <p className={styles.errorText}>{errors.category}</p>}
            </div>

            {/* Price */}
            <div className={styles.formSection}>
              <label className={styles.label}>
                Price (£) <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50"
                className={`${styles.input} ${errors.amount ? styles.inputError : ''}`}
                min="1"
                step="1"
              />
              {errors.amount && <p className={styles.errorText}>{errors.amount}</p>}
            </div>

            {/* Dynamic Field Based on Service Type */}
            {serviceType === 'one-to-one' && (
              <div className={styles.formSection}>
                <label className={styles.label}>
                  Session Duration <span className={styles.required}>*</span>
                </label>
                <select
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                  className={styles.select}
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {serviceType === 'group-session' && (
              <>
                <div className={styles.formSection}>
                  <label className={styles.label}>
                    Max Group Size (2-10) <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    value={maxAttendees}
                    onChange={(e) => setMaxAttendees(parseInt(e.target.value))}
                    placeholder="5"
                    className={`${styles.input} ${errors.maxAttendees ? styles.inputError : ''}`}
                    min="2"
                    max="10"
                  />
                  {errors.maxAttendees && <p className={styles.errorText}>{errors.maxAttendees}</p>}
                </div>
                <div className={styles.formSection}>
                  <label className={styles.label}>
                    Session Duration <span className={styles.required}>*</span>
                  </label>
                  <select
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                    className={styles.select}
                  >
                    {DURATION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {serviceType === 'workshop' && (
              <>
                <div className={styles.formSection}>
                  <label className={styles.label}>
                    Max Participants (10-500) <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    value={maxAttendees}
                    onChange={(e) => setMaxAttendees(parseInt(e.target.value))}
                    placeholder="100"
                    className={`${styles.input} ${errors.maxAttendees ? styles.inputError : ''}`}
                    min="10"
                    max="500"
                  />
                  {errors.maxAttendees && <p className={styles.errorText}>{errors.maxAttendees}</p>}
                </div>
                <div className={styles.formSection}>
                  <label className={styles.label}>
                    Session Duration <span className={styles.required}>*</span>
                  </label>
                  <select
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                    className={styles.select}
                  >
                    {DURATION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {serviceType === 'study-package' && (
              <>
                <div className={styles.formSection}>
                  <label className={styles.label}>
                    Package Type <span className={styles.required}>*</span>
                  </label>
                  <select
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value as 'pdf' | 'video' | 'bundle')}
                    className={styles.select}
                  >
                    {PACKAGE_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formSection}>
                  <label className={styles.label}>
                    Session Duration <span className={styles.required}>*</span>
                  </label>
                  <select
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                    className={styles.select}
                  >
                    {DURATION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Subjects */}
            <div className={styles.formSection}>
              <label className={styles.label}>
                Subjects <span className={styles.required}>*</span>
              </label>
              <UnifiedMultiSelect
                triggerLabel={formatMultiSelectLabel(selectedSubjects, 'Select subjects')}
                options={SUBJECT_OPTIONS}
                selectedValues={selectedSubjects}
                onSelectionChange={setSelectedSubjects}
              />
              {errors.subjects && <p className={styles.errorText}>{errors.subjects}</p>}
            </div>

            {/* Education Levels */}
            <div className={styles.formSection}>
              <label className={styles.label}>
                Education Levels <span className={styles.required}>*</span>
              </label>
              <UnifiedMultiSelect
                triggerLabel={formatMultiSelectLabel(selectedLevels, 'Select levels')}
                options={LEVEL_OPTIONS}
                selectedValues={selectedLevels}
                onSelectionChange={setSelectedLevels}
              />
              {errors.levels && <p className={styles.errorText}>{errors.levels}</p>}
            </div>
          </div>

          {/* Description - Full Width */}
          <div className={styles.fullWidthSection}>
            <div className={styles.formSection}>
              <label className={styles.label}>
                Description <span className={styles.required}>*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your service in detail..."
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
        </HubForm.Section>
      </Card>

      {/* CARD 3: Availability (Conditional - one-to-one and group-session) */}
      {(serviceType === 'one-to-one' || serviceType === 'group-session') && (
        <Card>
          <HubForm.Section title="Service Availability">
            <div className={styles.availabilityGrid}>
              {/* Left Column: Availability Periods */}
              <AvailabilityFormSection
                value={availability}
                onChange={setAvailability}
                onLoadFromProfile={handleLoadAvailabilityFromProfile}
              />

              {/* Right Column: Unavailability Periods */}
              <UnavailabilityFormSection
                value={unavailability}
                onChange={setUnavailability}
              />
            </div>
            {errors.availability && <p className={styles.errorText}>{errors.availability}</p>}
          </HubForm.Section>
        </Card>
      )}

      {/* CARD 4: Workshop Details (Conditional) */}
      {serviceType === 'workshop' && (
        <Card>
          <HubForm.Section title="Workshop Details">
            <div className={styles.twoColumnLayout}>
              {/* Event Date */}
              <div className={styles.formSection}>
                <label className={styles.label}>
                  Event Date <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className={`${styles.input} ${errors.eventDate ? styles.inputError : ''}`}
                />
                {errors.eventDate && <p className={styles.errorText}>{errors.eventDate}</p>}
              </div>

              {/* Time Range */}
              <div className={styles.formSection}>
                <label className={styles.label}>Time</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={`${styles.input} ${errors.startTime ? styles.inputError : ''}`}
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`${styles.input} ${errors.endTime ? styles.inputError : ''}`}
                  />
                </div>
              </div>
            </div>

            {/* Speaker Bio - Full Width */}
            <div className={styles.fullWidthSection}>
              <div className={styles.formSection}>
                <label className={styles.label}>Speaker Bio (Optional)</label>
                <textarea
                  value={speakerBio}
                  onChange={(e) => setSpeakerBio(e.target.value)}
                  placeholder="Briefly introduce the speaker(s)..."
                  rows={3}
                  className={styles.textarea}
                  maxLength={500}
                />
              </div>
            </div>

            {/* Event Agenda - Full Width */}
            <div className={styles.fullWidthSection}>
              <div className={styles.formSection}>
                <label className={styles.label}>Event Agenda (Optional)</label>
                <textarea
                  value={eventAgenda}
                  onChange={(e) => setEventAgenda(e.target.value)}
                  placeholder="Outline the schedule for the event..."
                  rows={5}
                  className={styles.textarea}
                  maxLength={1000}
                />
              </div>
            </div>
          </HubForm.Section>
        </Card>
      )}

      {/* CARD 4: Study Package Materials (Conditional) */}
      {serviceType === 'study-package' && (
        <Card>
          <HubForm.Section title="Study Package Materials">
            <div className={styles.formSection}>
              <label className={styles.label}>Material URL (Optional)</label>
              <input
                type="url"
                value={materialUrl}
                onChange={(e) => setMaterialUrl(e.target.value)}
                placeholder="https://example.com/material.pdf"
                className={styles.input}
              />
              <p className={styles.helperText}>
                Or use the image upload below to upload files
              </p>
            </div>
          </HubForm.Section>
        </Card>
      )}

      {/* CARD 5: Booking Options */}
      <Card>
        <HubForm.Section title="Booking Options">
          <div className={styles.twoColumnLayout}>
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
          </div>
        </HubForm.Section>
      </Card>

      {/* CARD 6: Location Details */}
      <Card>
        <HubForm.Section title="Location Details">
          {/* Delivery Mode - Full width */}
          <div className={styles.fullWidthSection}>
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
          </div>

          {/* Location Details - Conditional */}
          {deliveryMode !== 'online' && (
            <div className={styles.fullWidthSection}>
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
            </div>
          )}
        </HubForm.Section>
      </Card>

      {/* CARD 7: Referral Partner (Commission Delegation) - SDD v4.3, Section 3.1 */}
      <Card>
        <HubForm.Section title="Referral Partner (Optional)">
          <div className={styles.fullWidthSection}>
            <div className={styles.formSection}>
              <label className={styles.label}>
                Delegate Commissions To
              </label>
              <select
                value={delegateCommissionTo}
                onChange={(e) => setDelegateCommissionTo(e.target.value)}
                className={styles.select}
                disabled={isLoadingConnections}
              >
                <option value="">No delegation (you keep all commissions)</option>
                {connections.length === 0 && !isLoadingConnections && (
                  <option value="" disabled>No connections available</option>
                )}
                {connections.map((conn) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.full_name} ({conn.email})
                  </option>
                ))}
              </select>
              <p className={styles.helperText}>
                For offline brochures: If you refer a client to this listing using your own referral link, the commission will go to your selected partner instead of you. This enables the &ldquo;Tutor-Led&rdquo; offline referral model (SDD v4.3).
              </p>
              {connections.length === 0 && !isLoadingConnections && (
                <p className={styles.helperText} style={{ color: '#f59e0b', marginTop: '0.5rem' }}>
                  You have no connections yet. Visit the Network page to connect with agents before using this feature.
                </p>
              )}
            </div>
          </div>
        </HubForm.Section>
      </Card>

      {/* CARD 8: Hero Image Upload */}
      <Card>
        <HubForm.Section title="Hero Image">
          <ImageUpload
            ref={imageUploadRef}
            onUploadComplete={handleUploadComplete}
            existingImages={imageUrls.slice(1)}
          />
        </HubForm.Section>
      </Card>

      {/* CARD 9: AI Tools */}
      <Card>
        <HubForm.Section title="AI Tools">
          <div className={styles.formSection}>
            <label className={styles.label}>
              AI Tools Used (Optional)
            </label>
            <UnifiedMultiSelect
              triggerLabel={formatMultiSelectLabel(selectedAITools, 'Select AI tools')}
              options={AI_TOOLS_OPTIONS}
              selectedValues={selectedAITools}
              onSelectionChange={setSelectedAITools}
            />
            <p className={styles.helperText}>AI tools you incorporate in lessons</p>
          </div>
        </HubForm.Section>
      </Card>

      {/* CARD 10: Cancellation Policy */}
      <Card>
        <HubForm.Section title="Cancellation Policy">
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
                ({cancellationPolicy.length}/500)
              </p>
            </div>
          </div>
        </HubForm.Section>
      </Card>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSaving || isUploading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onSaveDraft}
          disabled={isSaving || isUploading}
        >
          Save Draft
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          disabled={isSaving || isUploading}
          isLoading={isSaving || isUploading}
        >
          {isSaving || isUploading ? 'Saving...' : 'Publish Listing'}
        </Button>
      </div>
    </div>
  );
}
