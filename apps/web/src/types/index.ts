// apps/web/src/types/index.ts

import React from 'react';

/**
 * ==================================================================
 * Canonical Data Models
 * This is the single source of truth for our data structures.
 * ==================================================================
 */

export interface Profile {
  id: string;
  referral_id: string;
  full_name: string; // Full legal name (required for tutors)
  first_name?: string;
  last_name?: string;
  email: string;
  bio?: string;
  categories?: string;
  achievements?: string;
  avatar_url?: string;
  cover_photo_url?: string;
  stripe_account_id?: string;
  stripe_customer_id?: string;
  roles: Role[];
  active_role?: Role;
  created_at: string;
  preferences?: Record<string, any>;
  onboarding_progress?: OnboardingProgress;
  professional_details?: ProfessionalDetails;
}

export type Role = 'agent' | 'seeker' | 'provider';

/**
 * ==================================================================
 * Onboarding-Specific Data Structures
 * ==================================================================
 */

export type OnboardingStep = 'welcome-and-role-selection' | 'role-specific-details' | 'completion';
export type ClientStep = 'welcome' | 'subjects' | 'preferences' | 'completion';
export type TutorOnboardingStep = 'welcome' | 'subjects' | 'qualifications' | 'availability' | 'completion';
export type AgentOnboardingStep = 'welcome' | 'details' | 'services' | 'capacity' | 'completion';

export interface OnboardingProgress {
  onboarding_completed: boolean;
  current_step?: string;
  completed_steps?: string[];
  last_updated?: string;
  abandoned_at?: string;
  skipped?: boolean;
  seeker?: SeekerProgress;
  provider?: TutorProgress;
  agent?: AgentProgress;
  role_specific_progress?: {
    roleDetailsProgress?: Record<string, Partial<RoleDetails>>;
    selected_roles?: Role[];
    [key: string]: any;
  };
  [key: string]: any;
}

export interface SeekerProgress {
  subjects?: string[];
  preferences?: LearningPreferencesData;
}

export interface TutorProgress {
  subjects?: string[];
  qualifications?: QualificationsData;
  availability?: AvailabilityData;
}

export interface AgentProgress {
  details?: AgencyDetailsData;
  services?: string[];
  capacity?: CapacityData;
}

export interface AgencyDetailsData {
  agencyName: string;
  agencySize: string;
  yearsInBusiness: string;
  description: string;
}

export interface CapacityData {
  commissionRate: number;
  serviceAreas: string[];
  studentCapacity: string;
}

export interface QualificationsData {
  experience: string;
  education: string;
  certifications: string[];
  bio: string;
}

export interface AvailabilityData {
  hourlyRate: number;
  availability: string[];
  sessionTypes: string[];
}

export interface LearningPreferencesData {
  location?: string;
  budget?: number;
  learningStyle?: string;
}

export interface RoleDetails {
  profile_id: string;
  role_type: Role;
  experience?: string;
  education?: string;
  certifications?: string[];
  bio?: string;
  hourly_rate?: number;
  availability?: string[];
  session_types?: string[];
  subjects?: string[];
  learning_goals?: string;
  preferred_style?: string;
  agency_name?: string;
  agency_size?: string;
  years_in_business?: string;
  description?: string;
  commission_rate?: number;
  service_areas?: string[];
  student_capacity?: string;
  services?: string[];
}

/**
 * ==================================================================
 * API & Function Payloads
 * ==================================================================
 */

export interface SaveProgressPayload {
  userId: string;
  progress: Partial<OnboardingProgress>;
}

export interface OnboardingProgressResponse {
  success: boolean;
  error?: string;
}

/**
 * ==================================================================
 * Professional Details & Other Data Structures
 * ==================================================================
 */

export interface ProfessionalDetails {
  tutor?: Partial<TutorProfessionalInfo>;
  agent?: Partial<AgentProfessionalInfo>;
  client?: Partial<ClientProfessionalInfo>;
}

export interface TutorProfessionalInfo {
  subjects: string[];
  levels: string[];
  experience: number;
  qualifications: string;
  hourly_rate: number;
}

export interface AgentProfessionalInfo {
  agency_name: string;
  specializations: string[];
  service_areas: string[];
}

export interface ClientProfessionalInfo {
  learning_goals: string[];
  preferred_subjects: string[];
  student_level: string;
}

export interface ColumnDef<T> {
  header: string;
  accessorKey: keyof T;
  responsiveClass?: 'mobile' | 'tablet' | 'desktop';
  cell?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
}

export interface Listing {
  id: string;
  profile_id: string;
  tutor_name?: string; // Full name of the tutor (e.g., "Jane Doe")
  title: string; // Service title (e.g., "GCSE Maths Tutor")
  description: string;
  status: 'draft' | 'published' | 'archived';
  subjects: string[];
  levels: string[];
  hourly_rate?: number;
  location_type: 'online' | 'in_person' | 'hybrid';
  location_city?: string;
  view_count: number;
  booking_count: number;
  created_at: string;
  updated_at: string;
  free_trial?: boolean;
  images?: { url: string }[];
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface ListingFilters {
  search?: string;
  subjects?: string[];
  levels?: string[];
  min_price?: number;
  max_price?: number;
  location_type?: 'online' | 'in_person' | 'hybrid';
  location_city?: string;
  free_trial_only?: boolean;
  min_rating?: number;
  sort_by?: 'hourly_rate_asc' | 'hourly_rate_desc' | 'rating_desc' | 'newest';
}

export interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  link?: string;
}

export interface Referral {
  id: string;
  referee_name: string;
  status: 'Pending' | 'Completed' | 'Expired';
  reward_amount: number;
  sent_at: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Failed';
}

export interface NavLink {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbItem {
  href: string;
  label: string;
}

