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
  delivery_modes?: string[]; // Delivery modes (online, in_person, hybrid)
  min_hourly_rate?: number; // Minimum price across all listings
  max_hourly_rate?: number; // Maximum price across all listings
}

export interface OrganisationProfile {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  avatar_url?: string;
  location_city?: string;
  location_country?: string;
  subjects_offered?: string[];
  category?: string; // 'agency' | 'school' | 'company' | etc.
  caas_score?: number;
  total_tutors?: number;
  avg_rating?: number;
  total_reviews?: number;
}

export interface AITutorProfile {
  id: string;
  name: string; // URL slug
  display_name: string;
  description?: string;
  avatar_url?: string;
  subject: string;
  skills?: string[];
  price_per_hour: number;
  currency?: string;
  status: string;
  avg_rating?: number;
  total_reviews?: number;
  total_sessions?: number;
  owner_name?: string; // Name of tutor who created it
  owner_avatar?: string;
}

export type MarketplaceItemType = 'profile' | 'listing' | 'organisation' | 'ai_tutor';

export interface MarketplaceItem {
  type: MarketplaceItemType;
  data: TutorProfile | Listing | OrganisationProfile | AITutorProfile;
}

// Type guards
export function isProfile(item: MarketplaceItem): item is MarketplaceItem & { data: TutorProfile } {
  return item.type === 'profile';
}

export function isListing(item: MarketplaceItem): item is MarketplaceItem & { data: Listing } {
  return item.type === 'listing';
}

export function isOrganisation(item: MarketplaceItem): item is MarketplaceItem & { data: OrganisationProfile } {
  return item.type === 'organisation';
}

export function isAITutor(item: MarketplaceItem): item is MarketplaceItem & { data: AITutorProfile } {
  return item.type === 'ai_tutor';
}
