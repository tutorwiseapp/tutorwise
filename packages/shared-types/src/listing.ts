/**
 * Listing types for tutor service listings
 */

export type ListingStatus = 'draft' | 'published' | 'paused' | 'archived';
export type LocationType = 'online' | 'in_person' | 'hybrid';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeSlot {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

export interface Availability {
  [key: string]: TimeSlot[]; // DayOfWeek as key
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
  title: string;
  description: string;
  status: ListingStatus;

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

  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface CreateListingInput {
  // Basic Info (required)
  title: string;
  description: string;

  // Teaching Details (required)
  subjects: string[];
  levels: string[];
  languages?: string[];

  // Pricing
  hourly_rate?: number;
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
  timezone?: string;
  availability?: Availability;

  // Media
  images?: string[];
  video_url?: string;

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
