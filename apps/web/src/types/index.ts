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
  referral_id: string; // Legacy referral code (e.g., "JOHN-1234")
  referral_code?: string; // v3.6 referral code (same format, replaces referral_id)
  referred_by_agent_id?: string | null; // v3.6: Lifetime attribution - which agent referred this user
  slug?: string; // v4.8: SEO-friendly URL slug (e.g., "john-smith")
  full_name: string; // Full legal name - derived from first_name + last_name
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string; // Phone number
  gender?: string; // Gender (Male, Female, Other, Prefer not to say)
  date_of_birth?: string; // ISO date string (required for tutors/agents for background checks)
  // Address fields
  address_line1?: string; // Address (street address)
  town?: string; // Town
  city?: string; // City
  country?: string; // Country
  postal_code?: string; // Postal/ZIP code
  // Emergency contact
  emergency_contact_name?: string; // Emergency contact name
  emergency_contact_email?: string; // Emergency contact email
  // Identity verification
  identity_verification_document_url?: string; // URL to uploaded identity verification document (passport, driver's license, etc.)
  identity_verification_document_name?: string; // Original filename of uploaded document
  identity_verified?: boolean; // Whether identity has been verified by admin
  identity_verified_at?: string; // ISO date string - when identity was verified
  // DBS certificate (required for tutors/agents only)
  dbs_certificate_number?: string; // DBS certificate number (required for UK tutors/agents)
  dbs_certificate_date?: string; // ISO date string - DBS certificate issue date
  dbs_certificate_url?: string; // URL to uploaded DBS certificate document
  dbs_certificate_document_name?: string; // Original filename of uploaded DBS certificate
  dbs_verified?: boolean; // Whether DBS certificate has been verified by admin
  dbs_verified_at?: string; // ISO date string - when DBS was verified
  // Other fields
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

export type Role = 'client' | 'tutor' | 'agent';

/**
 * ==================================================================
 * Onboarding-Specific Data Structures
 * ==================================================================
 */

export type OnboardingStep = 'welcome-and-role-selection' | 'role-specific-details' | 'completion';
export type ClientStep = 'welcome' | 'subjects' | 'preferences' | 'completion';
export type TutorOnboardingStep = 'welcome' | 'subjects' | 'qualifications' | 'availability' | 'completion';
export type AgentOnboardingStep = 'welcome' | 'details' | 'services' | 'capacity' | 'completion';

export interface RoleDetails {
  [key: string]: any;
}

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
  availability?: any;
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
  // Backward compatibility - old role names
  provider?: Partial<TutorProfessionalInfo>;
  seeker?: Partial<ClientProfessionalInfo>;
}

export interface TutorProfessionalInfo {
  subjects: string[];
  levels?: string[];
  key_stages?: string[];
  experience?: number;
  qualifications?: string;
  hourly_rate?: number;
  // Additional fields from role_details table
  status?: string;
  academic_qualifications?: string[];
  teaching_professional_qualifications?: string[];
  teaching_experience?: string;
  tutoring_experience?: string;
  session_types?: string[];
  one_on_one_rate?: number;
  group_session_rate?: number;
  delivery_mode?: string[];
  certifications?: string[];
  experience_level?: string;
  teaching_style?: string[];
  teaching_methods?: string[];
  professional_background?: string;
  availability?: any;
  unavailability?: any;
}

export interface AgentProfessionalInfo {
  // Core Agency Info (from onboarding - required fields)
  agency_name?: string;                      // Required - agency brand name
  agency_size?: string;                      // Required - Solo/Small Team/Growing/Established
  years_in_business?: string;                // Required - 0-1/1-3/3-5/5+ years
  description?: string;                      // Required - agency description (min 50 chars)
  services?: string[];                       // Required - at least 1 service (Tutor placement, Background checks, etc.)
  commission_rate?: string;                  // Required - 10%/15%/20%/25%/30%+
  service_areas?: string[];                  // Required - Local In-Person/Regional/Online/Hybrid
  student_capacity?: string;                 // Required - 1-25/25-100/100-500/500+ students

  // Enhanced Profile Fields (from Week 2 spec - optional, user fills in profile)
  subject_specializations?: string[];        // Optional - matches tutor.subjects & client.subjects for matching
  education_levels?: string[];               // Optional - matches tutor.key_stages & client.education_level for matching
  coverage_areas?: string[];                 // Optional - UK regions (London, South East, etc.)
  number_of_tutors?: string;                 // Optional - current tutor roster size
  certifications?: string[];                 // Optional - professional credentials/accreditations
  website?: string;                          // Optional - agency website URL
  additional_info?: string;                  // Optional - free text for other details

  // Fields used in components
  professional_background?: string;
  specializations?: string[];
  subjects?: string[];
  commission_preferences?: string;

  // Availability fields (same as client/tutor - reusing calendar design)
  availability?: any;                       // Optional - when agency is accepting new clients/tutors
  unavailability?: any;                     // Optional - blackout periods (holidays, capacity limits)
}

export interface ClientProfessionalInfo {
  subjects?: string[];                   // Required - at least 1 (matches tutor subjects for matching)
  education_level?: string;              // Required (matches tutor key_stages for matching)
  learning_goals?: string[];             // Required - at least 1
  goals?: string[];                      // Alias for learning_goals
  learning_preferences?: string[];       // Optional - learning style preferences
  learning_style?: string;               // Learning style preference
  skill_levels?: string[];               // Skill levels
  budget_range?: string;                 // Optional - format: "min-max" hourly rate
  sessions_per_week?: string;            // Optional - desired frequency
  session_duration?: string;             // Optional - preferred session length
  schedule_preferences?: string;         // Schedule preferences
  special_needs?: string[];              // Optional - SEN/special educational needs
  previous_experience?: string;          // Previous tutoring/learning experience
  additional_info?: string;              // Optional - free text for other details
  location?: string;                     // Location preference
  // Availability fields (reusing tutor calendar design)
  availability?: any;                   // Availability periods
  unavailability?: any;                 // Unavailability periods
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
  full_name?: string; // Full name of the tutor (e.g., "Jane Doe")
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
  inquiry_count?: number;
  created_at: string;
  updated_at: string;
  free_trial?: boolean;
  images?: { url: string }[];
  is_template?: boolean; // Whether this is a system-generated template
  is_deletable?: boolean; // Whether this listing can be deleted
  template_id?: string; // Unique identifier for template type
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

/**
 * ==================================================================
 * SDD v3.6: Bookings, Referrals, Financials Types
 * ==================================================================
 */

// Booking status enum (SDD v3.6, Section 3.2)
export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

// Payment status enum (SDD v3.6, Section 3.2)
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

// Transaction type enum (SDD v3.6, Section 3.4)
export type TransactionType =
  | 'Booking Payment'           // T-TYPE-1: Full amount paid by client
  | 'Tutoring Payout'           // T-TYPE-2: Tutor's share (80% or 90%)
  | 'Referral Commission'       // T-TYPE-3: Referrer's 10% commission
  | 'Agent Commission'          // T-TYPE-4: Agent's commission
  | 'Platform Fee'              // T-TYPE-5: Platform's 10% fee
  | 'Withdrawal';               // T-TYPE-6: v4.9 - User-initiated withdrawal (payout)

// Transaction status enum (SDD v4.9, Section 3.2 - Updated for clearing period & payout tracking)
// Legacy statuses: 'Pending' | 'Paid' | 'Failed' | 'Cancelled' (maintained for backwards compatibility)
// v4.9 statuses: 'clearing' | 'available' | 'paid_out' | 'disputed' | 'refunded'
export type TransactionStatus =
  | 'Pending' | 'Paid' | 'Failed' | 'Cancelled'  // Legacy (v3.6)
  | 'clearing' | 'available' | 'paid_out' | 'disputed' | 'refunded';  // v4.9

// Referral status enum (SDD v3.6, Section 3.3)
export type ReferralStatus = 'Referred' | 'Signed Up' | 'Converted' | 'Expired';

// Booking interface (SDD v3.6, Section 3.2) (migration 049: student_id → client_id, migration 051: referrer_profile_id → agent_profile_id)
export interface Booking {
  id: string;
  client_id: string; // Updated from student_id (migration 049)
  tutor_id: string;
  listing_id?: string;
  agent_profile_id?: string | null; // Updated from referrer_profile_id (migration 051) - Drives commission split (80/10/10 vs 90/10)
  booking_type?: 'direct' | 'referred' | 'agent_job'; // Added in migration 049
  service_name: string;
  session_start_time: string; // ISO timestamp
  session_duration: number; // In minutes
  amount: number; // Total amount in GBP
  status: BookingStatus;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at?: string;
  // Joined data from API
  client?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  tutor?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  listing?: {
    id: string;
    title: string;
  };
}

// Transaction interface (SDD v4.9, Section 3.2 - Updated for clearing period & payout tracking)
export interface Transaction {
  id: string;
  profile_id: string | null; // NULL for platform fees (T-TYPE-5)
  booking_id?: string | null;
  type: TransactionType;
  description?: string;
  status: TransactionStatus;
  amount: number; // In GBP
  created_at: string;
  // v4.9 fields
  available_at?: string; // ISO timestamp when funds become available for payout
  stripe_checkout_id?: string | null; // For idempotency (prevents duplicate charges)
  stripe_payout_id?: string | null; // Stripe payout ID for withdrawals
  // Joined data from API
  booking?: {
    id: string;
    service_name: string;
    session_start_time: string;
  };
}

// Referral interface (SDD v3.6, Section 3.3) (migration 051: referrer_profile_id → agent_profile_id)
export interface Referral {
  id: string;
  agent_profile_id: string; // Updated from referrer_profile_id (migration 051) - Agent who sent the referral link
  referred_profile_id?: string | null; // NULL for anonymous clicks
  status: ReferralStatus;
  booking_id?: string | null; // First booking that triggered 'Converted'
  transaction_id?: string | null; // Commission transaction (T-TYPE-3)
  created_at: string;
  converted_at?: string | null;
  // Joined data from API
  referred_user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  } | null;
  first_booking?: {
    id: string;
    service_name: string;
    amount: number;
  } | null;
  first_commission?: {
    id: string;
    amount: number;
  } | null;
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

/**
 * ==================================================================
 * SDD v4.6: Profile Graph Types (Unified Relationship Model)
 * ==================================================================
 */

// Relationship type enum (v4.6)
export type RelationshipType =
  | 'GUARDIAN'         // A Client (Parent) has authority over a Student
  | 'SOCIAL'           // A mutual "Social Link" (replaces 'connections')
  | 'BOOKING'          // A Client (Payer) has a completed booking with a Tutor
  | 'AGENT_DELEGATION' // A Tutor delegates commission to an Agent
  | 'AGENT_REFERRAL';  // An Agent referred a Client

// Relationship status enum (v4.6)
export type RelationshipStatus =
  | 'PENDING'   // Awaiting acceptance (e.g., for a 'SOCIAL' link)
  | 'ACTIVE'    // The link is current and valid
  | 'BLOCKED'   // One user has blocked the other
  | 'COMPLETED'; // The link represents a past event (e.g., 'BOOKING')

// Profile Graph Link interface (v4.6)
export interface ProfileGraphLink {
  id: string;
  source_profile_id: string;
  target_profile_id: string;
  relationship_type: RelationshipType;
  status: RelationshipStatus;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

