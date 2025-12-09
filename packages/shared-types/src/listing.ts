/**
 * Listing types for tutor service listings
 * v4.0: Updated to support dynamic multi-service listings
 */

export type ListingStatus = 'draft' | 'published' | 'unpublished' | 'paused' | 'archived';
export type LocationType = 'online' | 'in_person' | 'hybrid';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/**
 * v4.0: New listing type system for multi-service platform
 * Supports: One-to-One, Group Session, Workshop/Webinar, Study Package
 */
export type ServiceType = 'one-to-one' | 'group-session' | 'workshop' | 'study-package';
export type PackageType = 'pdf' | 'video' | 'bundle';

export interface TimeSlot {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

export interface Availability {
  [key: string]: TimeSlot[]; // DayOfWeek as key
}

/**
 * v4.0: Availability Period (reused from profile system)
 * Supports both recurring weekly schedules and one-time slots
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

export interface Listing {
  id: string;
  profile_id: string;

  // Basic Info
  full_name?: string; // Full name of the tutor (e.g., "Jane Doe")
  avatar_url?: string; // Profile picture URL from profiles table
  listing_type?: string; // Type of listing (e.g., "Tutor: One-on-One Session")
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
  location_type: LocationType;
  location_address?: string;
  location_city?: string;
  location_postcode?: string;
  location_country: string;
  timezone: string;
  availability?: Availability;

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

  // Template Fields
  is_template?: boolean;      // Whether this is a system-generated template
  is_deletable?: boolean;     // Whether this listing can be deleted
  template_id?: string;       // Unique identifier for template type (e.g., "mathematics-gcse-group")

  // v5.9: Free Help Now
  available_free_help?: boolean; // Whether tutor is currently offering free help sessions

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
  location_type: LocationType;
  location_address?: string;
  location_city?: string;
  location_postcode?: string;
  location_country?: string;
  location_details?: string;
  timezone?: string;
  availability?: Availability;

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
}

export interface UpdateListingInput extends Partial<CreateListingInput> {
  id: string;
}

export interface ListingFilters {
  subjects?: string[];
  levels?: string[];
  location_type?: LocationType;
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
