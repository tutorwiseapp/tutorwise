/**
 * Marketplace Types
 * Unified types for marketplace discovery (profiles + listings)
 */

import type { Listing } from '@tutorwise/shared-types';

export interface TutorProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  headline?: string;
  city?: string;
  identity_verified?: boolean;
  dbs_verified?: boolean;
  available_free_help?: boolean;
  listing_count?: number; // Number of published listings
  average_rating?: number;
  review_count?: number;
  subjects?: string[]; // Primary subjects taught (from listings)
  levels?: string[]; // Primary levels taught (from listings)
  location_types?: string[]; // Delivery modes (online, in_person, hybrid)
  min_hourly_rate?: number; // Minimum price across all listings
  max_hourly_rate?: number; // Maximum price across all listings
}

export type MarketplaceItemType = 'profile' | 'listing';

export interface MarketplaceItem {
  type: MarketplaceItemType;
  data: TutorProfile | Listing;
}

// Type guards
export function isProfile(item: MarketplaceItem): item is MarketplaceItem & { data: TutorProfile } {
  return item.type === 'profile';
}

export function isListing(item: MarketplaceItem): item is MarketplaceItem & { data: Listing } {
  return item.type === 'listing';
}
