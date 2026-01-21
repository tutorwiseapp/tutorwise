/**
 * Listing types for tutor service listings
 * v4.0: Updated to support dynamic multi-service listings
 * v5.0: Added marketplace listing categories (session, course, job)
 */

export type ListingStatus = 'draft' | 'published' | 'unpublished' | 'archived';
export type LocationType = 'online' | 'in_person' | 'hybrid';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/**
 * v5.0: Marketplace listing categories
 * - session: Individual tutoring sessions (default)
 * - course: Structured learning programs
 * - job: Client job postings seeking tutors
 */
export type ListingCategory = 'session' | 'course' | 'job';

/**
 * Job type for job postings
 */
export type JobType = 'full-time' | 'part-time' | 'contract' | 'one-off';

/**
 * v4.0: New listing type system for multi-service platform
 * Supports: One-to-One, Group Session, Workshop/Webinar, Study Package, Job Listing
 */
export type ServiceType = 'one-to-one' | 'group-session' | 'workshop' | 'study-package' | 'job-listing';
export type PackageType = 'pdf' | 'video' | 'bundle';

/**
 * @deprecated Legacy format - use AvailabilityPeriod[] instead
 */
export interface TimeSlot {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

/**
 * @deprecated Legacy format - use AvailabilityPeriod[] instead
 */
export interface Availability {
  [key: string]: TimeSlot[]; // DayOfWeek as key
}

/**
 * v4.1: Availability Period (reused from profile system)
 * Supports both recurring weekly schedules and one-time slots
 * This is the STANDARD format - stored as JSONB array in database
 */
export interface AvailabilityPeriod {
  id: string;
  type: 'recurring' | 'one-time';
  days?: string[]; // For recurring (e.g., ['Monday', 'Wednesday'])
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

export interface PricingPackage {
  sessions: number;
  price: number;
  discount?: number; // Percentage discount
  name?: string;     // e.g., "Starter Pack", "Monthly Bundle"
}

/**
 * v5.0: Course curriculum structure
 */
export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  order: number;
  materials?: string[]; // URLs to materials
}

export interface CourseCurriculum {
  modules: CourseModule[];
  total_hours?: number;
  certificate_offered?: boolean;
}

/**
 * v5.0: Job requirements structure
 */
export interface JobRequirements {
  min_experience_years?: number;
  required_qualifications?: string[]; // e.g., ["Bachelor's Degree", "Teaching Certificate"]
  required_subjects?: string[];
  required_levels?: string[];
  preferred_qualifications?: string[];
  other_requirements?: string; // Free-form text for additional requirements
}

export interface Listing {
  id: string;
  profile_id: string;

  // Basic Info
  full_name?: string; // Full name of the tutor (e.g., "Jane Doe")
  avatar_url?: string; // Profile picture URL from profiles table
  listing_type?: string; // @deprecated Use listing_category instead
  listing_category?: ListingCategory; // v5.0: Marketplace category (session, course, job)
  service_type?: ServiceType; // v4.0: Service delivery model (one-to-one, group-session, workshop, study-package, job-listing)
  title: string; // Service title (e.g., "GCSE Maths Tutor")
  description: string;
  status: ListingStatus;

  // Verification Status (from profiles table)
  identity_verified?: boolean; // Whether tutor's identity has been verified
  dbs_verified?: boolean; // Whether tutor's DBS certificate has been verified

  // Teaching Details
  subjects: string[];
  levels: string[];
  languages: string[];
  specializations?: string[];
  teaching_methods?: string[];
  qualifications?: string[];
  teaching_experience?: string;

  // Pricing
  hourly_rate?: number;
  currency: string;
  pricing_packages?: PricingPackage[];
  free_trial: boolean;
  trial_duration_minutes?: number;

  // MVP Fields
  instant_booking_enabled?: boolean;
  ai_tools_used?: string[];
  cancellation_policy?: string;
  duration_options?: number[];
  location_details?: string;

  // Availability & Location
  delivery_mode: string[]; // ['online', 'in_person', 'hybrid'] - Replaces deprecated location_type (Migration 195)
  location_address?: string;
  location_city?: string;
  location_postcode?: string;
  location_country: string;
  timezone: string;
  availability?: AvailabilityPeriod[]; // v4.1: JSONB array of periods (STANDARD format)

  // Media
  images: string[];
  video_url?: string;

  // SEO & Discovery
  slug?: string;
  tags: string[];

  // Metrics
  view_count: number;
  inquiry_count: number;
  booking_count: number;
  response_time?: string;
  average_rating?: number; // Average rating from reviews
  review_count?: number; // Total number of reviews

  // Template Fields
  is_template?: boolean;      // Whether this is a system-generated template
  is_deletable?: boolean;     // Whether this listing can be deleted
  template_id?: string;       // Unique identifier for template type (e.g., "mathematics-gcse-group")

  // v5.9: Free Help Now
  available_free_help?: boolean; // Whether tutor is currently offering free help sessions

  // v5.0: Course-Specific Fields (for listing_category = 'course')
  course_start_date?: string; // ISO date string
  course_end_date?: string; // ISO date string
  course_duration_weeks?: number; // Duration in weeks
  course_max_students?: number; // Maximum number of students
  course_curriculum?: CourseCurriculum; // Structured curriculum

  // v5.0: Job-Specific Fields (for listing_category = 'job')
  job_type?: JobType; // full-time, part-time, contract, one-off
  job_deadline?: string; // Application deadline (ISO date string)
  job_requirements?: JobRequirements; // Required qualifications/experience
  job_budget_min?: number; // Minimum budget
  job_budget_max?: number; // Maximum budget

  // v5.1: Extended Job Listing Fields (Added 2026-01-20 for comprehensive job postings)
  employment_type?: string;
  contract_length?: string;
  start_date?: string;
  end_date?: string;
  application_deadline?: string;
  student_numbers?: string;
  class_type?: string[];
  // delivery_mode is defined above at line 154
  work_location?: string;
  hours_per_week?: string;
  schedule_flexibility?: string;
  timezone_requirements?: string;
  compensation_type?: string;
  compensation_min?: number;
  compensation_max?: number;
  benefits?: string[];
  additional_benefits?: string;
  minimum_qualifications?: string[];
  teaching_credentials?: string[];
  minimum_experience?: string;
  dbs_check?: string;
  other_requirements?: string;
  how_to_apply?: string;
  application_instructions?: string;
  about_organisation?: string;
  organisation_type?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string;
  archived_at?: string; // Timestamp when listing was archived (for 30-day deletion rule)
}

/**
 * v4.0: Service-Specific Field Interfaces
 * These define the unique fields for each service type
 */

// Common base fields for all listing types
export interface BaseListingFields {
  // Core Details
  service_name: string;
  description: string;
  category: string;
  amount: number;
  currency?: string;

  // Media
  hero_image_url?: string;
  images?: string[];

  // SEO & Discovery
  tags?: string[];

  // Status
  status?: ListingStatus;
}

// One-to-One Session specific fields
export interface OneToOneFields {
  service_type: 'one-to-one';
  session_duration: number; // in minutes (e.g., 30, 60, 90)
  availability: AvailabilityPeriod[];
  max_attendees?: 1; // Always 1 for one-to-one
}

// Group Session specific fields
export interface GroupSessionFields {
  service_type: 'group-session';
  session_duration: number; // in minutes
  max_attendees: number; // 2-10
  availability: AvailabilityPeriod[];
}

// Workshop/Webinar specific fields
export interface WorkshopFields {
  service_type: 'workshop';
  max_attendees: number; // 10-500
  event_date: string; // ISO date string
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  speaker_bio?: string;
  event_agenda?: string;
}

// Study Package specific fields
export interface StudyPackageFields {
  service_type: 'study-package';
  package_type: PackageType; // 'pdf' | 'video' | 'bundle'
  material_url?: string;
  material_urls?: string[]; // For bundles with multiple files
}

/**
 * v4.0: Discriminated Union for Create Listing Input
 * TypeScript will enforce that the correct fields are present based on service_type
 */
export type CreateListingInputV4 = BaseListingFields & (
  | OneToOneFields
  | GroupSessionFields
  | WorkshopFields
  | StudyPackageFields
);

/**
 * Legacy CreateListingInput (maintained for backward compatibility)
 * TODO: Migrate all usage to CreateListingInputV4
 */
export interface CreateListingInput {
  // Basic Info (required)
  full_name?: string; // Full name of the tutor
  listing_type?: string; // Type of listing (e.g., "Tutor: One-on-One Session")
  title: string; // Service title
  description: string;

  // Teaching Details (required)
  subjects: string[];
  levels: string[];
  languages?: string[];
  specializations?: string[];
  teaching_methods?: string[];
  qualifications?: string[];
  academic_qualifications?: string[];
  professional_qualifications?: string[];
  years_of_experience?: string;

  // Pricing
  hourly_rate?: number;
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  currency?: string;
  pricing_packages?: PricingPackage[];
  free_trial?: boolean;
  trial_duration_minutes?: number;

  // Location (required)
  delivery_mode: string[]; // Migration 195: Array of delivery modes ['online', 'in_person', 'hybrid']
  location_address?: string;
  location_city?: string;
  location_postcode?: string;
  location_country?: string;
  location_details?: string;
  timezone?: string;
  availability?: AvailabilityPeriod[]; // v4.1: JSONB array of periods (STANDARD format)

  // Media
  images?: string[];
  video_url?: string;

  // MVP Fields
  instant_booking_enabled?: boolean;
  ai_tools_used?: string[];
  cancellation_policy?: string;
  duration_options?: number[];

  // SEO
  tags?: string[];

  // Status
  status?: ListingStatus;

  // Job Listing Fields (v5.1: Added 2026-01-20 for agent job postings)
  // Section 1: Job Basics
  employment_type?: string; // 'full-time', 'part-time', 'contract', 'freelance'
  contract_length?: string; // 'permanent', 'fixed-3m', 'fixed-6m', 'fixed-1y', 'temporary'
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  application_deadline?: string; // ISO date string

  // Section 2: Teaching Details (extends existing subjects/levels)
  student_numbers?: string; // '1-5', '6-10', '11-20', '20+'
  class_type?: string[]; // ['one-to-one', 'small-group', 'medium-group', 'large-group']

  // Section 3: Location & Schedule
  // Note: delivery_mode is defined above at line 338 (applies to all listings including jobs)
  work_location?: string; // Full location string
  hours_per_week?: string; // 'under-10', '10-20', '20-30', '30-40', '40+'
  schedule_flexibility?: string; // 'fixed', 'flexible', 'weekends', 'evenings'
  timezone_requirements?: string; // Free-form text

  // Section 4: Compensation & Benefits
  compensation_type?: string; // 'hourly', 'annual', 'per-session', 'commission'
  compensation_min?: number;
  compensation_max?: number;
  benefits?: string[]; // ['flexible-schedule', 'professional-dev', 'paid-training', etc.]
  additional_benefits?: string;

  // Section 5: Requirements & Qualifications
  minimum_qualifications?: string[]; // ['university-degree', 'masters', 'phd', etc.]
  teaching_credentials?: string[]; // ['qtls-qts', 'pgce', 'teaching-license', 'none']
  minimum_experience?: string; // 'entry', 'junior', 'mid', 'senior', 'any'
  dbs_check?: string; // 'required', 'assist', 'no'
  other_requirements?: string;

  // Section 6: Application Process
  how_to_apply?: string; // 'tutorwise', 'network', 'organisation'
  application_instructions?: string;

  // Section 7: About Organisation
  about_organisation?: string;
  organisation_type?: string; // 'tutoring-agency', 'company', 'school', 'college', 'university', 'charity', 'other'
}

export interface UpdateListingInput extends Partial<CreateListingInput> {
  id: string;
}

export interface ListingFilters {
  listing_category?: ListingCategory; // v5.0: Filter by category
  subjects?: string[];
  levels?: string[];
  delivery_modes?: string[]; // Migration 195: Array filter for delivery modes
  location_city?: string;
  min_price?: number;
  max_price?: number;
  free_trial_only?: boolean;
  languages?: string[];
  tags?: string[];
  search?: string; // Full-text search
}

export interface ListingSort {
  field: 'created_at' | 'updated_at' | 'hourly_rate' | 'view_count' | 'booking_count';
  order: 'asc' | 'desc';
}

export interface ListingSearchParams {
  filters?: ListingFilters;
  sort?: ListingSort;
  limit?: number;
  offset?: number;
}

export interface ListingSearchResult {
  listings: Listing[];
  total: number;
  limit: number;
  offset: number;
}
