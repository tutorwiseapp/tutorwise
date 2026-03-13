/**
 * Shared Onboarding Configurations
 *
 * This file exports role-specific configurations for onboarding forms.
 * Each role has its own config that can override base options.
 */

export type OnboardingRole = 'tutor' | 'client' | 'agent';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldConfig {
  label: string;
  placeholder: string;
  helpText?: string;
  options?: SelectOption[];
  required?: boolean;
  hidden?: boolean;
}

export interface ProfessionalDetailConfig {
  role: OnboardingRole;
  formContext: string;
  title: string;
  subtitle: string;

  // Field configurations
  fields: {
    bio: FieldConfig;
    bioVideoUrl: FieldConfig;
    status: FieldConfig;
    academicQualifications: FieldConfig;
    teachingProfessionalQualifications: FieldConfig;
    teachingExperience: FieldConfig;
    tutoringExperience: FieldConfig;
    keyStages: FieldConfig;
    levels?: FieldConfig; // Only for client
    subjects: FieldConfig;
    sessionType: FieldConfig;
    deliveryMode: FieldConfig;
    oneToOneSessionRate: FieldConfig;
    groupSessionRate: FieldConfig;
  };

  // Validation rules
  validation: {
    bioMinLength: number;
    requireGroupRate: boolean;
  };
}

// Shared options used across roles
export const sharedOptions = {
  academicQualifications: [
    { value: 'University Degree', label: 'University Degree' },
    { value: "Master's Degree", label: "Master's Degree" },
    { value: 'PhD', label: 'PhD' },
    { value: 'Professional Certificate', label: 'Professional Certificate' },
  ],

  teachingProfessionalQualifications: [
    { value: 'QTLS, QTS', label: 'QTLS, QTS' },
    { value: 'PGCE', label: 'PGCE' },
    { value: 'Teaching License', label: 'Teaching License' },
    { value: 'None', label: 'None' },
  ],

  keyStages: [
    { value: 'Primary Education (KS1-KS2) - Age 5 to 11', label: 'Primary Education (KS1-KS2) - Age 5 to 11' },
    { value: 'Secondary Education (KS3) - Age 11 to 14', label: 'Secondary Education (KS3) - Age 11 to 14' },
    { value: 'Secondary Education (KS4) - Age 14 to 16', label: 'Secondary Education (KS4) - Age 14 to 16' },
    { value: 'A-Levels - Age 16 to 18', label: 'A-Levels - Age 16 to 18' },
  ],

  subjects: [
    { value: 'Mathematics', label: 'Mathematics' },
    { value: 'English', label: 'English' },
    { value: 'Science', label: 'Science' },
    { value: 'Physics', label: 'Physics' },
    { value: 'Chemistry', label: 'Chemistry' },
    { value: 'Biology', label: 'Biology' },
    { value: 'History', label: 'History' },
    { value: 'Geography', label: 'Geography' },
    { value: 'Languages', label: 'Languages' },
  ],

  sessionType: [
    { value: 'One-to-One Session', label: 'One-to-One Session' },
    { value: 'Group Session', label: 'Group Session' },
  ],

  deliveryMode: [
    { value: 'Online', label: 'Online' },
    { value: 'In-person', label: 'In-person' },
    { value: 'Hybrid', label: 'Hybrid' },
  ],

  tutoringExperience: [
    { value: 'New Tutor (0-2 years)', label: 'New Tutor (0-2 years)' },
    { value: 'Experienced Tutor (3-5 years)', label: 'Experienced Tutor (3-5 years)' },
    { value: 'Expert Tutor (5+ years)', label: 'Expert Tutor (5+ years)' },
  ],
};

// Role-specific options
export const roleSpecificOptions = {
  tutor: {
    status: [
      { value: 'Professional Tutor', label: 'Professional Tutor' },
      { value: 'Solo Tutor', label: 'Solo Tutor' },
      { value: 'Part-time Tutor', label: 'Part-time Tutor' },
    ],
    teachingExperience: [
      { value: 'New Teacher (0-3 years)', label: 'New Teacher (0-3 years)' },
      { value: 'Experienced Teacher (4-7 years)', label: 'Experienced Teacher (4-7 years)' },
      { value: 'Senior Teacher (8+ years)', label: 'Senior Teacher (8+ years)' },
    ],
  },

  agent: {
    status: [
      { value: 'Professional Tutor', label: 'Professional Tutor' },
      { value: 'Solo Tutor', label: 'Solo Tutor' },
      { value: 'Part-time Tutor', label: 'Part-time Tutor' },
    ],
    teachingExperience: [
      { value: 'New Teacher (0-3 years)', label: 'New Teacher (0-3 years)' },
      { value: 'Experienced Teacher (4-7 years)', label: 'Experienced Teacher (4-7 years)' },
      { value: 'Senior Teacher (8+ years)', label: 'Senior Teacher (8+ years)' },
    ],
  },

  client: {
    status: [
      { value: 'Myself (Adult Learner)', label: 'Myself (Adult Learner)' },
      { value: 'My Child/Student (Primary)', label: 'My Child/Student (Primary)' },
      { value: 'My Child/Student (Secondary)', label: 'My Child/Student (Secondary)' },
      { value: 'My Child/Student (College/University)', label: 'My Child/Student (College/University)' },
    ],
    teachingExperience: [
      { value: 'Any Experience Level', label: 'Any Experience Level' },
      { value: 'New Teacher (0-3 years)', label: 'New Teacher (0-3 years)' },
      { value: 'Experienced Teacher (4-7 years)', label: 'Experienced Teacher (4-7 years)' },
      { value: 'Senior Teacher (8+ years)', label: 'Senior Teacher (8+ years)' },
    ],
    levels: [
      { value: 'Primary Education (KS1-KS2) - Age 5 to 11', label: 'Primary Education (KS1-KS2) - Age 5 to 11' },
      { value: 'Secondary Education (KS3) - Age 11 to 14', label: 'Secondary Education (KS3) - Age 11 to 14' },
      { value: 'Secondary Education (KS4) - Age 14 to 16', label: 'Secondary Education (KS4) - Age 14 to 16' },
      { value: 'A-Levels - Age 16 to 18', label: 'A-Levels - Age 16 to 18' },
      { value: 'University/Undergraduate', label: 'University/Undergraduate' },
    ],
  },
};

export { tutorConfig } from './tutorConfig';
export { agentConfig } from './agentConfig';
export { clientConfig } from './clientConfig';

export function getConfigForRole(role: OnboardingRole): ProfessionalDetailConfig {
  switch (role) {
    case 'tutor':
      return require('./tutorConfig').tutorConfig;
    case 'agent':
      return require('./agentConfig').agentConfig;
    case 'client':
      return require('./clientConfig').clientConfig;
    default:
      return require('./tutorConfig').tutorConfig;
  }
}
