/**
 * Filename: onboardingValidation.ts
 * Purpose: Client-side validation for onboarding forms
 * Created: 2026-01-10
 *
 * Provides validation rules and error messages for all onboarding steps
 */

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Personal Info Validation
 */
export interface PersonalInfoData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
}

export function validatePersonalInfo(data: PersonalInfoData): ValidationResult {
  const errors: Record<string, string> = {};

  // Required fields
  if (!data.first_name?.trim()) {
    errors.first_name = 'First name is required';
  } else if (data.first_name.trim().length < 2) {
    errors.first_name = 'First name must be at least 2 characters';
  }

  if (!data.last_name?.trim()) {
    errors.last_name = 'Last name is required';
  } else if (data.last_name.trim().length < 2) {
    errors.last_name = 'Last name must be at least 2 characters';
  }

  if (!data.phone_number?.trim()) {
    errors.phone_number = 'Phone number is required';
  } else if (!/^[\d\s\+\-\(\)]+$/.test(data.phone_number)) {
    errors.phone_number = 'Please enter a valid phone number';
  }

  if (!data.date_of_birth) {
    errors.date_of_birth = 'Date of birth is required';
  } else {
    const age = calculateAge(new Date(data.date_of_birth));
    if (age < 18) {
      errors.date_of_birth = 'You must be at least 18 years old';
    } else if (age > 120) {
      errors.date_of_birth = 'Please enter a valid date of birth';
    }
  }

  if (!data.address_line1?.trim()) {
    errors.address_line1 = 'Address is required';
  }

  if (!data.city?.trim()) {
    errors.city = 'City is required';
  }

  if (!data.postcode?.trim()) {
    errors.postcode = 'Postcode is required';
  } else if (!/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i.test(data.postcode.replace(/\s/g, ''))) {
    errors.postcode = 'Please enter a valid UK postcode';
  }

  if (!data.country?.trim()) {
    errors.country = 'Country is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Professional Info Validation
 */
export interface ProfessionalInfoData {
  bio?: string;
  qualifications?: string[];
  teaching_experience_years?: number;
  subjects?: string[];
  student_levels?: string[];
  hourly_rate?: number;
  intro_video_url?: string;
}

export function validateProfessionalInfo(data: ProfessionalInfoData): ValidationResult {
  const errors: Record<string, string> = {};

  // Bio validation
  if (!data.bio?.trim()) {
    errors.bio = 'Bio is required';
  } else if (data.bio.trim().length < 50) {
    errors.bio = 'Bio must be at least 50 characters';
  } else if (data.bio.trim().length > 1000) {
    errors.bio = 'Bio must be less than 1000 characters';
  }

  // Qualifications validation
  if (!data.qualifications || data.qualifications.length === 0) {
    errors.qualifications = 'At least one qualification is required';
  }

  // Teaching experience validation
  if (data.teaching_experience_years === undefined || data.teaching_experience_years === null) {
    errors.teaching_experience_years = 'Teaching experience is required';
  } else if (data.teaching_experience_years < 0) {
    errors.teaching_experience_years = 'Teaching experience cannot be negative';
  } else if (data.teaching_experience_years > 70) {
    errors.teaching_experience_years = 'Please enter a valid number of years';
  }

  // Subjects validation
  if (!data.subjects || data.subjects.length === 0) {
    errors.subjects = 'At least one subject is required';
  } else if (data.subjects.length > 10) {
    errors.subjects = 'Maximum 10 subjects allowed';
  }

  // Student levels validation
  if (!data.student_levels || data.student_levels.length === 0) {
    errors.student_levels = 'At least one student level is required';
  }

  // Hourly rate validation
  if (data.hourly_rate === undefined || data.hourly_rate === null) {
    errors.hourly_rate = 'Hourly rate is required';
  } else if (data.hourly_rate < 10) {
    errors.hourly_rate = 'Minimum hourly rate is £10';
  } else if (data.hourly_rate > 500) {
    errors.hourly_rate = 'Maximum hourly rate is £500';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Verification Details Validation (all optional for faster onboarding)
 */
export interface VerificationDetailsData {
  proof_of_address_url?: string;
  proof_of_address_type?: string;
  address_document_issue_date?: string;
  identity_verification_document_url?: string;
  identity_document_number?: string;
  identity_issue_date?: string;
  identity_expiry_date?: string;
  dbs_certificate_url?: string;
  dbs_certificate_number?: string;
  dbs_certificate_date?: string;
  dbs_expiry_date?: string;
}

export function validateVerificationDetails(data: VerificationDetailsData): ValidationResult {
  const errors: Record<string, string> = {};

  // All fields are optional, but if document is uploaded, metadata should be provided
  if (data.proof_of_address_url && !data.proof_of_address_type) {
    errors.proof_of_address_type = 'Document type is required when uploading proof of address';
  }

  if (data.identity_verification_document_url && !data.identity_document_number) {
    errors.identity_document_number = 'Document number is required when uploading ID';
  }

  if (data.dbs_certificate_url && !data.dbs_certificate_number) {
    errors.dbs_certificate_number = 'Certificate number is required when uploading DBS';
  }

  // Date validations
  if (data.identity_expiry_date) {
    const expiryDate = new Date(data.identity_expiry_date);
    if (expiryDate < new Date()) {
      errors.identity_expiry_date = 'Identity document has expired';
    }
  }

  if (data.dbs_expiry_date) {
    const expiryDate = new Date(data.dbs_expiry_date);
    if (expiryDate < new Date()) {
      errors.dbs_expiry_date = 'DBS certificate has expired';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Availability Validation
 */
export interface AvailabilityData {
  timezone?: string;
  weekly_availability?: Record<string, any>;
  max_students_per_week?: number;
}

export function validateAvailability(data: AvailabilityData): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.timezone) {
    errors.timezone = 'Timezone is required';
  }

  if (!data.weekly_availability || Object.keys(data.weekly_availability).length === 0) {
    errors.weekly_availability = 'Please set your availability for at least one day';
  }

  if (data.max_students_per_week === undefined || data.max_students_per_week === null) {
    errors.max_students_per_week = 'Maximum students per week is required';
  } else if (data.max_students_per_week < 1) {
    errors.max_students_per_week = 'Must accept at least 1 student per week';
  } else if (data.max_students_per_week > 100) {
    errors.max_students_per_week = 'Maximum 100 students per week allowed';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Utility: Calculate age from date of birth
 */
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Utility: Get first error message from validation result
 */
export function getFirstError(errors: Record<string, string>): string | null {
  const firstKey = Object.keys(errors)[0];
  return firstKey ? errors[firstKey] : null;
}

/**
 * Utility: Check if specific field has error
 */
export function hasFieldError(errors: Record<string, string>, fieldName: string): boolean {
  return !!errors[fieldName];
}
