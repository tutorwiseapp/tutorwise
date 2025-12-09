/**
 * Listing v4.1 Type Extensions
 * Extends the base Listing type with v4.1 dynamic details fields
 */

import type { Listing as BaseListing, ServiceType, PackageType, AvailabilityPeriod } from '@tutorwise/shared-types';

// Re-export UnavailabilityPeriod type
export interface UnavailabilityPeriod {
  id: string;
  fromDate: string;
  toDate: string;
}

/**
 * Extended Listing type with v4.1 fields
 * Adds service-specific fields for ActionCard variants
 * Note: availability field is now AvailabilityPeriod[] in base Listing type (no need to override)
 */
export interface ListingV41 extends BaseListing {
  // Service type (normalized from listing_type)
  service_type?: ServiceType;

  // Service-specific fields
  max_attendees?: number; // For group-session and workshop
  session_duration?: number; // In minutes (for one-to-one and group-session)
  group_price_per_person?: number; // Price per person for group sessions
  package_price?: number; // Fixed price for study packages
  package_type?: PackageType; // Type of study package (pdf, video, bundle)

  // Image fields
  hero_image_url?: string;
  gallery_image_urls?: string[];

  // Unavailability field (availability is in base type)
  unavailability?: UnavailabilityPeriod[]; // JSONB array of UnavailabilityPeriod

  // Tutor stats (from migration 032)
  sessions_taught?: number;
  response_time_hours?: number;
  average_rating?: number;
  response_rate_percentage?: number;
  years_teaching?: number;

  // v5.9: Free Help Now
  available_free_help?: boolean; // Whether tutor is currently offering free help sessions
}
