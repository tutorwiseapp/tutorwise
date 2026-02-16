/**
 * Filename: src/lib/api/marketplace.ts
 * Purpose: Marketplace API functions for fetching profiles and listings
 * Created: 2025-12-16
 */

import type { Listing } from '@tutorwise/shared-types';
import type { MarketplaceItem, OrganisationProfile } from '@/types/marketplace';
import type { SearchFilters } from '@/lib/services/savedSearches';

export interface FeaturedItemsResponse {
  profiles: any[];
  listings: Listing[];
  organisations: OrganisationProfile[];
  total: number;
}

export interface SearchResponse {
  listings: Listing[];
  profiles: any[];
  organisations: OrganisationProfile[];
  total: number;
}

export interface ProfilesResponse {
  profiles: any[];
  total: number;
}

/**
 * Fetch featured tutors, listings, and organisations
 */
export async function getFeaturedItems(limit = 10, offset = 0): Promise<FeaturedItemsResponse> {
  const [profilesRes, listingsRes, organisationsRes] = await Promise.all([
    fetch(`/api/marketplace/profiles?limit=${limit}&offset=${offset}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    }),
    fetch(`/api/marketplace/search?limit=${limit}&offset=${offset}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    }),
    fetch(`/api/marketplace/organisations?limit=${Math.floor(limit / 3)}&offset=${offset}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    }),
  ]);

  if (!profilesRes.ok || !listingsRes.ok || !organisationsRes.ok) {
    throw new Error('Failed to fetch featured items');
  }

  const profilesData = await profilesRes.json();
  const listingsData = await listingsRes.json();
  const organisationsData = await organisationsRes.json();

  return {
    profiles: profilesData.profiles || [],
    listings: listingsData.listings || [],
    organisations: organisationsData.organisations || [],
    total: (profilesData.total || 0) + (listingsData.total || 0) + (organisationsData.total || 0),
  };
}

/**
 * Search marketplace with filters (listings + profiles + organisations).
 * When a `query` is present, the search API uses hybrid semantic search
 * and returns all three entity types in a single request.
 */
export async function searchMarketplace(filters: SearchFilters & { query?: string }): Promise<SearchResponse> {
  const params = new URLSearchParams();

  if (filters.query) {
    params.append('query', filters.query);
  }
  if (filters.subjects) {
    params.append('subjects', filters.subjects.join(','));
  }
  if (filters.levels) {
    params.append('levels', filters.levels.join(','));
  }
  if (filters.delivery_modes && filters.delivery_modes.length > 0) {
    params.append('delivery_modes', filters.delivery_modes.join(','));
  }
  if (filters.location_city) {
    params.append('location_city', filters.location_city);
  }
  if (filters.min_price) {
    params.append('min_price', filters.min_price.toString());
  }
  if (filters.max_price) {
    params.append('max_price', filters.max_price.toString());
  }

  // When query is present, the search API returns listings + profiles + organisations
  if (filters.query) {
    const res = await fetch(`/api/marketplace/search?${params.toString()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) throw new Error('Failed to search marketplace');
    const data = await res.json();

    return {
      listings: data.listings || [],
      profiles: data.profiles || [],
      organisations: data.organisations || [],
      total: data.total || 0,
    };
  }

  // Structured-only: fetch listings and organisations separately (backward compatible)
  const [listingsRes, organisationsRes] = await Promise.all([
    fetch(`/api/marketplace/search?${params.toString()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    }),
    fetch(`/api/marketplace/organisations?${params.toString()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    }),
  ]);

  if (!listingsRes.ok || !organisationsRes.ok) {
    throw new Error('Failed to search marketplace');
  }

  const listingsData = await listingsRes.json();
  const organisationsData = await organisationsRes.json();

  return {
    listings: listingsData.listings || [],
    profiles: [],
    organisations: organisationsData.organisations || [],
    total: (listingsData.total || 0) + (organisationsData.total || 0),
  };
}

/**
 * Fetch marketplace profiles
 */
export async function getMarketplaceProfiles(limit = 10, offset = 0): Promise<ProfilesResponse> {
  const response = await fetch(`/api/marketplace/profiles?limit=${limit}&offset=${offset}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch marketplace profiles');
  }

  return response.json();
}

/**
 * Search with pagination for Your Home page
 */
export async function searchMarketplaceWithPagination(
  filters: SearchFilters,
  offset = 0,
  limit = 20
): Promise<{ profiles: any[]; listings: Listing[]; total: number }> {
  const params = new URLSearchParams();

  if (filters.subjects) {
    params.append('subjects', filters.subjects.join(','));
  }
  if (filters.levels) {
    params.append('levels', filters.levels.join(','));
  }
  if (filters.delivery_modes && filters.delivery_modes.length > 0) {
    params.append('delivery_modes', filters.delivery_modes.join(','));
  }
  if (filters.location_city) {
    params.append('location_city', filters.location_city);
  }
  if (filters.min_price) {
    params.append('min_price', filters.min_price.toString());
  }
  if (filters.max_price) {
    params.append('max_price', filters.max_price.toString());
  }

  params.append('offset', offset.toString());
  params.append('limit', limit.toString());

  // Fetch both profiles and listings
  const [profilesRes, listingsRes] = await Promise.all([
    fetch(`/api/marketplace/profiles?limit=${Math.floor(limit / 2)}&offset=${Math.floor(offset / 2)}`),
    fetch(`/api/marketplace/search?${params.toString()}`),
  ]);

  if (!profilesRes.ok || !listingsRes.ok) {
    throw new Error('Failed to search marketplace with pagination');
  }

  const profilesData = await profilesRes.json();
  const listingsData = await listingsRes.json();

  return {
    profiles: profilesData.profiles || [],
    listings: listingsData.listings || [],
    total: (profilesData.total || 0) + (listingsData.total || 0),
  };
}

/**
 * Helper function to convert API responses to MarketplaceItem[]
 */
export function toMarketplaceItems(profiles: any[], listings: Listing[], organisations: OrganisationProfile[] = []): MarketplaceItem[] {
  const profileItems: MarketplaceItem[] = profiles.map((profile) => ({
    type: 'profile' as const,
    data: profile,
  }));

  const listingItems: MarketplaceItem[] = listings.map((listing) => ({
    type: 'listing' as const,
    data: listing,
  }));

  const organisationItems: MarketplaceItem[] = organisations.map((org) => ({
    type: 'organisation' as const,
    data: org,
  }));

  // Interleave listings, profiles, and organisations (listings first, then profiles, then orgs)
  const merged: MarketplaceItem[] = [];
  const maxLength = Math.max(profileItems.length, listingItems.length, organisationItems.length);
  for (let i = 0; i < maxLength; i++) {
    if (i < listingItems.length) merged.push(listingItems[i]);
    if (i < profileItems.length) merged.push(profileItems[i]);
    if (i < organisationItems.length) merged.push(organisationItems[i]);
  }

  return merged;
}
