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
  referred_by_profile_id?: string | null; // v3.6: Lifetime attribution - which agent/user referred this user
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
  identity_document_number?: string; // Passport or driver's license number (Migration 093)
  identity_issue_date?: string; // ISO date string - ID issue date (Migration 093)
  identity_expiry_date?: string; // ISO date string - ID expiry date (Migration 093)
  // DBS certificate (required for tutors/agents only)
  dbs_certificate_number?: string; // DBS certificate number (required for UK tutors/agents)
  dbs_certificate_date?: string; // ISO date string - DBS certificate issue date
  dbs_certificate_url?: string; // URL to uploaded DBS certificate document
  dbs_certificate_document_name?: string; // Original filename of uploaded DBS certificate
  dbs_verified?: boolean; // Whether DBS certificate has been verified by admin
  dbs_verified_at?: string; // ISO date string - when DBS was verified
  dbs_expiry?: string | null; // ISO date string - DBS certificate expiry date (v5.5 CaaS)
  dbs_expiry_date?: string; // ISO date string - DBS certificate expiry date (Migration 093)
  // Proof of address (Migration 093)
  proof_of_address_url?: string; // URL to uploaded proof of address document
  proof_of_address_type?: string; // Type: 'Utility Bill', 'Bank Statement', 'Tax Bill', 'Solicitor Letter'
  address_document_issue_date?: string; // ISO date string - Must be within last 3 months
  proof_of_address_verified?: boolean; // Whether proof of address has been verified by admin
  // Professional details (v5.5 CaaS)
  qualifications?: string[] | null; // Array of qualifications (e.g., ['QTS', 'PGCE'])
  teaching_experience?: number | null; // Years of teaching experience
  degree_level?: 'BACHELORS' | 'MASTERS' | 'PHD' | 'NONE' | null; // Highest degree level
  bio_video_url?: string | null; // v5.5 CaaS: Credibility Clip - 30s intro video URL
  caas_score?: number | null; // v5.5 CaaS: Current CaaS (Credibility as a Service) score (0-100) - synced from caas_scores table
  // v5.9: Free Help Now
  available_free_help?: boolean; // Whether tutor is currently offering free help sessions
  // Role-based statistics (calculated, not stored)
  sessions_completed?: number; // Total sessions completed (as client or tutor)
  reviews_given?: number; // Total reviews given by this user
  tutors_worked_with?: number; // Unique tutors this client has worked with
  clients_worked_with?: number; // Unique clients this tutor has worked with
  average_rating?: number; // Average rating received
  total_reviews?: number; // Total reviews received
  profile_views?: number; // Total profile views
  free_sessions_count?: number; // Total free sessions given (for Community Tutor badge)
  // Other fields
  bio?: string;
  headline?: string; // Professional headline/tagline
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
  // Role-specific professional details (from role_details table)
  // Populated by UserProfileContext from role_details JOIN
  professional_details?: ProfessionalDetails;
  role_details?: RoleDetailsData[]; // Raw array from database JOIN (transformed into professional_details)
}

export type Role = 'client' | 'tutor' | 'agent' | 'student' | 'admin'; // v5.0: Added student role, admin role for platform admins

/**
 * ==================================================================
 * Onboarding-Specific Data Structures
 * ==================================================================
 */

export type OnboardingStep = 'welcome-and-role-selection' | 'role-specific-details' | 'completion';
export type ClientStep = 'welcome' | 'subjects' | 'preferences' | 'completion';
export type TutorOnboardingStep = 'personalInfo' | 'professionalDetails' | 'verification' | 'availability' | 'completion';
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
  client?: ClientProgress;
  tutor?: TutorProgress;
  agent?: AgentProgress;
  role_specific_progress?: {
    roleDetailsProgress?: Record<string, Partial<RoleDetails>>;
    selected_roles?: Role[];
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ClientProgress {
  personalInfo?: any;
  professionalDetails?: Partial<ProfessionalDetailsData>;
  verification?: Partial<VerificationDetailsData>;
  availability?: any;
  subjects?: string[];
  preferences?: LearningPreferencesData;
}

export interface TutorProgress {
  personalInfo?: any;
  professionalDetails?: Partial<ProfessionalDetailsData>;
  verification?: Partial<VerificationDetailsData>;
  availability?: AvailabilityData;
}

export interface AgentProgress {
  personalInfo?: any;
  professionalDetails?: Partial<ProfessionalDetailsData>;
  verification?: Partial<VerificationDetailsData>;
  availability?: AvailabilityData;
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
}

// Legacy interface - deprecated, use ProfessionalDetailsData instead
export interface QualificationsData {
  experience: string;
  education: string;
  certifications: string[];
  bio: string;
}

// Extended professional details for tutor onboarding
export interface ProfessionalDetailsData {
  // Bio & Status
  bio: string;
  bioVideoUrl?: string; // Optional 30-second intro video
  status: string; // Professional Tutor, Solo Tutor, Part-time Tutor

  // Education & Qualifications
  academicQualifications: string[]; // University Degree, Master's, PhD, etc.
  teachingProfessionalQualifications: string[]; // QTLS, QTS, PGCE, etc.

  // Experience
  teachingExperience: string; // Experienced Teacher (4-7 years), etc.
  tutoringExperience: string; // Experienced Tutor (3-5 years), etc.

  // Service Details
  keyStages: string[]; // KS1-KS2, KS3, KS4, A-Levels
  levels?: string[]; // Primary, Secondary, A-Levels, University (client preference)
  subjects: string[]; // Mathematics, English, Science, etc.
  sessionType: string[]; // One-to-One Session, Group Session
  deliveryMode: string[]; // Online, In-person, Hybrid

  // Rates
  oneToOneSessionRate: number;
  groupSessionRate: number;

  // Completion flag for step tracking
  completed?: boolean;
}

// Verification details for tutor onboarding (v4.9: All fields optional for faster onboarding)
export interface VerificationDetailsData {
  // Proof of Address
  proof_of_address_url?: string;
  proof_of_address_type?: string;
  address_document_issue_date?: string;

  // Government ID
  identity_verification_document_url?: string;
  identity_document_number?: string;
  identity_issue_date?: string;
  identity_expiry_date?: string;

  // DBS Certificate
  dbs_certificate_url?: string;
  dbs_certificate_number?: string;
  dbs_certificate_date?: string;
  dbs_expiry_date?: string;

  // Completion flag for step tracking
  completed?: boolean;
}

// Availability period types
export interface AvailabilityPeriod {
  id: string;
  type: 'recurring' | 'one-time';
  days?: string[];
  fromDate: string;
  toDate?: string;
  startTime: string;
  endTime: string;
}

export interface UnavailabilityPeriod {
  id: string;
  fromDate: string;
  toDate: string;
}

// Tutor onboarding availability data (updated v4.9)
export interface AvailabilityData {
  // Section 1: General Availability (Required)
  generalDays: string[];
  generalTimes: string[];

  // Section 2: Detailed Schedule (Optional)
  availabilityPeriods?: AvailabilityPeriod[];
  unavailabilityPeriods?: UnavailabilityPeriod[];

  // Completion flag for step tracking
  completed?: boolean;
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
  progress?: OnboardingProgress;
}

/**
 * ==================================================================
 * Role Details (from role_details database table)
 * Note: This data is stored in a separate role_details table, not on the profile
 * One row per profile-role combination (e.g., one for tutor, one for client)
 * ==================================================================
 */

// Type for the role_details table data
export interface RoleDetailsData {
  id: string;
  profile_id: string;
  role_type: 'client' | 'tutor' | 'agent';
  subjects?: string[];
  skill_levels?: Record<string, number>;
  goals?: string[];
  learning_style?: string;
  budget_range?: { min: number; max: number; currency: string };
  schedule_preferences?: any;
  previous_experience?: boolean;
  teaching_experience?: any;
  qualifications?: any;
  availability?: any;
  hourly_rate?: number;
  teaching_methods?: string[];
  professional_background?: string;
  commission_preferences?: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  specializations?: string[];
}

// Deprecated: Use RoleDetailsData instead
// Keeping for backward compatibility with existing components
export interface ProfessionalDetails {
  tutor?: Partial<TutorProfessionalInfo>;
  agent?: Partial<AgentProfessionalInfo>;
  client?: Partial<ClientProfessionalInfo>;
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
  bio?: string;
  bio_video_url?: string;
  academic_qualifications?: string[];
  teaching_professional_qualifications?: string[];
  teaching_experience?: string;
  tutoring_experience?: string;
  session_types?: string[];
  one_to_one_session_rate?: number;
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

  // Rate fields (for agency listings)
  one_to_one_session_rate?: number;         // Optional - agency's one-to-one session rate
  group_session_rate?: number;              // Optional - agency's group session rate

  // Availability fields (same as client/tutor - reusing calendar design)
  availability?: any;                       // Optional - when agency is accepting new clients/tutors
  unavailability?: any;                     // Optional - blackout periods (holidays, capacity limits)

  // Additional fields from role_details table (migration 217)
  status?: string;
  bio?: string;
  bio_video_url?: string;
  academic_qualifications?: string[];
  teaching_professional_qualifications?: string[];
  tutoring_experience?: string;
  key_stages?: string[];
  session_types?: string[];
  delivery_mode?: string[];
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
  // Additional fields from role_details table (migration 217)
  status?: string;
  bio?: string;
  bio_video_url?: string;
  academic_qualifications?: string[];
  teaching_professional_qualifications?: string[];
  tutoring_experience?: string;
  key_stages?: string[];
  levels?: string[];
  session_types?: string[];
  delivery_mode?: string[];
  one_to_one_session_rate?: number;
  group_session_rate?: number;
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
  delivery_mode: string[]; // Migration 195: Array of 'online' | 'in_person' | 'hybrid' (replaces deprecated location_type)
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
  slug?: string; // SEO-friendly URL slug
  available_free_help?: boolean; // v5.9: Whether tutor is currently offering free help sessions
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
  delivery_modes?: string[]; // Filter by delivery modes (online, in_person, hybrid)
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

// Scheduling status enum (migration 219 - Booking Scheduling System)
// Tracks the state of session time negotiation in the 5-stage booking workflow
export type SchedulingStatus = 'unscheduled' | 'proposed' | 'scheduled';

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

// Booking interface (SDD v3.6, Section 3.2)
// migration 049: student_id → client_id
// migration 051: referrer_profile_id → agent_id
// migration 104: Added snapshot fields from listing
// migration 219: Added scheduling fields for 5-stage booking workflow
export interface Booking {
  id: string;
  client_id: string; // Updated from student_id (migration 049)
  tutor_id: string;
  listing_id?: string;
  agent_id?: string | null; // Updated from referrer_profile_id (migration 051) - Referrer profile (any role) - Drives commission split (80/10/10 vs 90/10)
  referrer_role?: string | null; // v5.0: Role of referrer at booking time (client, tutor, agent) - Denormalized from profiles.active_role (migration 132)
  booking_type?: 'direct' | 'referred' | 'agent_job'; // Added in migration 049 (referral attribution status)
  booking_source?: 'listing' | 'profile'; // v5.0: Booking source - listing (via service listing) or profile (direct from profile page) - migration 133
  service_name: string;
  session_start_time?: string | null; // ISO timestamp - Now nullable (migration 219: bookings can be created without a scheduled time)
  session_duration: number; // In minutes
  amount: number; // Total amount in GBP
  status: BookingStatus;
  payment_status: PaymentStatus;

  // Scheduling fields (migration 219 - 5-stage booking workflow: Discover > Book > Schedule > Pay > Review)
  scheduling_status?: SchedulingStatus; // unscheduled, proposed, scheduled
  proposed_by?: string | null;          // Profile ID who proposed the current session time
  proposed_at?: string | null;          // When the time was proposed (ISO timestamp)
  schedule_confirmed_by?: string | null; // Profile ID who confirmed the time (must differ from proposed_by)
  schedule_confirmed_at?: string | null; // When confirmed (ISO timestamp)
  slot_reserved_until?: string | null;  // Temporary hold expiration (15 min window)
  reschedule_count?: number;            // Number of reschedules (max 4 total, 2 per party)

  // NEW: Snapshot fields from Listing (migrations 104, 108) - Copied at booking creation time
  subjects?: string[];              // Subjects taught (from listing.subjects)
  levels?: string[];                // Education levels (from listing.levels)
  delivery_mode?: 'online' | 'in_person' | 'hybrid'; // Delivery mode
  location_city?: string;           // City for in-person sessions
  free_trial?: boolean;             // Whether this was a trial session
  hourly_rate?: number;             // Rate at booking time (may differ from current listing rate)
  listing_slug?: string;            // Listing slug for reference
  available_free_help?: boolean;    // v5.9: Whether tutor was offering free help at booking time (migration 108)

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
  agent?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  } | null;
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

  // NEW: Context fields from Booking (migrations 107, 110) - Copied at transaction creation time
  service_name?: string;           // Service name (from booking)
  subjects?: string[];             // Subjects taught (from booking)
  session_date?: string;           // Session date (from booking.session_start_time)
  delivery_mode?: 'online' | 'in_person' | 'hybrid'; // Delivery mode
  tutor_name?: string;             // Tutor name for display
  client_name?: string;            // Client name for display
  agent_name?: string;             // Agent name for display (migration 110)

  // Joined data from API (may be null if booking deleted, use context fields above)
  booking?: {
    id: string;
    service_name: string;
    session_start_time: string;
    client_id: string;
    tutor_id: string;
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
  };
}

// Referral interface (SDD v3.6, Section 3.3) (migration 051: referrer_profile_id → agent_id)
export interface Referral {
  id: string;
  agent_id: string; // Updated from referrer_profile_id (migration 051) - Agent who sent the referral link
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

/**
 * ==================================================================
 * SDD v5.0: Student/Guardian Link Types
 * ==================================================================
 */

// Student interface for Guardian Links (similar to Connection interface pattern)
export interface StudentLink {
  id: string; // profile_graph.id
  guardian_id: string; // source_profile_id
  student_id: string; // target_profile_id
  status: 'active'; // Guardian links are always ACTIVE (no pending state)
  created_at: string;
  student?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    date_of_birth?: string;
  };
}


/**
 * ==================================================================
 * Wiselists (v5.7) - Save & Share Growth Engine
 * ==================================================================
 */

export type WiselistVisibility = 'private' | 'public';
export type WiselistRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface Wiselist {
  id: string;
  profile_id: string;
  name: string;
  description?: string | null;
  visibility: WiselistVisibility;
  slug?: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields (not in database)
  item_count?: number;
  collaborator_count?: number;
  owner?: Profile; // Populated via join
}

export interface WiselistItem {
  id: string;
  wiselist_id: string;
  profile_id?: string | null;
  listing_id?: string | null;
  notes?: string | null;
  added_by_profile_id: string;
  created_at: string;

  // NEW: Cached fields (migration 106) - Copied at save time
  cached_type?: 'listing' | 'profile';  // Item type
  cached_title?: string;                 // Listing title or profile full_name
  cached_subjects?: string[];            // Subjects for listings
  cached_tutor_name?: string;            // Tutor name for listings
  cached_avatar_url?: string;            // Avatar URL
  cached_active_role?: string;           // Active role for profile items

  // Populated via joins (may be null if item deleted)
  profile?: Profile;
  listing?: Listing;
  added_by?: Profile;
}

export interface WiselistCollaborator {
  id: string;
  wiselist_id: string;
  profile_id: string;
  role: WiselistRole;
  invited_by_profile_id?: string | null;
  created_at: string;
  // Populated via joins
  profile?: Profile;
  invited_by?: Profile;
}

export interface WiselistWithDetails extends Wiselist {
  items: WiselistItem[];
  collaborators: WiselistCollaborator[];
  article_saves?: any[]; // Resource article saves (optional)
}
