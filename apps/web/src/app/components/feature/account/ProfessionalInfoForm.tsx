'use client';

import { useState, useEffect, useRef } from 'react';
import type { Profile } from '@/types';
import HubForm from '@/app/components/hub/form/HubForm';
import MultiSelectDropdown from '@/app/components/ui/forms/MultiSelectDropdown';
import CustomTimePicker from '@/app/components/feature/listings/wizard-steps/CustomTimePicker';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import Select from '@/app/components/ui/forms/Select';
import Button from '@/app/components/ui/actions/Button';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import hubFormStyles from '@/app/components/hub/form/HubForm.module.css';
import styles from './ProfessionalInfoForm.module.css';

interface ProfessionalInfoFormProps {
  profile: Profile;
  onSave: (updatedProfile: Partial<Profile>) => Promise<void>;
  activeRole?: string | null;
}

type EditingField = 'bio' | 'bio_video_url' | 'status' | 'academic_qualifications' | 'key_stages' |
  'teaching_professional_qualifications' | 'subjects' | 'teaching_experience' |
  'session_type' | 'tutoring_experience' | 'one_on_one_rate' | 'group_session_rate' |
  'delivery_mode' | 'dbs_certificate' |
  // Client fields
  'subjects_client' | 'education_level' | 'learning_goals' | 'learning_preferences' |
  'budget_min' | 'budget_max' | 'sessions_per_week' | 'session_duration' |
  'special_needs' | 'additional_info_client' |
  // Agent fields
  'agency_name' | 'agency_size' | 'years_in_business' | 'description' | 'services' |
  'commission_rate' | 'service_areas' | 'student_capacity' | 'subject_specializations' |
  'education_levels' | 'coverage_areas' | 'number_of_tutors' | 'certifications' |
  'website' | 'agent_additional_info' |
  // Trust & Verification fields
  'proof_of_address_type' | 'address_document_issue_date' |
  'identity_document_number' | 'identity_issue_date' | 'identity_expiry_date' |
  'dbs_certificate_number' | 'dbs_certificate_date' | 'dbs_expiry_date' | null;

type FieldType = 'text' | 'select' | 'multiselect' | 'textarea' | 'number';

type AvailabilityType = 'recurring' | 'one-time';

interface AvailabilityPeriod {
  id: string;
  type: AvailabilityType;
  days?: string[]; // For recurring (e.g., ['Monday', 'Wednesday'])
  fromDate: string;
  toDate?: string;
  startTime: string;
  endTime: string;
}

interface UnavailabilityPeriod {
  id: string;
  fromDate: string;
  toDate: string;
}

// Constants for select options
const statusOptions = [
  { value: 'Professional Tutor', label: 'Professional Tutor' },
  { value: 'Solo Tutor', label: 'Solo Tutor' },
  { value: 'Part-time Tutor', label: 'Part-time Tutor' },
];

const academicQualificationsOptions = [
  { value: 'University Degree', label: 'University Degree' },
  { value: "Master's Degree", label: "Master's Degree" },
  { value: 'PhD', label: 'PhD' },
  { value: 'Professional Certificate', label: 'Professional Certificate' },
];

const keyStagesOptions = [
  { value: 'Secondary Education (KS4) - Age 14 to 16', label: 'Secondary Education (KS4) - Age 14 to 16' },
  { value: 'Primary Education (KS1-KS2) - Age 5 to 11', label: 'Primary Education (KS1-KS2) - Age 5 to 11' },
  { value: 'Secondary Education (KS3) - Age 11 to 14', label: 'Secondary Education (KS3) - Age 11 to 14' },
  { value: 'A-Levels - Age 16 to 18', label: 'A-Levels - Age 16 to 18' },
];

const teachingProfessionalQualificationsOptions = [
  { value: 'QTLS, QTS', label: 'QTLS, QTS' },
  { value: 'PGCE', label: 'PGCE' },
  { value: 'Teaching License', label: 'Teaching License' },
  { value: 'None', label: 'None' },
];

const subjectsOptions = [
  { value: 'Mathematics, English', label: 'Mathematics, English' },
  { value: 'Science', label: 'Science' },
  { value: 'History', label: 'History' },
  { value: 'Geography', label: 'Geography' },
  { value: 'Languages', label: 'Languages' },
];

const teachingExperienceOptions = [
  { value: 'Experienced Teacher (4-7 years)', label: 'Experienced Teacher (4-7 years)' },
  { value: 'New Teacher (0-3 years)', label: 'New Teacher (0-3 years)' },
  { value: 'Senior Teacher (8+ years)', label: 'Senior Teacher (8+ years)' },
];

const sessionTypeOptions = [
  { value: 'One-to-One Session, Group Session', label: 'One-to-One Session, Group Session' },
  { value: 'One-to-One Session', label: 'One-to-One Session' },
  { value: 'Group Session', label: 'Group Session' },
];

const tutoringExperienceOptions = [
  { value: 'Experienced Tutor (3-5 years)', label: 'Experienced Tutor (3-5 years)' },
  { value: 'New Tutor (0-2 years)', label: 'New Tutor (0-2 years)' },
  { value: 'Expert Tutor (5+ years)', label: 'Expert Tutor (5+ years)' },
];

const deliveryModeOptions = [
  { value: 'In-person, Online, Hybrid', label: 'In-person, Online, Hybrid' },
  { value: 'In-person', label: 'In-person' },
  { value: 'Online', label: 'Online' },
  { value: 'Hybrid', label: 'Hybrid' },
];

// Client-specific field options
const educationLevelOptions = [
  { value: 'Primary Education (KS1-KS2) - Age 5 to 11', label: 'Primary Education (KS1-KS2) - Age 5 to 11' },
  { value: 'Secondary Education (KS3) - Age 11 to 14', label: 'Secondary Education (KS3) - Age 11 to 14' },
  { value: 'Secondary Education (KS4) - Age 14 to 16', label: 'Secondary Education (KS4) - Age 14 to 16' },
  { value: 'A-Levels - Age 16 to 18', label: 'A-Levels - Age 16 to 18' },
  { value: 'University/Undergraduate', label: 'University/Undergraduate' },
  { value: 'Postgraduate', label: 'Postgraduate' },
  { value: 'Adult Education', label: 'Adult Education' },
];

const learningGoalsOptions = [
  { value: 'Improve grades', label: 'Improve grades' },
  { value: 'Exam preparation', label: 'Exam preparation' },
  { value: 'Catch up on missed work', label: 'Catch up on missed work' },
  { value: 'Advanced learning', label: 'Advanced learning' },
  { value: 'Build confidence', label: 'Build confidence' },
  { value: 'Homework help', label: 'Homework help' },
  { value: 'Career preparation', label: 'Career preparation' },
  { value: 'Personal development', label: 'Personal development' },
];

const learningPreferencesOptions = [
  { value: 'Visual learning', label: 'Visual learning' },
  { value: 'Auditory learning', label: 'Auditory learning' },
  { value: 'Hands-on practice', label: 'Hands-on practice' },
  { value: 'Reading/writing', label: 'Reading/writing' },
  { value: 'One-on-one attention', label: 'One-on-one attention' },
  { value: 'Structured lessons', label: 'Structured lessons' },
  { value: 'Flexible approach', label: 'Flexible approach' },
];

const specialNeedsOptions = [
  { value: 'Dyslexia', label: 'Dyslexia' },
  { value: 'Dyscalculia', label: 'Dyscalculia' },
  { value: 'ADHD', label: 'ADHD' },
  { value: 'Autism Spectrum Disorder (ASD)', label: 'Autism Spectrum Disorder (ASD)' },
  { value: 'Dyspraxia', label: 'Dyspraxia' },
  { value: 'Visual Impairment', label: 'Visual Impairment' },
  { value: 'Hearing Impairment', label: 'Hearing Impairment' },
  { value: 'Speech and Language Difficulties', label: 'Speech and Language Difficulties' },
  { value: 'Physical Disabilities', label: 'Physical Disabilities' },
  { value: 'Emotional and Behavioural Difficulties', label: 'Emotional and Behavioural Difficulties' },
  { value: 'Gifted and Talented', label: 'Gifted and Talented' },
  { value: 'English as Additional Language (EAL)', label: 'English as Additional Language (EAL)' },
];

const sessionsPerWeekOptions = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5+', label: '5+' },
];

const sessionDurationOptions = [
  { value: '30 minutes', label: '30 minutes' },
  { value: '1 hour', label: '1 hour' },
  { value: '1.5 hours', label: '1.5 hours' },
  { value: '2 hours', label: '2 hours' },
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ProfessionalInfoForm({ profile, onSave, activeRole }: ProfessionalInfoFormProps) {
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');

  // Refs for auto-focus
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null }>({});

  // Form data with multi-select fields as arrays
  const [formData, setFormData] = useState({
    bio: profile.bio || '',
    bio_video_url: profile.bio_video_url || '', // v5.5 CaaS: Credibility Clip
    dbs_certificate: profile.dbs_certificate_number || '',

    // Tutor fields
    status: '',
    academic_qualifications: [] as string[], // Multi-select
    key_stages: [] as string[], // Multi-select
    teaching_professional_qualifications: [] as string[], // Multi-select
    subjects: [] as string[], // Multi-select
    teaching_experience: '', // Single select
    session_type: [] as string[], // Multi-select
    tutoring_experience: '', // Single select
    one_on_one_rate: '',
    group_session_rate: '',
    delivery_mode: [] as string[], // Multi-select

    // Agent fields
    agency_name: '',
    agency_size: '',
    years_in_business: '',
    description: '',
    services: [] as string[], // Multi-select
    commission_rate: '',
    service_areas: [] as string[], // Multi-select
    student_capacity: '',
    subject_specializations: [] as string[], // Multi-select
    education_levels: [] as string[], // Multi-select
    coverage_areas: [] as string[], // Multi-select
    number_of_tutors: '',
    certifications: [] as string[], // Multi-select
    website: '',
    agent_additional_info: '',

    // Client fields
    subjects_client: [] as string[], // Multi-select (different from tutor subjects)
    education_level: '',
    learning_goals: [] as string[], // Multi-select
    learning_preferences: [] as string[], // Multi-select
    budget_min: '',
    budget_max: '',
    sessions_per_week: '',
    session_duration: '',
    special_needs: [] as string[], // Multi-select
    additional_info_client: '', // Textarea (different from generic additional_info)

    // Trust & Verification fields
    proof_of_address_type: '',
    address_document_issue_date: '',
    identity_document_number: '',
    identity_issue_date: '',
    identity_expiry_date: '',
    dbs_certificate_number: '',
    dbs_certificate_date: '',
    dbs_expiry_date: '',
  });

  // Availability state
  const [availabilityType, setAvailabilityType] = useState<AvailabilityType>('recurring');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [availFromDate, setAvailFromDate] = useState('');
  const [availToDate, setAvailToDate] = useState('');
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('5:00 PM');
  const [availabilityPeriods, setAvailabilityPeriods] = useState<AvailabilityPeriod[]>([]);
  const [availErrors, setAvailErrors] = useState<{ days?: string; dates?: string; times?: string }>({});

  // Unavailability state
  const [unavailFromDate, setUnavailFromDate] = useState('');
  const [unavailToDate, setUnavailToDate] = useState('');
  const [unavailabilityPeriods, setUnavailabilityPeriods] = useState<UnavailabilityPeriod[]>([]);
  const [unavailErrors, setUnavailErrors] = useState<{ dates?: string }>({});

  // Update form data when profile changes
  useEffect(() => {
    // Transform role_details array to professional_details format for backward compatibility
    const roleDetailsArray = (profile as any).role_details || [];
    const professionalDetails: any = {};
    roleDetailsArray.forEach((rd: any) => {
      professionalDetails[rd.role_type] = rd;
    });

    // Merge with existing professional_details if any (for backward compatibility)
    const combined = { ...professionalDetails, ...profile.professional_details };

    const agentData = combined?.agent;
    const tutorData = combined?.tutor;
    const clientData = combined?.client;

    setFormData(prev => ({
      ...prev,
      bio: profile.bio || '',
      bio_video_url: profile.bio_video_url || '',
      dbs_certificate: profile.dbs_certificate_number || '',

      // Agent fields (16 fields)
      agency_name: agentData?.agency_name || '',
      agency_size: agentData?.agency_size || '',
      years_in_business: agentData?.years_in_business || '',
      description: agentData?.description || '',
      services: agentData?.services || [],
      commission_rate: agentData?.commission_rate || '',
      service_areas: agentData?.service_areas || [],
      student_capacity: agentData?.student_capacity || '',
      subject_specializations: agentData?.subject_specializations || [],
      education_levels: agentData?.education_levels || [],
      coverage_areas: agentData?.coverage_areas || [],
      number_of_tutors: agentData?.number_of_tutors || '',
      certifications: agentData?.certifications || [],
      website: agentData?.website || '',
      agent_additional_info: agentData?.additional_info || '',

      // Tutor fields (11 fields)
      status: tutorData?.status || '',
      academic_qualifications: tutorData?.academic_qualifications || [],
      key_stages: tutorData?.key_stages || [],
      teaching_professional_qualifications: tutorData?.teaching_professional_qualifications || [],
      subjects: tutorData?.subjects || [],
      teaching_experience: tutorData?.teaching_experience || '',
      session_type: tutorData?.session_types || [],
      tutoring_experience: tutorData?.tutoring_experience || '',
      one_on_one_rate: tutorData?.one_on_one_rate?.toString() || '',
      group_session_rate: tutorData?.group_session_rate?.toString() || '',
      delivery_mode: tutorData?.delivery_mode || [],

      // Client fields (10 fields)
      subjects_client: clientData?.subjects || [],
      education_level: clientData?.education_level || '',
      learning_goals: clientData?.learning_goals || [],
      learning_preferences: clientData?.learning_preferences || [],
      budget_min: clientData?.budget_range ? clientData.budget_range.split('-')[0] : '',
      budget_max: clientData?.budget_range ? clientData.budget_range.split('-')[1] : '',
      sessions_per_week: clientData?.sessions_per_week || '',
      session_duration: clientData?.session_duration || '',
      special_needs: clientData?.special_needs || [],
      additional_info_client: clientData?.additional_info || '',

      // Trust & Verification fields
      proof_of_address_type: profile.proof_of_address_type || '',
      address_document_issue_date: profile.address_document_issue_date || '',
      identity_document_number: profile.identity_document_number || '',
      identity_issue_date: profile.identity_issue_date || '',
      identity_expiry_date: profile.identity_expiry_date || '',
      dbs_certificate_number: profile.dbs_certificate_number || '',
      dbs_certificate_date: profile.dbs_certificate_date || '',
      dbs_expiry_date: profile.dbs_expiry_date || '',
    }));

    // Load client availability/unavailability if present
    if (activeRole === 'client' && clientData) {
      if (clientData.availability) {
        setAvailabilityPeriods(clientData.availability);
      }
      if (clientData.unavailability) {
        setUnavailabilityPeriods(clientData.unavailability);
      }
    }

    // Load DBS certificate file name if present
    if (profile.dbs_certificate_document_name) {
      setUploadedFileName(profile.dbs_certificate_document_name);
    }
  }, [profile, activeRole]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (editingField && inputRefs.current[editingField]) {
      inputRefs.current[editingField]?.focus();
    }
  }, [editingField]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (field: string, values: string[]) => {
    setFormData(prev => ({ ...prev, [field]: values }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setFileError('Please upload a valid image (JPG, PNG) or PDF file');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setFileError('File size must be less than 5MB');
        return;
      }

      setUploadedFileName(file.name);
      setFileError('');

      // Save the file name to the profile
      setIsSaving(true);
      try {
        const updateData: Partial<Profile> = {
          dbs_certificate_document_name: file.name
        };
        await onSave(updateData);
      } catch (error) {
        console.error('Failed to save DBS certificate:', error);
        setFileError('Failed to save document. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDeleteDocument = async () => {
    setIsSaving(true);
    try {
      const updateData: Partial<Profile> = {
        dbs_certificate_document_name: ''
      };
      await onSave(updateData);
      setUploadedFileName('');
      const fileInput = document.getElementById('dbsCertificate') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Failed to delete DBS certificate:', error);
      setFileError('Failed to delete document. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveField = async (field: EditingField) => {
    if (!field) return;

    setIsSaving(true);
    try {
      let updateData: Partial<Profile> = {};

      // Handle profile-level fields
      if (field === 'bio') {
        updateData = { bio: formData.bio };
      } else if (field === 'bio_video_url') {
        updateData = { bio_video_url: formData.bio_video_url };
      } else if (field === 'dbs_certificate') {
        updateData = { dbs_certificate_number: formData.dbs_certificate };
      }
      // Handle Trust & Verification fields (profile-level)
      else if (['proof_of_address_type', 'address_document_issue_date',
                'identity_document_number', 'identity_issue_date', 'identity_expiry_date',
                'dbs_certificate_number', 'dbs_certificate_date', 'dbs_expiry_date'].includes(field)) {
        const fieldValue = formData[field as keyof typeof formData];
        updateData = { [field]: fieldValue };
      }
      // Handle client fields
      else if (['subjects_client', 'education_level', 'learning_goals', 'learning_preferences',
                 'budget_min', 'budget_max', 'sessions_per_week', 'session_duration',
                 'special_needs', 'additional_info_client'].includes(field)) {
        const currentClient = profile.professional_details?.client || {};
        const fieldValue = formData[field as keyof typeof formData];

        // Special handling for budget fields
        if (field === 'budget_min' || field === 'budget_max') {
          const min = field === 'budget_min' ? fieldValue : formData.budget_min;
          const max = field === 'budget_max' ? fieldValue : formData.budget_max;
          updateData = {
            professional_details: {
              ...profile.professional_details,
              client: {
                ...currentClient,
                budget_range: `${min}-${max}`
              }
            }
          };
        } else {
          // Map field names
          const fieldMapping: Record<string, string> = {
            'subjects_client': 'subjects',
            'additional_info_client': 'additional_info'
          };
          const dbField = fieldMapping[field] || field;

          updateData = {
            professional_details: {
              ...profile.professional_details,
              client: {
                ...currentClient,
                [dbField]: fieldValue
              }
            }
          };
        }
      }
      // Handle agent fields
      else if (['agency_name', 'agency_size', 'years_in_business', 'description',
                'commission_rate', 'student_capacity', 'number_of_tutors',
                'website', 'agent_additional_info'].includes(field)) {
        const currentAgent = profile.professional_details?.agent || {};
        const fieldValue = formData[field as keyof typeof formData];

        // Map field names
        const fieldMapping: Record<string, string> = {
          'agent_additional_info': 'additional_info'
        };
        const dbField = fieldMapping[field] || field;

        updateData = {
          professional_details: {
            ...profile.professional_details,
            agent: {
              ...currentAgent,
              [dbField]: fieldValue
            }
          }
        };
      }
      // Handle tutor fields
      else if (['status', 'academic_qualifications', 'key_stages', 'teaching_professional_qualifications',
                'subjects', 'teaching_experience', 'session_type', 'tutoring_experience',
                'one_on_one_rate', 'group_session_rate', 'delivery_mode'].includes(field)) {
        const currentTutor = profile.professional_details?.tutor || {};
        const fieldValue = formData[field as keyof typeof formData];

        // Map field names (form field name → database field name)
        const fieldMapping: Record<string, string> = {
          'session_type': 'session_types' // Form uses singular, DB uses plural
        };
        const dbField = fieldMapping[field] || field;

        updateData = {
          professional_details: {
            ...profile.professional_details,
            tutor: {
              ...currentTutor,
              [dbField]: fieldValue
            }
          }
        };
      }

      await onSave(updateData);
      setEditingField(null);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelField = (field: EditingField) => {
    if (!field) return;

    // Reset field to profile value
    if (field === 'bio') {
      setFormData(prev => ({ ...prev, bio: profile.bio || '' }));
    } else if (field === 'dbs_certificate') {
      setFormData(prev => ({ ...prev, dbs_certificate: profile.dbs_certificate_number || '' }));
    } else {
      const profileValue = (profile.professional_details?.tutor as any)?.[field];
      setFormData(prev => ({
        ...prev,
        [field]: Array.isArray(profileValue) ? profileValue.join(', ') : profileValue?.toString() || '',
      }));
    }

    setEditingField(null);
  };

  const handleFieldClick = (field: EditingField) => {
    setEditingField(field);
  };

  // Safety button handlers (manual save/cancel)
  const handleSaveAll = async () => {
    if (editingField) {
      await handleSaveField(editingField);
    }
  };

  const handleCancelAll = () => {
    if (editingField) {
      handleCancelField(editingField);
    }
  };

  // Auto-save on blur with 150ms delay (matching PersonalInfoForm)
  const handleBlur = (field: EditingField) => {
    if (!field) return;
    if (isSaving) return; // Prevent re-triggering while saving

    setTimeout(() => {
      if (editingField !== field) return;

      const currentValue = formData[field as keyof typeof formData];
      let originalValue: any = '';

      if (field === 'bio') {
        originalValue = profile.bio || '';
      } else if (field === 'bio_video_url') {
        originalValue = profile.bio_video_url || '';
      } else if (field === 'dbs_certificate') {
        originalValue = profile.dbs_certificate_number || '';
      } else {
        // Check all three role data sources
        const tutorValue = (profile.professional_details?.tutor as any)?.[field];
        const clientValue = (profile.professional_details?.client as any)?.[field];
        const agentValue = (profile.professional_details?.agent as any)?.[field];

        originalValue = tutorValue || clientValue || agentValue || '';

        // Handle arrays
        if (Array.isArray(originalValue)) {
          originalValue = originalValue;
        }
      }

      // Compare values (handle both string and array comparisons)
      const hasChanged = Array.isArray(currentValue)
        ? JSON.stringify(currentValue) !== JSON.stringify(originalValue)
        : currentValue !== originalValue;

      if (hasChanged) {
        handleSaveField(field);
      } else {
        setEditingField(null);
      }
    }, 150);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = async (e: React.KeyboardEvent, field: EditingField) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelField(field);
    } else if (e.key === 'Enter' && field !== 'bio' && field !== 'description' && field !== 'additional_info_client' && field !== 'agent_additional_info') {
      e.preventDefault();
      await handleSaveField(field);
    }
  };

  // Availability/Unavailability helper functions
  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
    if (availErrors.days) {
      setAvailErrors(prev => ({ ...prev, days: undefined }));
    }
  };

  const validateAvailability = () => {
    const newErrors: { days?: string; dates?: string; times?: string } = {};

    if (availabilityType === 'recurring' && selectedDays.length === 0) {
      newErrors.days = 'Please select at least one day';
    }

    if (!availFromDate) {
      newErrors.dates = 'Please select a start date';
    }

    if (availabilityType === 'recurring' && !availToDate) {
      newErrors.dates = 'Please select an end date for recurring availability';
    }

    if (startTime >= endTime) {
      newErrors.times = 'End time must be after start time';
    }

    setAvailErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateUnavailability = () => {
    const newErrors: { dates?: string } = {};

    if (!unavailFromDate) {
      newErrors.dates = 'Please select a start date';
    }

    if (!unavailToDate) {
      newErrors.dates = 'Please select an end date';
    }

    setUnavailErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddAvailability = () => {
    if (!validateAvailability()) return;

    const newPeriod: AvailabilityPeriod = {
      id: Date.now().toString(),
      type: availabilityType,
      days: availabilityType === 'recurring' ? selectedDays : undefined,
      fromDate: availFromDate,
      toDate: availabilityType === 'recurring' ? availToDate : undefined,
      startTime,
      endTime
    };

    setAvailabilityPeriods([...availabilityPeriods, newPeriod]);

    // Reset form
    setSelectedDays([]);
    setAvailFromDate('');
    setAvailToDate('');
    setStartTime('9:00 AM');
    setEndTime('5:00 PM');
    setAvailErrors({});
  };

  const handleAddUnavailability = () => {
    if (!validateUnavailability()) return;

    const newPeriod: UnavailabilityPeriod = {
      id: Date.now().toString(),
      fromDate: unavailFromDate,
      toDate: unavailToDate
    };

    setUnavailabilityPeriods([...unavailabilityPeriods, newPeriod]);

    // Reset form
    setUnavailFromDate('');
    setUnavailToDate('');
    setUnavailErrors({});
  };

  const handleRemoveAvailability = (id: string) => {
    setAvailabilityPeriods(availabilityPeriods.filter(p => p.id !== id));
  };

  const handleRemoveUnavailability = (id: string) => {
    setUnavailabilityPeriods(unavailabilityPeriods.filter(p => p.id !== id));
  };

  const formatAvailabilityText = (period: AvailabilityPeriod) => {
    if (period.type === 'recurring') {
      const daysList = period.days?.join(', ');
      return `Every ${daysList}, ${period.startTime} - ${period.endTime}`;
    } else {
      return `${period.fromDate}, ${period.startTime} - ${period.endTime}`;
    }
  };

  const formatUnavailabilityText = (period: UnavailabilityPeriod) => {
    return `${period.fromDate} - ${period.toDate}`;
  };

  const recurringPeriods = availabilityPeriods.filter(p => p.type === 'recurring');
  const oneTimePeriods = availabilityPeriods.filter(p => p.type === 'one-time');

  // DocumentUploadField component for Trust and Verification
  const DocumentUploadField = ({
    label,
    documentType,
    currentDocumentUrl,
    onUploadSuccess,
  }: {
    label: string;
    documentType: 'identity' | 'dbs' | 'address';
    currentDocumentUrl?: string | null;
    onUploadSuccess: (url: string) => void;
  }) => {
    const [uploadedFileName, setUploadedFileName] = useState<string>('');
    const [uploading, setUploading] = useState(false);

    const { handleFileSelect, error: uploadError } = useDocumentUpload({
      documentType,
      onUploadSuccess: async (url) => {
        onUploadSuccess(url);
        setUploadedFileName('Document uploaded');
      },
      onUploadError: (error) => {
        console.error(`Upload error for ${documentType}:`, error);
      },
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && profile.id) {
        setUploading(true);
        try {
          await handleFileSelect(file, profile.id);
        } finally {
          setUploading(false);
        }
      }
    };

    return (
      <HubForm.Field label={label}>
        <div
          style={{
            padding: '24px',
            backgroundColor: '#ffffff',
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            cursor: 'pointer',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
          onClick={() => document.getElementById(`${documentType}Upload`)?.click()}
        >
          <input
            id={`${documentType}Upload`}
            type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {uploading ? (
            <span style={{ color: '#6b7280', fontSize: '14px' }}>Uploading...</span>
          ) : currentDocumentUrl || uploadedFileName ? (
            <>
              <span style={{ color: '#059669', fontSize: '16px', fontWeight: '500' }}>
                ✓ Document uploaded
              </span>
              <span style={{ color: '#6b7280', fontSize: '13px' }}>
                Click to replace
              </span>
            </>
          ) : (
            <>
              <span style={{ color: '#9ca3af', fontSize: '16px', fontWeight: '500' }}>
                Click to upload
              </span>
              <span style={{ color: '#9ca3af', fontSize: '13px' }}>
                JPG, PNG, PDF (max 10MB)
              </span>
            </>
          )}
        </div>
        {uploadError && (
          <span style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px' }}>
            {uploadError}
          </span>
        )}
      </HubForm.Field>
    );
  };

  const renderField = (
    field: EditingField,
    label: string,
    type: FieldType = 'text',
    placeholder?: string,
    options?: { value: string; label: string }[]
  ) => {
    if (!field) return null;

    const fieldKey = field as keyof typeof formData;
    const isEditing = editingField === field;
    const fieldValue = formData[fieldKey];

    // Display value handling for different field types
    const displayValue = Array.isArray(fieldValue)
      ? (fieldValue.length > 0 ? fieldValue.join(', ') : '')
      : (typeof fieldValue === 'object' && fieldValue !== null)
        ? ''  // Don't render objects directly
        : fieldValue;

    return (
      <HubForm.Field
        label={label}
        isEditing={isEditing}
        onClick={() => !isEditing && handleFieldClick(field)}
      >
        {isEditing ? (
          <>
            {type === 'multiselect' ? (
              <div onBlur={() => handleBlur(field)}>
                <MultiSelectDropdown
                  triggerLabel={Array.isArray(fieldValue) && fieldValue.length > 0
                    ? fieldValue.join(', ')
                    : `Select ${label.toLowerCase()}...`}
                  options={options || []}
                  selectedValues={Array.isArray(fieldValue) ? fieldValue : []}
                  onSelectionChange={(values) => handleMultiSelectChange(fieldKey, values)}
                />
              </div>
            ) : type === 'select' ? (
              <select
                ref={(el) => { inputRefs.current[field] = el; }}
                name={fieldKey}
                value={fieldValue as string}
                onChange={handleChange}
                onBlur={() => handleBlur(field)}
                onKeyDown={(e) => handleKeyDown(e, field)}
                disabled={isSaving}
                {...(isSaving && { style: { opacity: 0.6, cursor: 'wait' } })}
              >
                <option value="">Select {label.toLowerCase()}</option>
                {options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : type === 'textarea' ? (
              <textarea
                ref={(el) => { inputRefs.current[field] = el; }}
                name={fieldKey}
                value={fieldValue as string}
                onChange={handleChange}
                onBlur={() => handleBlur(field)}
                onKeyDown={(e) => handleKeyDown(e, field)}
                placeholder={placeholder}
                disabled={isSaving}
                maxLength={1000}
                rows={4}
                {...(isSaving && { style: { opacity: 0.6, cursor: 'wait' } })}
              />
            ) : (
              <input
                ref={(el) => { inputRefs.current[field] = el; }}
                type={type}
                name={fieldKey}
                value={fieldValue as string}
                onChange={handleChange}
                onBlur={() => handleBlur(field)}
                onKeyDown={(e) => handleKeyDown(e, field)}
                placeholder={placeholder}
                disabled={isSaving}
                {...(isSaving && { style: { opacity: 0.6, cursor: 'wait' } })}
              />
            )}
          </>
        ) : (
          <>
            {displayValue || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>{placeholder || `Click to add ${label.toLowerCase()}...`}</span>}
          </>
        )}
      </HubForm.Field>
    );
  };

  // Show role-specific content based on activeRole
  const renderRoleSpecificContent = () => {
    // For clients (seekers), show complete client professional info
    if (activeRole === 'client') {
      return (
        <HubForm.Root>
          {/* About/Bio */}
          <HubForm.Section>
            <HubForm.Grid columns={1}>
              {renderField('bio', 'About', 'textarea', 'Tell tutors about your learning goals and what you\'re looking for')}
            </HubForm.Grid>
          </HubForm.Section>

          {/* Subjects and Education Level */}
          <HubForm.Section>
            <HubForm.Grid>
              {renderField('subjects_client', 'Subjects', 'multiselect', 'Select subjects', subjectsOptions)}
              {renderField('education_level', 'Education Level', 'select', 'Select your current level', educationLevelOptions)}
            </HubForm.Grid>
          </HubForm.Section>

          {/* Learning Goals and Learning Preferences */}
          <HubForm.Section>
            <HubForm.Grid>
              {renderField('learning_goals', 'Learning Goals', 'multiselect', 'Select your goals', learningGoalsOptions)}
              {renderField('learning_preferences', 'Learning Preferences', 'multiselect', 'Select preferences', learningPreferencesOptions)}
            </HubForm.Grid>
          </HubForm.Section>

          {/* Budget Range */}
          <HubForm.Section>
            <HubForm.Grid>
              {renderField('budget_min', 'Minimum Budget (£/hour)', 'number', '£20')}
              {renderField('budget_max', 'Maximum Budget (£/hour)', 'number', '£50')}
            </HubForm.Grid>
          </HubForm.Section>

          {/* Sessions Per Week and Session Duration */}
          <HubForm.Section>
            <HubForm.Grid>
              {renderField('sessions_per_week', 'Sessions Per Week', 'select', 'Select frequency', sessionsPerWeekOptions)}
              {renderField('session_duration', 'Session Duration', 'select', 'Select duration', sessionDurationOptions)}
            </HubForm.Grid>
          </HubForm.Section>

          {/* Special Needs */}
          <HubForm.Section>
            <HubForm.Grid>
              {renderField('special_needs', 'Special Educational Needs (SEN)', 'multiselect', 'Select if applicable', specialNeedsOptions)}
              <div></div>
            </HubForm.Grid>
          </HubForm.Section>

          {/* Availability Section */}
          <HubForm.Section title="Availability">
            <div className={styles.availabilityGrid}>
              {/* Left Column: Availability Periods */}
              <div>
                {/* Availability Type */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Availability Periods</label>
                  <div className={styles.dateGrid}>
                    <button
                      type="button"
                      className={`${styles.checkboxItem} ${availabilityType === 'recurring' ? styles.selected : ''}`}
                      onClick={() => setAvailabilityType('recurring')}
                    >
                      Recurring
                    </button>
                    <button
                      type="button"
                      className={`${styles.checkboxItem} ${availabilityType === 'one-time' ? styles.selected : ''}`}
                      onClick={() => setAvailabilityType('one-time')}
                    >
                      One-time
                    </button>
                  </div>
                </div>

                {/* Days of Week (only for recurring) */}
                {availabilityType === 'recurring' && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Days of Week</label>
                    {availErrors.days && (
                      <p className={styles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                        {availErrors.days}
                      </p>
                    )}
                    <div className={styles.daysGrid}>
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day}
                          type="button"
                          className={`${styles.checkboxItem} ${selectedDays.includes(day) ? styles.selected : ''}`}
                          onClick={() => toggleDay(day)}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date Pickers */}
                <div className={styles.formGroup}>
                  {availErrors.dates && (
                    <p className={styles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                      {availErrors.dates}
                    </p>
                  )}
                  <div className={availabilityType === 'recurring' ? styles.dateGrid : ''}>
                    <HubForm.Field label="From">
                      <DatePicker
                        selected={availFromDate ? new Date(availFromDate) : undefined}
                        onSelect={(date) => {
                          setAvailFromDate(date ? date.toISOString().split('T')[0] : '');
                          setAvailErrors(prev => ({ ...prev, dates: undefined }));
                        }}
                        placeholder="Select start date"
                      />
                    </HubForm.Field>
                    {availabilityType === 'recurring' && (
                      <HubForm.Field label="To">
                        <DatePicker
                          selected={availToDate ? new Date(availToDate) : undefined}
                          onSelect={(date) => {
                            setAvailToDate(date ? date.toISOString().split('T')[0] : '');
                            setAvailErrors(prev => ({ ...prev, dates: undefined }));
                          }}
                          placeholder="Select end date"
                        />
                      </HubForm.Field>
                    )}
                  </div>
                </div>

                {/* Time Pickers */}
                <div className={styles.formGroup}>
                  {availErrors.times && (
                    <p className={styles.errorText} style={{ marginBottom: '8px' }}>
                      {availErrors.times}
                    </p>
                  )}
                  <div className={styles.timeGrid}>
                    <CustomTimePicker
                      label="Start time"
                      value={startTime}
                      onChange={setStartTime}
                      onClearError={() => setAvailErrors(prev => ({ ...prev, times: undefined }))}
                    />
                    <CustomTimePicker
                      label="End time"
                      value={endTime}
                      onChange={setEndTime}
                      onClearError={() => setAvailErrors(prev => ({ ...prev, times: undefined }))}
                    />
                  </div>
                </div>

                {/* Add Button */}
                <div style={{ marginBottom: '32px' }}>
                  <button
                    type="button"
                    onClick={handleAddAvailability}
                    className={styles.buttonPrimary}
                    style={{ width: '100%' }}
                  >
                    Add
                  </button>
                </div>

                {/* Summary Sections */}
                {recurringPeriods.length > 0 && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Recurring Availability</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {recurringPeriods.map(period => (
                        <div
                          key={period.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border, #dfe1e5)'
                          }}
                        >
                          <span style={{ fontSize: '0.875rem' }}>{formatAvailabilityText(period)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAvailability(period.id)}
                            className={styles.buttonSecondary}
                            style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {oneTimePeriods.length > 0 && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>One-time Availability</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {oneTimePeriods.map(period => (
                        <div
                          key={period.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border, #dfe1e5)'
                          }}
                        >
                          <span style={{ fontSize: '0.875rem' }}>{formatAvailabilityText(period)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAvailability(period.id)}
                            className={styles.buttonSecondary}
                            style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Unavailability Periods */}
              <div>
                {/* Date Pickers */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Unavailability Periods</label>
                  {unavailErrors.dates && (
                    <p className={styles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                      {unavailErrors.dates}
                    </p>
                  )}
                  <div className={styles.dateGrid}>
                    <HubForm.Field label="From">
                      <DatePicker
                        selected={unavailFromDate ? new Date(unavailFromDate) : undefined}
                        onSelect={(date) => {
                          setUnavailFromDate(date ? date.toISOString().split('T')[0] : '');
                          setUnavailErrors(prev => ({ ...prev, dates: undefined }));
                        }}
                        placeholder="Select start date"
                      />
                    </HubForm.Field>
                    <HubForm.Field label="To">
                      <DatePicker
                        selected={unavailToDate ? new Date(unavailToDate) : undefined}
                        onSelect={(date) => {
                          setUnavailToDate(date ? date.toISOString().split('T')[0] : '');
                          setUnavailErrors(prev => ({ ...prev, dates: undefined }));
                        }}
                        placeholder="Select end date"
                      />
                    </HubForm.Field>
                  </div>
                </div>

                {/* Add Button */}
                <div style={{ marginBottom: '32px' }}>
                  <button
                    type="button"
                    onClick={handleAddUnavailability}
                    className={styles.buttonPrimary}
                    style={{ width: '100%' }}
                  >
                    Add
                  </button>
                </div>

                {/* Summary Section */}
                {unavailabilityPeriods.length > 0 && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Unavailable Period</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {unavailabilityPeriods.map(period => (
                        <div
                          key={period.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border, #dfe1e5)'
                          }}
                        >
                          <span style={{ fontSize: '0.875rem' }}>{formatUnavailabilityText(period)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveUnavailability(period.id)}
                            className={styles.buttonSecondary}
                            style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Note */}
            <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                Your professional information improves the accuracy and quality of our matching process. Keeping your details complete and current enables us to connect you with the right opportunities.
              </p>
            </div>
          </HubForm.Section>

          {/* Action Buttons */}
          <HubForm.Actions>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleCancelAll}
              disabled={!editingField || isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSaveAll}
              disabled={!editingField || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </HubForm.Actions>
        </HubForm.Root>
      );
    }

    // For agents, show agent-specific fields
    if (activeRole === 'agent') {
      return (
        <HubForm.Root>
          {/* Agency Name and Agency Size */}
          <HubForm.Section>
            <HubForm.Grid>
              {renderField('agency_name', 'Agency Name', 'text', 'Enter agency name')}
              {renderField('agency_size', 'Agency Size', 'text', 'e.g., 5-10 tutors')}
            </HubForm.Grid>
          </HubForm.Section>

          {/* Years in Business and Commission Rate */}
          <HubForm.Section>
            <HubForm.Grid>
              {renderField('years_in_business', 'Years in Business', 'text', 'e.g., 5 years')}
              {renderField('commission_rate', 'Commission Rate', 'text', 'e.g., 15%')}
            </HubForm.Grid>
          </HubForm.Section>

          {/* About Your Agency */}
          <HubForm.Section>
            <HubForm.Grid columns={1}>
              {renderField('description', 'About Your Agency', 'textarea', 'Describe your agency and the services you provide')}
            </HubForm.Grid>
          </HubForm.Section>

          {/* Student Capacity and Number of Tutors */}
          <HubForm.Section>
            <HubForm.Grid>
              {renderField('student_capacity', 'Student Capacity', 'text', 'e.g., 50 students')}
              {renderField('number_of_tutors', 'Current Number of Tutors', 'text', 'e.g., 8 tutors')}
            </HubForm.Grid>
          </HubForm.Section>

          {/* Website */}
          <HubForm.Section>
            <HubForm.Grid columns={1}>
              {renderField('website', 'Website', 'text', 'https://yourwebsite.com')}
            </HubForm.Grid>
          </HubForm.Section>

          {/* Additional Information */}
          <HubForm.Section>
            <HubForm.Grid columns={1}>
              {renderField('agent_additional_info', 'Additional Information', 'textarea', 'Any other information about your agency')}
            </HubForm.Grid>
          </HubForm.Section>

          {/* Trust and Verification */}
          <HubForm.Section title="Trust and Verification">
            {/* 1. Proof of Address */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Proof of Address
              </h4>
              <HubForm.Grid>
                <DocumentUploadField
                  label="Address Document"
                  documentType="address"
                  currentDocumentUrl={profile.proof_of_address_url}
                  onUploadSuccess={async (url) => {
                    await onSave({ proof_of_address_url: url });
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <HubForm.Field label="Document Type">
                    <div style={{ position: 'relative' }}>
                      <Select
                        value={formData.proof_of_address_type}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, proof_of_address_type: e.target.value }));
                          handleBlur('proof_of_address_type');
                        }}
                        options={[
                          { value: 'Utility Bill', label: 'Utility Bill' },
                          { value: 'Bank Statement', label: 'Bank Statement' },
                          { value: 'Tax Bill', label: 'Tax Bill' },
                          { value: 'Solicitor Letter', label: 'Solicitor Letter' },
                        ]}
                        placeholder="Select document type"
                      />
                      <div style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: '#6b7280'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </HubForm.Field>
                  <HubForm.Field label="Issue Date">
                    <DatePicker
                      selected={formData.address_document_issue_date ? new Date(formData.address_document_issue_date) : undefined}
                      onSelect={(date) => {
                        setFormData(prev => ({ ...prev, address_document_issue_date: date ? date.toISOString().split('T')[0] : '' }));
                        handleBlur('address_document_issue_date');
                      }}
                      placeholder="Select issue date"
                    />
                  </HubForm.Field>
                </div>
              </HubForm.Grid>
            </div>

            {/* 2. Government ID */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Government ID (Passport or Driving License)
              </h4>
              <HubForm.Grid>
                <DocumentUploadField
                  label="ID Document"
                  documentType="identity"
                  currentDocumentUrl={profile.identity_verification_document_url}
                  onUploadSuccess={async (url) => {
                    await onSave({ identity_verification_document_url: url });
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {renderField('identity_document_number', 'Document Number', 'text', 'Enter passport or license number')}
                  <div className={styles.dateGrid}>
                    <HubForm.Field label="Issue Date">
                      <DatePicker
                        selected={formData.identity_issue_date ? new Date(formData.identity_issue_date) : undefined}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, identity_issue_date: date ? date.toISOString().split('T')[0] : '' }));
                          handleBlur('identity_issue_date');
                        }}
                        placeholder="Select issue date"
                      />
                    </HubForm.Field>
                    <HubForm.Field label="Expiry Date">
                      <DatePicker
                        selected={formData.identity_expiry_date ? new Date(formData.identity_expiry_date) : undefined}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, identity_expiry_date: date ? date.toISOString().split('T')[0] : '' }));
                          handleBlur('identity_expiry_date');
                        }}
                        placeholder="Select expiry date"
                      />
                    </HubForm.Field>
                  </div>
                </div>
              </HubForm.Grid>
            </div>

            {/* 3. DBS Certificate */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                DBS Certificate
              </h4>
              <HubForm.Grid>
                <DocumentUploadField
                  label="DBS Document"
                  documentType="dbs"
                  currentDocumentUrl={profile.dbs_certificate_url}
                  onUploadSuccess={async (url) => {
                    await onSave({ dbs_certificate_url: url });
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {renderField('dbs_certificate_number', 'Certificate Number', 'text', 'Enter DBS certificate number')}
                  <div className={styles.dateGrid}>
                    <HubForm.Field label="Issue Date">
                      <DatePicker
                        selected={formData.dbs_certificate_date ? new Date(formData.dbs_certificate_date) : undefined}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, dbs_certificate_date: date ? date.toISOString().split('T')[0] : '' }));
                          handleBlur('dbs_certificate_date');
                        }}
                        placeholder="Select issue date"
                      />
                    </HubForm.Field>
                    <HubForm.Field label="Expiry Date">
                      <DatePicker
                        selected={formData.dbs_expiry_date ? new Date(formData.dbs_expiry_date) : undefined}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, dbs_expiry_date: date ? date.toISOString().split('T')[0] : '' }));
                          handleBlur('dbs_expiry_date');
                        }}
                        placeholder="Select expiry date"
                      />
                    </HubForm.Field>
                  </div>
                </div>
              </HubForm.Grid>
            </div>
          </HubForm.Section>

          {/* Availability Note */}
          <HubForm.Section>
            <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                <strong>Note:</strong> To manage multi-select fields like Services Offered, Subject Specializations, Education Levels, Coverage Areas, and Certifications, please complete the onboarding process again or contact support.
              </p>
            </div>
          </HubForm.Section>

          {/* Action Buttons */}
          <HubForm.Actions>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleCancelAll}
              disabled={!editingField || isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSaveAll}
              disabled={!editingField || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </HubForm.Actions>
        </HubForm.Root>
      );
    }

    // Default to provider/tutor fields
    return (
      <HubForm.Root>
        {/* About */}
        <HubForm.Section>
          <HubForm.Grid columns={1}>
            {renderField('bio', 'About', 'textarea', 'Describe your tutoring or teaching style, strengths, and what areas you specialise in')}
          </HubForm.Grid>
        </HubForm.Section>

        {/* 30-Second Intro Video and Status */}
        <HubForm.Section>
          <HubForm.Grid>
            {renderField('bio_video_url', '30-Second Intro Video (Optional)', 'text', 'Paste YouTube, Loom, or Vimeo URL for +5 CaaS points')}
            {renderField('status', 'Status', 'select', 'Select status', statusOptions)}
          </HubForm.Grid>
        </HubForm.Section>

        {/* Key Stages and Academic Qualifications */}
        <HubForm.Section>
          <HubForm.Grid>
            {renderField('key_stages', 'Key Stages', 'multiselect', 'Select key stage', keyStagesOptions)}
            {renderField('academic_qualifications', 'Academic Qualifications', 'multiselect', 'Select qualifications', academicQualificationsOptions)}
          </HubForm.Grid>
        </HubForm.Section>

        {/* Subjects and Teaching Professional Qualifications */}
        <HubForm.Section>
          <HubForm.Grid>
            {renderField('subjects', 'Subjects', 'multiselect', 'Mathematics, English', subjectsOptions)}
            {renderField('teaching_professional_qualifications', 'Teaching Professional Qualifications', 'multiselect', 'Select qualification', teachingProfessionalQualificationsOptions)}
          </HubForm.Grid>
        </HubForm.Section>

        {/* Session Type and Teaching Experience */}
        <HubForm.Section>
          <HubForm.Grid>
            {renderField('session_type', 'Session Type', 'multiselect', 'Select session type', sessionTypeOptions)}
            {renderField('teaching_experience', 'Teaching Experience', 'select', 'Select experience', teachingExperienceOptions)}
          </HubForm.Grid>
        </HubForm.Section>

        {/* Delivery Mode and Tutoring Experience */}
        <HubForm.Section>
          <HubForm.Grid>
            {renderField('delivery_mode', 'Delivery Mode', 'multiselect', 'Select delivery mode', deliveryModeOptions)}
            {renderField('tutoring_experience', 'Tutoring Experience', 'select', 'Select tutoring experience', tutoringExperienceOptions)}
          </HubForm.Grid>
        </HubForm.Section>

        {/* Rates */}
        <HubForm.Section>
          <HubForm.Grid>
            {renderField('one_on_one_rate', 'One-on-One Session Rate (1 hour session, 1 student)', 'number', '£50')}
            {renderField('group_session_rate', 'Group Session Rate (1 hour session, 1 student)', 'number', '£25')}
          </HubForm.Grid>
        </HubForm.Section>

        {/* Trust and Verification */}
        <HubForm.Section title="Trust and Verification">
          {/* 1. Proof of Address */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
              Proof of Address
            </h4>
            <HubForm.Grid>
              <DocumentUploadField
                label="Address Document"
                documentType="address"
                currentDocumentUrl={profile.proof_of_address_url}
                onUploadSuccess={async (url) => {
                  await onSave({ proof_of_address_url: url });
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <HubForm.Field label="Document Type">
                  <div style={{ position: 'relative' }}>
                    <Select
                      value={formData.proof_of_address_type}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, proof_of_address_type: e.target.value }));
                        handleBlur('proof_of_address_type');
                      }}
                      options={[
                        { value: 'Utility Bill', label: 'Utility Bill' },
                        { value: 'Bank Statement', label: 'Bank Statement' },
                        { value: 'Tax Bill', label: 'Tax Bill' },
                        { value: 'Solicitor Letter', label: 'Solicitor Letter' },
                      ]}
                      placeholder="Select document type"
                    />
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#6b7280'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </HubForm.Field>
                <HubForm.Field label="Issue Date">
                  <DatePicker
                    selected={formData.address_document_issue_date ? new Date(formData.address_document_issue_date) : undefined}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, address_document_issue_date: date ? date.toISOString().split('T')[0] : '' }));
                      handleBlur('address_document_issue_date');
                    }}
                    placeholder="Select issue date"
                  />
                </HubForm.Field>
              </div>
            </HubForm.Grid>
          </div>

          {/* 2. Government ID */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
              Government ID (Passport or Driving License)
            </h4>
            <HubForm.Grid>
              <DocumentUploadField
                label="ID Document"
                documentType="identity"
                currentDocumentUrl={profile.identity_verification_document_url}
                onUploadSuccess={async (url) => {
                  await onSave({ identity_verification_document_url: url });
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {renderField('identity_document_number', 'Document Number', 'text', 'Enter passport or license number')}
                <div className={styles.dateGrid}>
                  <HubForm.Field label="Issue Date">
                    <DatePicker
                      selected={formData.identity_issue_date ? new Date(formData.identity_issue_date) : undefined}
                      onSelect={(date) => {
                        setFormData(prev => ({ ...prev, identity_issue_date: date ? date.toISOString().split('T')[0] : '' }));
                        handleBlur('identity_issue_date');
                      }}
                      placeholder="Select issue date"
                    />
                  </HubForm.Field>
                  <HubForm.Field label="Expiry Date">
                    <DatePicker
                      selected={formData.identity_expiry_date ? new Date(formData.identity_expiry_date) : undefined}
                      onSelect={(date) => {
                        setFormData(prev => ({ ...prev, identity_expiry_date: date ? date.toISOString().split('T')[0] : '' }));
                        handleBlur('identity_expiry_date');
                      }}
                      placeholder="Select expiry date"
                    />
                  </HubForm.Field>
                </div>
              </div>
            </HubForm.Grid>
          </div>

          {/* 3. DBS Certificate */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
              DBS Certificate
            </h4>
            <HubForm.Grid>
              <DocumentUploadField
                label="DBS Document"
                documentType="dbs"
                currentDocumentUrl={profile.dbs_certificate_url}
                onUploadSuccess={async (url) => {
                  await onSave({ dbs_certificate_url: url });
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {renderField('dbs_certificate_number', 'Certificate Number', 'text', 'Enter DBS certificate number')}
                <div className={styles.dateGrid}>
                  <HubForm.Field label="Issue Date">
                    <DatePicker
                      selected={formData.dbs_certificate_date ? new Date(formData.dbs_certificate_date) : undefined}
                      onSelect={(date) => {
                        setFormData(prev => ({ ...prev, dbs_certificate_date: date ? date.toISOString().split('T')[0] : '' }));
                        handleBlur('dbs_certificate_date');
                      }}
                      placeholder="Select issue date"
                    />
                  </HubForm.Field>
                  <HubForm.Field label="Expiry Date">
                    <DatePicker
                      selected={formData.dbs_expiry_date ? new Date(formData.dbs_expiry_date) : undefined}
                      onSelect={(date) => {
                        setFormData(prev => ({ ...prev, dbs_expiry_date: date ? date.toISOString().split('T')[0] : '' }));
                        handleBlur('dbs_expiry_date');
                      }}
                      placeholder="Select expiry date"
                    />
                  </HubForm.Field>
                </div>
              </div>
            </HubForm.Grid>
          </div>
        </HubForm.Section>

        {/* Availability Section */}
        <HubForm.Section title="Availability">
          <div className={styles.availabilityGrid}>
            {/* Left Column: Availability Periods */}
            <div>
              {/* Availability Type */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Availability Periods</label>
                <div className={styles.dateGrid}>
                  <button
                    type="button"
                    className={`${styles.checkboxItem} ${availabilityType === 'recurring' ? styles.selected : ''}`}
                    onClick={() => setAvailabilityType('recurring')}
                  >
                    Recurring
                  </button>
                  <button
                    type="button"
                    className={`${styles.checkboxItem} ${availabilityType === 'one-time' ? styles.selected : ''}`}
                    onClick={() => setAvailabilityType('one-time')}
                  >
                    One-time
                  </button>
                </div>
              </div>

              {/* Days of Week (only for recurring) */}
              {availabilityType === 'recurring' && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Days of Week</label>
                  {availErrors.days && (
                    <p className={styles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                      {availErrors.days}
                    </p>
                  )}
                  <div className={styles.daysGrid}>
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day}
                        type="button"
                        className={`${styles.checkboxItem} ${selectedDays.includes(day) ? styles.selected : ''}`}
                        onClick={() => toggleDay(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Pickers */}
              <div className={styles.formGroup}>
                {availErrors.dates && (
                  <p className={styles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                    {availErrors.dates}
                  </p>
                )}
                <div className={availabilityType === 'recurring' ? styles.dateGrid : ''}>
                  <HubForm.Field label="From">
                    <DatePicker
                      selected={availFromDate ? new Date(availFromDate) : undefined}
                      onSelect={(date) => {
                        setAvailFromDate(date ? date.toISOString().split('T')[0] : '');
                        setAvailErrors(prev => ({ ...prev, dates: undefined }));
                      }}
                      placeholder="Select start date"
                    />
                  </HubForm.Field>
                  {availabilityType === 'recurring' && (
                    <HubForm.Field label="To">
                      <DatePicker
                        selected={availToDate ? new Date(availToDate) : undefined}
                        onSelect={(date) => {
                          setAvailToDate(date ? date.toISOString().split('T')[0] : '');
                          setAvailErrors(prev => ({ ...prev, dates: undefined }));
                        }}
                        placeholder="Select end date"
                      />
                    </HubForm.Field>
                  )}
                </div>
              </div>

              {/* Time Pickers */}
              <div className={styles.formGroup}>
                {availErrors.times && (
                  <p className={styles.errorText} style={{ marginBottom: '8px' }}>
                    {availErrors.times}
                  </p>
                )}
                <div className={styles.timeGrid}>
                  <CustomTimePicker
                    label="Start time"
                    value={startTime}
                    onChange={setStartTime}
                    onClearError={() => setAvailErrors(prev => ({ ...prev, times: undefined }))}
                  />
                  <CustomTimePicker
                    label="End time"
                    value={endTime}
                    onChange={setEndTime}
                    onClearError={() => setAvailErrors(prev => ({ ...prev, times: undefined }))}
                  />
                </div>
              </div>

              {/* Add Button */}
              <div style={{ marginBottom: '32px' }}>
                <button
                  type="button"
                  onClick={handleAddAvailability}
                  className={styles.buttonPrimary}
                  style={{ width: '100%' }}
                >
                  Add
                </button>
              </div>

              {/* Summary Sections */}
              {recurringPeriods.length > 0 && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Recurring Availability</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recurringPeriods.map(period => (
                      <div
                        key={period.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border, #dfe1e5)'
                        }}
                      >
                        <span style={{ fontSize: '0.875rem' }}>{formatAvailabilityText(period)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAvailability(period.id)}
                          className={styles.buttonSecondary}
                          style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {oneTimePeriods.length > 0 && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>One-time Availability</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {oneTimePeriods.map(period => (
                      <div
                        key={period.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border, #dfe1e5)'
                        }}
                      >
                        <span style={{ fontSize: '0.875rem' }}>{formatAvailabilityText(period)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAvailability(period.id)}
                          className={styles.buttonSecondary}
                          style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Unavailability Periods */}
            <div>
              {/* Date Pickers */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Unavailability Periods</label>
                {unavailErrors.dates && (
                  <p className={styles.errorText} style={{ marginTop: '8px', marginBottom: '8px' }}>
                    {unavailErrors.dates}
                  </p>
                )}
                <div className={styles.dateGrid}>
                  <HubForm.Field label="From">
                    <DatePicker
                      selected={unavailFromDate ? new Date(unavailFromDate) : undefined}
                      onSelect={(date) => {
                        setUnavailFromDate(date ? date.toISOString().split('T')[0] : '');
                        setUnavailErrors(prev => ({ ...prev, dates: undefined }));
                      }}
                      placeholder="Select start date"
                    />
                  </HubForm.Field>
                  <HubForm.Field label="To">
                    <DatePicker
                      selected={unavailToDate ? new Date(unavailToDate) : undefined}
                      onSelect={(date) => {
                        setUnavailToDate(date ? date.toISOString().split('T')[0] : '');
                        setUnavailErrors(prev => ({ ...prev, dates: undefined }));
                      }}
                      placeholder="Select end date"
                    />
                  </HubForm.Field>
                </div>
              </div>

              {/* Add Button */}
              <div style={{ marginBottom: '32px' }}>
                <button
                  type="button"
                  onClick={handleAddUnavailability}
                  className={styles.buttonPrimary}
                  style={{ width: '100%' }}
                >
                  Add
                </button>
              </div>

              {/* Summary Section */}
              {unavailabilityPeriods.length > 0 && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Unavailable Period</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {unavailabilityPeriods.map(period => (
                      <div
                        key={period.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border, #dfe1e5)'
                        }}
                      >
                        <span style={{ fontSize: '0.875rem' }}>{formatUnavailabilityText(period)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUnavailability(period.id)}
                          className={styles.buttonSecondary}
                          style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Availability Note */}
          <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              Your professional information improves the accuracy and quality of our matching process. Keeping your details complete and current enables us to connect you with the right opportunities.
            </p>
          </div>
        </HubForm.Section>

        {/* Action Buttons */}
        <HubForm.Actions>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleCancelAll}
            disabled={!editingField || isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSaveAll}
            disabled={!editingField || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </HubForm.Actions>
      </HubForm.Root>
    );
  };

  return renderRoleSpecificContent();
}
