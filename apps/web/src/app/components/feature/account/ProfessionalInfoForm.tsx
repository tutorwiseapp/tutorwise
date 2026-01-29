'use client';

import { useState, useEffect, useRef } from 'react';
import type { Profile } from '@/types';
import HubForm from '@/app/components/hub/form/HubForm';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import CustomTimePicker from '@/app/components/feature/listings/create/shared-components/CustomTimePicker';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import Button from '@/app/components/ui/actions/Button';
import HubListItem from '@/app/components/hub/content/HubListItem/HubListItem';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { useFormConfigs } from '@/hooks/useFormConfig';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
import toast from 'react-hot-toast';
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
  // Client fields (aligned with Create Listing form labels)
  'status_client' | 'subjects_client' | 'key_stages_client' | 'levels_client' |
  'delivery_mode_client' | 'one_on_one_rate_client' | 'group_session_rate_client' |
  'session_type_client' | 'sessions_per_week' | 'session_duration' |
  'learning_goals' | 'learning_preferences' | 'special_needs' |
  'academic_qualifications_client' | 'teaching_qualifications_client' |
  'teaching_experience_client' | 'tutoring_experience_client' |
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

// Key stages options (aligned with onboarding - chronological order)
const keyStagesOptions = [
  { value: 'Primary Education (KS1-KS2) - Age 5 to 11', label: 'Primary Education (KS1-KS2) - Age 5 to 11' },
  { value: 'Secondary Education (KS3) - Age 11 to 14', label: 'Secondary Education (KS3) - Age 11 to 14' },
  { value: 'Secondary Education (KS4) - Age 14 to 16', label: 'Secondary Education (KS4) - Age 14 to 16' },
  { value: 'A-Levels - Age 16 to 18', label: 'A-Levels - Age 16 to 18' },
];

const teachingProfessionalQualificationsOptions = [
  { value: 'QTLS, QTS', label: 'QTLS, QTS' },
  { value: 'PGCE', label: 'PGCE' },
  { value: 'Teaching License', label: 'Teaching License' },
  { value: 'None', label: 'None' },
];

// Subjects options (aligned with onboarding - individual values for multi-select)
const subjectsOptions = [
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'English', label: 'English' },
  { value: 'Science', label: 'Science' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Biology', label: 'Biology' },
  { value: 'History', label: 'History' },
  { value: 'Geography', label: 'Geography' },
  { value: 'Languages', label: 'Languages' },
];

// Teaching experience options (aligned with onboarding - ascending order)
const teachingExperienceOptions = [
  { value: 'New Teacher (0-3 years)', label: 'New Teacher (0-3 years)' },
  { value: 'Experienced Teacher (4-7 years)', label: 'Experienced Teacher (4-7 years)' },
  { value: 'Senior Teacher (8+ years)', label: 'Senior Teacher (8+ years)' },
];

// Session type options (aligned with onboarding - individual values for multi-select)
const sessionTypeOptions = [
  { value: 'One-to-One Session', label: 'One-to-One Session' },
  { value: 'Group Session', label: 'Group Session' },
];

// Tutoring experience options (aligned with onboarding - ascending order)
const tutoringExperienceOptions = [
  { value: 'New Tutor (0-2 years)', label: 'New Tutor (0-2 years)' },
  { value: 'Experienced Tutor (3-5 years)', label: 'Experienced Tutor (3-5 years)' },
  { value: 'Expert Tutor (5+ years)', label: 'Expert Tutor (5+ years)' },
];

// Delivery mode options (aligned with onboarding - individual values for multi-select)
const deliveryModeOptions = [
  { value: 'Online', label: 'Online' },
  { value: 'In-person', label: 'In-person' },
  { value: 'Hybrid', label: 'Hybrid' },
];

// Client-specific field options (aligned with Create Listing form)
const whoNeedsTutoringOptions = [
  { value: 'myself', label: 'Myself' },
  { value: 'my_child', label: 'My Child' },
  { value: 'other', label: 'Someone Else' },
];

const clientSubjectsOptions = [
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'English', label: 'English' },
  { value: 'Science', label: 'Science' },
  { value: 'History', label: 'History' },
  { value: 'Geography', label: 'Geography' },
  { value: 'Languages', label: 'Languages' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Biology', label: 'Biology' },
];

const clientKeyStagesOptions = [
  { value: 'Primary Education (KS1-KS2) - Age 5 to 11', label: 'Primary Education (KS1-KS2) - Age 5 to 11' },
  { value: 'Secondary Education (KS3) - Age 11 to 14', label: 'Secondary Education (KS3) - Age 11 to 14' },
  { value: 'Secondary Education (KS4) - Age 14 to 16', label: 'Secondary Education (KS4) - Age 14 to 16' },
  { value: 'A-Levels - Age 16 to 18', label: 'A-Levels - Age 16 to 18' },
];

const clientLevelsOptions = [
  { value: 'Primary Education (KS1-KS2) - Age 5 to 11', label: 'Primary Education (KS1-KS2) - Age 5 to 11' },
  { value: 'Secondary Education (KS3) - Age 11 to 14', label: 'Secondary Education (KS3) - Age 11 to 14' },
  { value: 'Secondary Education (KS4) - Age 14 to 16', label: 'Secondary Education (KS4) - Age 14 to 16' },
  { value: 'A-Levels - Age 16 to 18', label: 'A-Levels - Age 16 to 18' },
  { value: 'University/Undergraduate', label: 'University/Undergraduate' },
];

const clientDeliveryModeOptions = [
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'In-person' },
  { value: 'hybrid', label: 'Hybrid (Online & In-person)' },
];

const clientSessionTypeOptions = [
  { value: 'One-to-One Session', label: 'One-to-One Session' },
  { value: 'Group Session', label: 'Group Session' },
];

// Legacy client options (kept for backward compatibility)
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

// General availability options (matching onboarding)
const dayOptions = DAYS_OF_WEEK.map(day => ({ value: day, label: day }));

const timeOptions = [
  { value: 'morning', label: 'Morning (6am-12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm-5pm)' },
  { value: 'evening', label: 'Evening (5pm-10pm)' },
  { value: 'all_day', label: 'All day (6am-10pm)' }
];

export default function ProfessionalInfoForm({ profile, onSave, activeRole }: ProfessionalInfoFormProps) {
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');

  // Refs for auto-focus
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement | null }>({});

  // Fetch dynamic form configs (with fallback to hardcoded values)
  const { configs } = useFormConfigs([
    { fieldName: 'status', context: 'account', fallback: { label: 'Status', placeholder: 'Select status', options: statusOptions } },
    { fieldName: 'academicQualifications', context: 'account', fallback: { label: 'Academic Qualifications', placeholder: 'Select qualifications', options: academicQualificationsOptions } },
    { fieldName: 'keyStages', context: 'account', fallback: { label: 'Key Stages', placeholder: 'Select key stages', options: keyStagesOptions } },
    { fieldName: 'teachingProfessionalQualifications', context: 'account', fallback: { label: 'Teaching Professional Qualifications', placeholder: 'Select qualifications', options: teachingProfessionalQualificationsOptions } },
    { fieldName: 'subjects', context: 'account', fallback: { label: 'Subjects', placeholder: 'Select subjects', options: subjectsOptions } },
    { fieldName: 'teachingExperience', context: 'account', fallback: { label: 'Teaching Experience', placeholder: 'Select experience', options: teachingExperienceOptions } },
    { fieldName: 'sessionType', context: 'account', fallback: { label: 'Session Type', placeholder: 'Select session types', options: sessionTypeOptions } },
    { fieldName: 'tutoringExperience', context: 'account', fallback: { label: 'Tutoring Experience', placeholder: 'Select experience', options: tutoringExperienceOptions } },
    { fieldName: 'deliveryMode', context: 'account', fallback: { label: 'Delivery Mode', placeholder: 'Select delivery modes', options: deliveryModeOptions } },
    { fieldName: 'educationLevel', context: 'account', fallback: { label: 'Education Level', placeholder: 'Select education level', options: educationLevelOptions } },
    { fieldName: 'learningGoals', context: 'account', fallback: { label: 'Learning Goals', placeholder: 'Select learning goals', options: learningGoalsOptions } },
    { fieldName: 'learningPreferences', context: 'account', fallback: { label: 'Learning Preferences', placeholder: 'Select preferences', options: learningPreferencesOptions } },
    { fieldName: 'specialNeeds', context: 'account', fallback: { label: 'Special Educational Needs', placeholder: 'Select special needs (if any)', options: specialNeedsOptions } },
    { fieldName: 'sessionsPerWeek', context: 'account', fallback: { label: 'Sessions Per Week', placeholder: 'Select sessions per week', options: sessionsPerWeekOptions } },
    { fieldName: 'sessionDuration', context: 'account', fallback: { label: 'Session Duration', placeholder: 'Select duration', options: sessionDurationOptions } },
    { fieldName: 'proofOfAddressType', context: 'account', fallback: { label: 'Document Type', placeholder: 'Select document type', options: [
      { value: 'Utility Bill', label: 'Utility Bill' },
      { value: 'Bank Statement', label: 'Bank Statement' },
      { value: 'Tax Bill', label: 'Tax Bill' },
      { value: 'Solicitor Letter', label: 'Solicitor Letter' }
    ] } }
  ]);

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

    // Client fields (aligned with Create Listing form)
    status_client: '', // Who Needs Tutoring
    subjects_client: [] as string[], // Preferred Subjects
    key_stages_client: [] as string[], // Preferred Key Stages
    levels_client: [] as string[], // Preferred Levels
    delivery_mode_client: [] as string[], // Preferred Delivery Mode
    one_on_one_rate_client: '', // Budget for One-to-One (£/hour)
    group_session_rate_client: '', // Budget for Group Sessions (£/hour)
    session_type_client: [] as string[], // Preferred Session Type
    sessions_per_week: '', // Preferred Sessions Per Week
    session_duration: '', // Preferred Session Duration
    learning_goals: [] as string[], // Learning Goals
    learning_preferences: [] as string[], // Learning Preferences
    special_needs: [] as string[], // Special Educational Needs (SEN)
    academic_qualifications_client: [] as string[], // Preferred Academic Qualifications
    teaching_qualifications_client: [] as string[], // Preferred Teaching Qualifications
    teaching_experience_client: '', // Preferred Teaching Experience
    tutoring_experience_client: '', // Preferred Tutoring Experience

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

  // General Availability state (from onboarding)
  const [generalDays, setGeneralDays] = useState<string[]>([]);
  const [generalTimes, setGeneralTimes] = useState<string[]>([]);

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

    // Determine the correct data source based on activeRole
    const roleSpecificData = activeRole === 'agent' ? agentData : activeRole === 'client' ? clientData : tutorData;

    setFormData(prev => ({
      ...prev,
      // Bio fields - try role-specific data first, then fall back to profile level
      bio: roleSpecificData?.bio || profile.bio || '',
      bio_video_url: roleSpecificData?.bio_video_url || profile.bio_video_url || '',
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

      // Tutor/Agent fields (11 fields) - Agent now uses same fields as Tutor
      // Load from activeRole's data source (tutorData for tutor, agentData for agent)
      status: (activeRole === 'agent' ? agentData?.status : tutorData?.status) || '',
      academic_qualifications: (activeRole === 'agent' ? agentData?.academic_qualifications : tutorData?.academic_qualifications) || [],
      key_stages: (activeRole === 'agent' ? agentData?.key_stages : tutorData?.key_stages) || [],
      teaching_professional_qualifications: (activeRole === 'agent' ? agentData?.teaching_professional_qualifications : tutorData?.teaching_professional_qualifications) || [],
      subjects: (activeRole === 'agent' ? agentData?.subjects : tutorData?.subjects) || [],
      teaching_experience: (activeRole === 'agent' ? agentData?.teaching_experience : tutorData?.teaching_experience) || '',
      session_type: (activeRole === 'agent' ? agentData?.session_types : tutorData?.session_types) || [],
      tutoring_experience: (activeRole === 'agent' ? agentData?.tutoring_experience : tutorData?.tutoring_experience) || '',
      one_on_one_rate: (activeRole === 'agent' ? agentData?.one_on_one_rate?.toString() : tutorData?.one_on_one_rate?.toString()) || '',
      group_session_rate: (activeRole === 'agent' ? agentData?.group_session_rate?.toString() : tutorData?.group_session_rate?.toString()) || '',
      delivery_mode: (activeRole === 'agent' ? agentData?.delivery_mode : tutorData?.delivery_mode) || [],

      // Client fields (aligned with Create Listing form)
      status_client: clientData?.status || clientData?.tutoring_for || '',
      subjects_client: clientData?.subjects || [],
      key_stages_client: clientData?.key_stages || [],
      levels_client: clientData?.levels || [],
      delivery_mode_client: clientData?.delivery_mode || [],
      one_on_one_rate_client: clientData?.one_on_one_rate?.toString() || clientData?.hourly_rate?.toString() || '',
      group_session_rate_client: clientData?.group_session_rate?.toString() || clientData?.group_hourly_rate?.toString() || '',
      session_type_client: clientData?.session_type || clientData?.session_types || [],
      sessions_per_week: clientData?.sessions_per_week || '',
      session_duration: clientData?.session_duration || '',
      learning_goals: clientData?.learning_goals || [],
      learning_preferences: clientData?.learning_preferences || [],
      special_needs: clientData?.special_needs || [],
      academic_qualifications_client: clientData?.academic_qualifications || [],
      teaching_qualifications_client: clientData?.teaching_qualifications || clientData?.teaching_professional_qualifications || [],
      teaching_experience_client: clientData?.teaching_experience || '',
      tutoring_experience_client: clientData?.tutoring_experience || '',

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

    // Load availability data based on active role
    const roleData = activeRole === 'client' ? clientData : activeRole === 'agent' ? agentData : tutorData;

    if (roleData?.availability) {
      const availData = roleData.availability;

      // Load general availability (from onboarding)
      if (availData.general_days) {
        setGeneralDays(availData.general_days);
      }
      if (availData.general_times) {
        setGeneralTimes(availData.general_times);
      }

      // Load calendar-based availability periods
      if (availData.availability_periods) {
        setAvailabilityPeriods(availData.availability_periods);
      }

      // Load unavailability periods
      if (availData.unavailability_periods) {
        setUnavailabilityPeriods(availData.unavailability_periods);
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

      // Handle bio and bio_video_url - save to both profile-level and role_details
      if (field === 'bio') {
        if (activeRole === 'tutor' || activeRole === 'agent') {
          // Save to role_details for tutor/agent
          const targetRole = activeRole;
          const currentRoleData = profile.professional_details?.[targetRole as keyof typeof profile.professional_details] || {};
          updateData = {
            bio: formData.bio, // Also save to profile level
            professional_details: {
              ...profile.professional_details,
              [targetRole]: {
                ...currentRoleData,
                bio: formData.bio
              }
            }
          };
        } else {
          updateData = { bio: formData.bio };
        }
      } else if (field === 'bio_video_url') {
        if (activeRole === 'tutor' || activeRole === 'agent') {
          // Save to role_details for tutor/agent
          const targetRole = activeRole;
          const currentRoleData = profile.professional_details?.[targetRole as keyof typeof profile.professional_details] || {};
          updateData = {
            bio_video_url: formData.bio_video_url, // Also save to profile level
            professional_details: {
              ...profile.professional_details,
              [targetRole]: {
                ...currentRoleData,
                bio_video_url: formData.bio_video_url
              }
            }
          };
        } else {
          updateData = { bio_video_url: formData.bio_video_url };
        }
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
      // Handle client fields (aligned with Create Listing form)
      else if (['status_client', 'subjects_client', 'key_stages_client', 'levels_client',
                 'delivery_mode_client', 'one_on_one_rate_client', 'group_session_rate_client',
                 'session_type_client', 'sessions_per_week', 'session_duration',
                 'learning_goals', 'learning_preferences', 'special_needs',
                 'academic_qualifications_client', 'teaching_qualifications_client',
                 'teaching_experience_client', 'tutoring_experience_client'].includes(field)) {
        const currentClient = profile.professional_details?.client || {};
        const fieldValue = formData[field as keyof typeof formData];

        // Map form field names to database field names
        const fieldMapping: Record<string, string> = {
          'status_client': 'status',
          'subjects_client': 'subjects',
          'key_stages_client': 'key_stages',
          'levels_client': 'levels',
          'delivery_mode_client': 'delivery_mode',
          'one_on_one_rate_client': 'one_on_one_rate',
          'group_session_rate_client': 'group_session_rate',
          'session_type_client': 'session_type',
          'academic_qualifications_client': 'academic_qualifications',
          'teaching_qualifications_client': 'teaching_qualifications',
          'teaching_experience_client': 'teaching_experience',
          'tutoring_experience_client': 'tutoring_experience'
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
      // Handle tutor/agent fields (Agent now uses same fields as Tutor)
      else if (['status', 'academic_qualifications', 'key_stages', 'teaching_professional_qualifications',
                'subjects', 'teaching_experience', 'session_type', 'tutoring_experience',
                'one_on_one_rate', 'group_session_rate', 'delivery_mode'].includes(field)) {
        // Determine target role based on activeRole (agent uses same fields as tutor)
        const targetRole = activeRole === 'agent' ? 'agent' : 'tutor';
        const currentRoleData = profile.professional_details?.[targetRole as keyof typeof profile.professional_details] || {};
        const fieldValue = formData[field as keyof typeof formData];

        // Map field names (form field name → database field name)
        const fieldMapping: Record<string, string> = {
          'session_type': 'session_types' // Form uses singular, DB uses plural
        };
        const dbField = fieldMapping[field] || field;

        updateData = {
          professional_details: {
            ...profile.professional_details,
            [targetRole]: {
              ...currentRoleData,
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
    } else if (e.key === 'Enter' && field !== 'bio' && field !== 'description' && field !== 'agent_additional_info') {
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

    // Convert time strings to comparable values (handles AM/PM)
    const parseTime = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      return hour24 * 60 + minutes;
    };

    if (startTime && endTime && parseTime(startTime) >= parseTime(endTime)) {
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

  // Save general availability changes
  const handleSaveGeneralAvailability = async () => {
    setIsSaving(true);
    try {
      const roleType = activeRole || profile.active_role || 'tutor';

      // Get existing availability data
      const roleDetailsArray = (profile as any).role_details || [];
      const currentRoleDetails = roleDetailsArray.find((rd: any) => rd.role_type === roleType);
      const existingAvailability = currentRoleDetails?.availability || {};

      // Update with new general availability
      const updatedAvailability = {
        ...existingAvailability,
        general_days: generalDays,
        general_times: generalTimes,
      };

      // Save to role_details via the account page handler
      const updateData: Partial<Profile> = {
        professional_details: {
          ...profile.professional_details,
          [roleType]: {
            ...(profile.professional_details as any)?.[roleType],
            availability: updatedAvailability
          }
        }
      };

      await onSave(updateData);
      toast.success('General availability updated');
    } catch (error) {
      console.error('Failed to save general availability:', error);
      toast.error('Failed to save general availability');
    } finally {
      setIsSaving(false);
    }
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
    options?: { value: string; label: string }[],
    required?: boolean
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

    // For select/multiselect, always show the dropdown (no click-to-edit)
    if (type === 'select' || type === 'multiselect') {
      return (
        <HubForm.Field
          label={label}
          isEditing={true}  // Always in edit mode for dropdowns
          onClick={undefined}  // No click handler
          required={required}
        >
          {type === 'multiselect' ? (
            <UnifiedMultiSelect
              triggerLabel={label}
              placeholder={placeholder || `Select ${label.toLowerCase()}...`}
              options={options || []}
              selectedValues={Array.isArray(fieldValue) ? fieldValue : []}
              onSelectionChange={(values) => handleMultiSelectChange(fieldKey, values)}
              disabled={isSaving}
            />
          ) : (
            <UnifiedSelect
              ref={(el) => { inputRefs.current[field] = el; }}
              value={fieldValue as string}
              onChange={(value) => {
                const syntheticEvent = {
                  target: { name: fieldKey, value }
                } as React.ChangeEvent<HTMLSelectElement>;
                handleChange(syntheticEvent);
              }}
              onBlur={() => handleBlur(field)}
              onKeyDown={(e) => handleKeyDown(e as any, field)}
              options={options || []}
              placeholder={placeholder || `Select ${label.toLowerCase()}`}
              disabled={isSaving}
            />
          )}
        </HubForm.Field>
      );
    }

    // For text inputs and textareas, use click-to-edit pattern
    return (
      <HubForm.Field
        label={label}
        isEditing={isEditing}
        onClick={() => !isEditing && handleFieldClick(field)}
        required={required}
      >
        {isEditing ? (
          <>
            {type === 'textarea' ? (
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
          {/* Section 1: Professional Details */}
          <HubForm.Section>
            {/* Describe Your Tutoring Needs */}
            <HubForm.Grid columns={1}>
              {renderField('bio', 'Describe Your Tutoring Needs', 'textarea', 'Tell us about the student, their current situation, what challenges they\'re facing, and what kind of support would be most helpful...', undefined, true)}
            </HubForm.Grid>

            {/* Video and Who Needs Tutoring */}
            <HubForm.Grid>
              {renderField('bio_video_url', '30-Second Intro Video (Optional)', 'text', 'Paste YouTube, Loom, or Vimeo URL')}
              {renderField('status_client', 'Who Needs Tutoring', 'select', 'Select who needs tutoring', whoNeedsTutoringOptions, true)}
            </HubForm.Grid>

            {/* Preferred Tutor Qualifications */}
            <HubForm.Grid>
              {renderField('academic_qualifications_client', 'Preferred Academic Qualifications', 'multiselect', 'Select qualifications', academicQualificationsOptions)}
              {renderField('teaching_qualifications_client', 'Preferred Teaching Qualifications', 'multiselect', 'Select qualifications', teachingProfessionalQualificationsOptions)}
            </HubForm.Grid>

            {/* Preferred Tutor Experience */}
            <HubForm.Grid>
              {renderField('teaching_experience_client', 'Preferred Teaching Experience', 'select', 'Select experience', teachingExperienceOptions)}
              {renderField('tutoring_experience_client', 'Preferred Tutoring Experience', 'select', 'Select tutoring experience', tutoringExperienceOptions, true)}
            </HubForm.Grid>

            {/* Preferred Subjects and Key Stages */}
            <HubForm.Grid>
              {renderField('subjects_client', 'Preferred Subjects', 'multiselect', 'Select subjects', clientSubjectsOptions, true)}
              {renderField('key_stages_client', 'Preferred Key Stages', 'multiselect', 'Select key stages', clientKeyStagesOptions, true)}
            </HubForm.Grid>

            {/* Preferred Levels and Delivery Mode */}
            <HubForm.Grid>
              {renderField('levels_client', 'Preferred Levels', 'multiselect', 'Select levels', clientLevelsOptions, true)}
              {renderField('delivery_mode_client', 'Preferred Delivery Mode', 'multiselect', 'Select delivery mode', clientDeliveryModeOptions, true)}
            </HubForm.Grid>

            {/* Budget */}
            <HubForm.Grid>
              {renderField('one_on_one_rate_client', 'Budget: One-on-One (£/hour)', 'number', '£25', undefined, true)}
              {renderField('group_session_rate_client', 'Budget: Group Session (£/hour per student)', 'number', '£15')}
            </HubForm.Grid>

            {/* Session Preferences */}
            <HubForm.Grid>
              {renderField('session_type_client', 'Preferred Session Type', 'multiselect', 'Select session types', clientSessionTypeOptions, true)}
              {renderField('sessions_per_week', 'Preferred Sessions Per Week', 'select', 'Select frequency', sessionsPerWeekOptions)}
            </HubForm.Grid>

            {/* Session Duration and Learning Goals */}
            <HubForm.Grid>
              {renderField('session_duration', 'Preferred Session Duration', 'select', 'Select duration', sessionDurationOptions)}
              {renderField('learning_goals', 'Learning Goals', 'multiselect', 'Select your goals', learningGoalsOptions)}
            </HubForm.Grid>

            {/* Learning Preferences and Special Needs */}
            <HubForm.Grid>
              {renderField('learning_preferences', 'Learning Preferences', 'multiselect', 'Select preferences', learningPreferencesOptions)}
              {renderField('special_needs', 'Special Educational Needs (SEN)', 'multiselect', 'Select if applicable', specialNeedsOptions)}
            </HubForm.Grid>
          </HubForm.Section>

          {/* Section 2: General Availability */}
          <HubForm.Section title="General Availability">
            <HubForm.Grid>
              <HubForm.Field label="Days of the week" required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(generalDays, 'Select days')}
                  options={dayOptions}
                  selectedValues={generalDays}
                  onSelectionChange={(values) => {
                    setGeneralDays(values);
                    handleSaveGeneralAvailability();
                  }}
                  disabled={isSaving}
                />
              </HubForm.Field>

              <HubForm.Field label="Times of day" required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(generalTimes, 'Select times')}
                  options={timeOptions}
                  selectedValues={generalTimes}
                  onSelectionChange={(values) => {
                    setGeneralTimes(values);
                    handleSaveGeneralAvailability();
                  }}
                  disabled={isSaving}
                />
              </HubForm.Field>
            </HubForm.Grid>

          </HubForm.Section>

          {/* Detailed Availability Section */}
          <HubForm.Section title="Detailed Schedule (Optional)">
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
                  <Button
                    type="button"
                    onClick={handleAddAvailability}
                    variant="primary"
                    size="md"
                    style={{ width: '100%' }}
                  >
                    Add
                  </Button>
                </div>

                {/* Summary Sections */}
                {recurringPeriods.length > 0 && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Recurring Availability</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {recurringPeriods.map(period => (
                        <HubListItem
                          key={period.id}
                          actions={
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemoveAvailability(period.id)}
                            >
                              Remove
                            </Button>
                          }
                        >
                          {formatAvailabilityText(period)}
                        </HubListItem>
                      ))}
                    </div>
                  </div>
                )}

                {oneTimePeriods.length > 0 && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>One-time Availability</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {oneTimePeriods.map(period => (
                        <HubListItem
                          key={period.id}
                          actions={
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemoveAvailability(period.id)}
                            >
                              Remove
                            </Button>
                          }
                        >
                          {formatAvailabilityText(period)}
                        </HubListItem>
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
                  <Button
                    type="button"
                    onClick={handleAddUnavailability}
                    variant="primary"
                    size="md"
                    style={{ width: '100%' }}
                  >
                    Add
                  </Button>
                </div>

                {/* Summary Section */}
                {unavailabilityPeriods.length > 0 && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Unavailable Period</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {unavailabilityPeriods.map(period => (
                        <HubListItem
                          key={period.id}
                          actions={
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemoveUnavailability(period.id)}
                            >
                              Remove
                            </Button>
                          }
                        >
                          {formatUnavailabilityText(period)}
                        </HubListItem>
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

    // For agents, show tutor-like fields (aligned with Agent onboarding form)
    if (activeRole === 'agent') {
      return (
        <HubForm.Root>
          <HubForm.Section>
            {/* About */}
            <HubForm.Grid columns={1}>
              {renderField('bio', 'About', 'textarea', 'Describe your tutoring or teaching style, strengths, and what areas you specialise in', undefined, true)}
            </HubForm.Grid>

            {/* 30-Second Intro Video and Status */}
            <HubForm.Grid>
              {renderField('bio_video_url', '30-Second Intro Video (Optional)', 'text', 'Paste YouTube, Loom, or Vimeo URL for +5 CaaS points')}
              {renderField('status', 'Status', 'select', 'Select status', configs.get('status')?.options || statusOptions, true)}
            </HubForm.Grid>

            {/* Academic Qualifications and Teaching Professional Qualifications */}
            <HubForm.Grid>
              {renderField('academic_qualifications', 'Academic Qualifications', 'multiselect', 'Select qualifications', configs.get('academicQualifications')?.options || academicQualificationsOptions, true)}
              {renderField('teaching_professional_qualifications', 'Teaching Professional Qualifications', 'multiselect', 'Select qualification', configs.get('teachingProfessionalQualifications')?.options || teachingProfessionalQualificationsOptions, true)}
            </HubForm.Grid>

            {/* Teaching Experience and Tutoring Experience */}
            <HubForm.Grid>
              {renderField('teaching_experience', 'Teaching Experience', 'select', 'Select experience', configs.get('teachingExperience')?.options || teachingExperienceOptions, true)}
              {renderField('tutoring_experience', 'Tutoring Experience', 'select', 'Select tutoring experience', configs.get('tutoringExperience')?.options || tutoringExperienceOptions, true)}
            </HubForm.Grid>

            {/* Key Stages and Subjects */}
            <HubForm.Grid>
              {renderField('key_stages', 'Key Stages', 'multiselect', 'Select key stage', configs.get('keyStages')?.options || keyStagesOptions, true)}
              {renderField('subjects', 'Subjects', 'multiselect', 'Select subjects', configs.get('subjects')?.options || subjectsOptions, true)}
            </HubForm.Grid>

            {/* Session Type and Delivery Mode */}
            <HubForm.Grid>
              {renderField('session_type', 'Session Type', 'multiselect', 'Select session types', configs.get('sessionType')?.options || sessionTypeOptions, true)}
              {renderField('delivery_mode', 'Delivery Mode', 'multiselect', 'Select delivery modes', configs.get('deliveryMode')?.options || deliveryModeOptions, true)}
            </HubForm.Grid>

            {/* Rates */}
            <HubForm.Grid>
              {renderField('one_on_one_rate', 'One-on-One Rate (£/hour)', 'number', '£50', undefined, true)}
              {renderField('group_session_rate', 'Group Rate (£/hour per student)', 'number', '£25')}
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
                    <UnifiedSelect
                      value={formData.proof_of_address_type}
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, proof_of_address_type: String(value) }));
                        handleBlur('proof_of_address_type');
                      }}
                      options={configs.get('proofOfAddressType')?.options || [
                        { value: 'Utility Bill', label: 'Utility Bill' },
                        { value: 'Bank Statement', label: 'Bank Statement' },
                        { value: 'Tax Bill', label: 'Tax Bill' },
                        { value: 'Solicitor Letter', label: 'Solicitor Letter' },
                      ]}
                      placeholder="Select document type"
                    />
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

          {/* General Availability Section */}
          <HubForm.Section title="General Availability">
            <HubForm.Grid>
              <HubForm.Field label="Days of the week" required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(generalDays, 'Select days')}
                  options={dayOptions}
                  selectedValues={generalDays}
                  onSelectionChange={(values) => {
                    setGeneralDays(values);
                    handleSaveGeneralAvailability();
                  }}
                  disabled={isSaving}
                />
              </HubForm.Field>

              <HubForm.Field label="Times of day" required>
                <UnifiedMultiSelect
                  triggerLabel={formatMultiSelectLabel(generalTimes, 'Select times')}
                  options={timeOptions}
                  selectedValues={generalTimes}
                  onSelectionChange={(values) => {
                    setGeneralTimes(values);
                    handleSaveGeneralAvailability();
                  }}
                  disabled={isSaving}
                />
              </HubForm.Field>
            </HubForm.Grid>

          </HubForm.Section>

          {/* Professional Info Note */}
          <HubForm.Section>
            <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
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

    // Default to provider/tutor fields
    return (
      <HubForm.Root>
        <HubForm.Section>
          {/* About */}
          <HubForm.Grid columns={1}>
            {renderField('bio', 'About', 'textarea', 'Describe your tutoring or teaching style, strengths, and what areas you specialise in', undefined, true)}
          </HubForm.Grid>

          {/* 30-Second Intro Video and Status */}
          <HubForm.Grid>
            {renderField('bio_video_url', '30-Second Intro Video (Optional)', 'text', 'Paste YouTube, Loom, or Vimeo URL for +5 CaaS points')}
            {renderField('status', 'Status', 'select', 'Select status', configs.get('status')?.options || statusOptions, true)}
          </HubForm.Grid>

          {/* Academic Qualifications and Teaching Professional Qualifications */}
          <HubForm.Grid>
            {renderField('academic_qualifications', 'Academic Qualifications', 'multiselect', 'Select qualifications', configs.get('academicQualifications')?.options || academicQualificationsOptions, true)}
            {renderField('teaching_professional_qualifications', 'Teaching Professional Qualifications', 'multiselect', 'Select qualification', configs.get('teachingProfessionalQualifications')?.options || teachingProfessionalQualificationsOptions, true)}
          </HubForm.Grid>

          {/* Teaching Experience and Tutoring Experience */}
          <HubForm.Grid>
            {renderField('teaching_experience', 'Teaching Experience', 'select', 'Select experience', configs.get('teachingExperience')?.options || teachingExperienceOptions, true)}
            {renderField('tutoring_experience', 'Tutoring Experience', 'select', 'Select tutoring experience', configs.get('tutoringExperience')?.options || tutoringExperienceOptions, true)}
          </HubForm.Grid>

          {/* Key Stages and Subjects */}
          <HubForm.Grid>
            {renderField('key_stages', 'Key Stages', 'multiselect', 'Select key stage', configs.get('keyStages')?.options || keyStagesOptions, true)}
            {renderField('subjects', 'Subjects', 'multiselect', 'Mathematics, English', configs.get('subjects')?.options || subjectsOptions, true)}
          </HubForm.Grid>

          {/* Session Type and Delivery Mode */}
          <HubForm.Grid>
            {renderField('session_type', 'Session Type', 'multiselect', 'Select session type', configs.get('sessionType')?.options || sessionTypeOptions, true)}
            {renderField('delivery_mode', 'Delivery Mode', 'multiselect', 'Select delivery mode', configs.get('deliveryMode')?.options || deliveryModeOptions, true)}
          </HubForm.Grid>

          {/* Rates */}
          <HubForm.Grid>
            {renderField('one_on_one_rate', 'One-on-One Rate (£/hour)', 'number', '£50', undefined, true)}
            {renderField('group_session_rate', 'Group Rate (£/hour per student)', 'number', '£25')}
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
                  <UnifiedSelect
                    value={formData.proof_of_address_type}
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, proof_of_address_type: String(value) }));
                      handleBlur('proof_of_address_type');
                    }}
                    options={configs.get('proofOfAddressType')?.options || [
                      { value: 'Utility Bill', label: 'Utility Bill' },
                      { value: 'Bank Statement', label: 'Bank Statement' },
                      { value: 'Tax Bill', label: 'Tax Bill' },
                      { value: 'Solicitor Letter', label: 'Solicitor Letter' },
                    ]}
                    placeholder="Select document type"
                  />
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

        {/* General Availability Section */}
        <HubForm.Section title="General Availability">
          <HubForm.Grid>
            <HubForm.Field label="Days of the week" required>
              <UnifiedMultiSelect
                triggerLabel="Days of the week"
                placeholder="Select days you're generally available"
                options={dayOptions}
                selectedValues={generalDays}
                onSelectionChange={(values) => {
                  setGeneralDays(values);
                  handleSaveGeneralAvailability();
                }}
                disabled={isSaving}
              />
            </HubForm.Field>

            <HubForm.Field label="Times of day" required>
              <UnifiedMultiSelect
                triggerLabel="Times of day"
                placeholder="Select times you're generally available"
                options={timeOptions}
                selectedValues={generalTimes}
                onSelectionChange={(values) => {
                  setGeneralTimes(values);
                  handleSaveGeneralAvailability();
                }}
                disabled={isSaving}
              />
            </HubForm.Field>
          </HubForm.Grid>
        </HubForm.Section>

        {/* Detailed Availability Section */}
        <HubForm.Section title="Detailed Schedule (Optional)">
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
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAddAvailability}
                  style={{ width: '100%' }}
                >
                  Add
                </Button>
              </div>

              {/* Summary Sections */}
              {recurringPeriods.length > 0 && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Recurring Availability</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recurringPeriods.map(period => (
                      <HubListItem
                        key={period.id}
                        actions={
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveAvailability(period.id)}
                          >
                            Remove
                          </Button>
                        }
                      >
                        {formatAvailabilityText(period)}
                      </HubListItem>
                    ))}
                  </div>
                </div>
              )}

              {oneTimePeriods.length > 0 && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>One-time Availability</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {oneTimePeriods.map(period => (
                      <HubListItem
                        key={period.id}
                        actions={
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveAvailability(period.id)}
                          >
                            Remove
                          </Button>
                        }
                      >
                        {formatAvailabilityText(period)}
                      </HubListItem>
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
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAddUnavailability}
                  style={{ width: '100%' }}
                >
                  Add
                </Button>
              </div>

              {/* Summary Section */}
              {unavailabilityPeriods.length > 0 && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Unavailable Period</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {unavailabilityPeriods.map(period => (
                      <HubListItem
                        key={period.id}
                        actions={
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveUnavailability(period.id)}
                          >
                            Remove
                          </Button>
                        }
                      >
                        {formatUnavailabilityText(period)}
                      </HubListItem>
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
