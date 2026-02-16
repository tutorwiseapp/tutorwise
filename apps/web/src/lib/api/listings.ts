/**
 * Listings API utilities
 * Handles CRUD operations for tutor service listings
 */

import { createClient } from '@/utils/supabase/client';
import type {
  Listing,
  CreateListingInput,
  UpdateListingInput,
  ListingSearchParams,
  ListingSearchResult,
} from '@tutorwise/shared-types';

/**
 * Get all listings for the current user
 */
export async function getMyListings(): Promise<Listing[]> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      profiles:profile_id (
        avatar_url
      )
    `)
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Flatten the profile data into the listing object
  return (data || []).map((listing: any) => ({
    ...listing,
    avatar_url: listing.profiles?.avatar_url,
    profiles: undefined, // Remove the nested object
  })) as Listing[];
}

/**
 * Get a single listing by ID
 */
export async function getListing(id: string): Promise<Listing | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      profiles:profile_id (
        avatar_url
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('getListing error:', error);
    if (error.code !== 'PGRST116') {
      throw error;
    }
  }

  if (!data) {
    console.warn('getListing: No data found for id:', id);
    return null;
  }

  // Flatten the profile data into the listing object
  return {
    ...data,
    avatar_url: (data as any).profiles?.avatar_url,
    profiles: undefined,
  } as Listing;
}

/**
 * Get a listing by slug
 */
export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data as Listing | null;
}

/**
 * Create a new listing
 */
export async function createListing(input: CreateListingInput): Promise<Listing> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error('[createListing] Auth error:', authError);
    throw new Error(`Authentication failed: ${authError.message}`);
  }
  if (!user) {
    console.error('[createListing] No user found');
    throw new Error('Not authenticated - please log in');
  }

  console.log('[createListing] User authenticated:', user.id);

  // Fetch user's active role to set created_as_role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('[createListing] Profile fetch error:', profileError);
    throw new Error('Failed to fetch user profile');
  }

  const activeRole = profile.active_role;
  console.log('[createListing] User active role:', activeRole);

  // Pass through ALL fields from input, but ensure profile_id and defaults are set correctly
  // Note: Spread input first, then override critical fields to ensure they're not undefined
  const listingData = {
    ...input,
    // Critical: Override profile_id to ensure it's never undefined
    profile_id: user.id,
    // Set created_as_role to track which role created this listing
    created_as_role: activeRole,
    // Apply defaults only if not provided (use logical OR for falsy values except false itself)
    languages: input.languages || ['English'],
    location_country: input.location_country || 'United Kingdom',
    timezone: input.timezone || 'Europe/London',
    currency: input.currency || 'GBP',
    free_trial: input.free_trial ?? false,
    images: input.images || [],
    tags: input.tags || [],
    status: input.status || 'draft',
  };

  console.log('[createListing] Inserting listing data:', {
    ...listingData,
    description: listingData.description?.substring(0, 50) + '...'
  });

  const { data, error } = await supabase
    .from('listings')
    .insert(listingData)
    .select()
    .single();

  if (error) {
    console.error('[createListing] Database error:', error);
    throw new Error(`Failed to create listing: ${error.message}`);
  }

  console.log('[createListing] Successfully created listing:', data.id);
  return data as Listing;
}

/**
 * Update an existing listing
 * Only the listing owner can update their listing
 */
export async function updateListing(input: UpdateListingInput): Promise<Listing> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { id, ...updates } = input;

  // Update listing - RLS policy ensures only owner can update
  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .eq('profile_id', user.id) // Only allow owner to update
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Listing not found or you do not have permission to edit it');

  return data as Listing;
}

/**
 * Delete a listing
 */
export async function deleteListing(id: string): Promise<void> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id)
    .eq('profile_id', user.id); // Ensure user owns the listing

  if (error) throw error;
}

/**
 * Publish a listing (change status to published)
 */
export async function publishListing(id: string): Promise<Listing> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('listings')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('profile_id', user.id)
    .select()
    .single();

  if (error) throw error;

  // Fire-and-forget: generate embedding for the published listing
  try {
    fetch(`/api/listings/${id}/embed`, { method: 'POST' }).catch(() => {});
  } catch {
    // Non-blocking — embedding failure doesn't affect publish
  }

  return data as Listing;
}

/**
 * Unpublish a listing (change status to draft, unpublished, or archived)
 */
export async function unpublishListing(id: string, status: 'draft' | 'unpublished' | 'archived' = 'unpublished'): Promise<Listing> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('listings')
    .update({ status })
    .eq('id', id)
    .eq('profile_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data as Listing;
}

/**
 * Search/browse listings with filters and sorting
 */
export async function searchListings(params: ListingSearchParams = {}): Promise<ListingSearchResult> {
  const supabase = createClient();
  const { filters = {}, sort, limit = 20, offset = 0 } = params;

  let query = supabase
    .from('listings')
    .select(`
      *,
      profiles:profile_id (
        avatar_url,
        identity_verified,
        dbs_verified,
        caas_scores (
          total_score
        )
      )
    `, { count: 'exact' })
    .eq('status', 'published');

  // Apply filters
  if (filters.subjects && filters.subjects.length > 0) {
    query = query.overlaps('subjects', filters.subjects);
  }

  if (filters.levels && filters.levels.length > 0) {
    query = query.overlaps('levels', filters.levels);
  }

  if (filters.delivery_modes && filters.delivery_modes.length > 0) {
    query = query.overlaps('delivery_mode', filters.delivery_modes);
  }

  if (filters.location_city) {
    query = query.ilike('location_city', `%${filters.location_city}%`);
  }

  if (filters.min_price !== undefined) {
    query = query.gte('hourly_rate', filters.min_price);
  }

  if (filters.max_price !== undefined) {
    query = query.lte('hourly_rate', filters.max_price);
  }

  if (filters.free_trial_only) {
    query = query.eq('free_trial', true);
  }

  if (filters.languages && filters.languages.length > 0) {
    query = query.overlaps('languages', filters.languages);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  if (filters.search) {
    // Full-text search on title and description
    query = query.textSearch('title', filters.search, {
      type: 'websearch',
      config: 'english',
    });
  }

  // Apply sorting
  if (sort) {
    query = query.order(sort.field, { ascending: sort.order === 'asc' });
  } else {
    // Default sort: CaaS total_score DESC (highest credibility first), then published_at DESC
    // Note: Supabase doesn't support ordering by nested fields directly in the query
    // We'll need to sort in memory after fetching
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  // Flatten the profile data into the listing objects and extract CaaS score
  let listings = (data || []).map((listing: any) => ({
    ...listing,
    avatar_url: listing.profiles?.avatar_url,
    identity_verified: listing.profiles?.identity_verified,
    dbs_verified: listing.profiles?.dbs_verified,
    caas_total_score: listing.profiles?.caas_scores?.[0]?.total_score || 0,
    profiles: undefined, // Remove the nested object
  })) as Listing[];

  // Apply default sorting by CaaS score if no custom sort specified
  if (!sort) {
    listings = listings.sort((a: any, b: any) => {
      // Primary sort: CaaS score DESC (higher scores first)
      const scoreDiff = (b.caas_total_score || 0) - (a.caas_total_score || 0);
      if (scoreDiff !== 0) return scoreDiff;

      // Secondary sort: published_at DESC (more recent first)
      const aDate = a.published_at ? new Date(a.published_at).getTime() : 0;
      const bDate = b.published_at ? new Date(b.published_at).getTime() : 0;
      return bDate - aDate;
    });
  }

  return {
    listings,
    total: count || 0,
    limit,
    offset,
  };
}

/**
 * Increment view count for a listing
 */
export async function incrementListingViews(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('increment_listing_views', {
    listing_id: id,
  });

  if (error) {
    // Fallback if RPC function doesn't exist
    const { data: listing } = await supabase
      .from('listings')
      .select('view_count')
      .eq('id', id)
      .single();

    if (listing) {
      await supabase
        .from('listings')
        .update({ view_count: (listing.view_count || 0) + 1 })
        .eq('id', id);
    }
  }
}

/**
 * Increment inquiry count for a listing
 */
export async function incrementListingInquiries(id: string): Promise<void> {
  const supabase = createClient();

  const { data: listing } = await supabase
    .from('listings')
    .select('inquiry_count')
    .eq('id', id)
    .single();

  if (listing) {
    await supabase
      .from('listings')
      .update({ inquiry_count: (listing.inquiry_count || 0) + 1 })
      .eq('id', id);
  }
}

/**
 * Increment booking count for a listing
 */
export async function incrementListingBookings(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('increment_listing_booking_count', {
    listing_id: id,
  });

  if (error) {
    // Fallback if RPC function doesn't exist
    const { data: listing } = await supabase
      .from('listings')
      .select('booking_count')
      .eq('id', id)
      .single();

    if (listing) {
      await supabase
        .from('listings')
        .update({ booking_count: (listing.booking_count || 0) + 1 })
        .eq('id', id);
    }
  }
}
