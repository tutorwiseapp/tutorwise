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
  console.log('[getMyListings] Starting API call...');
  const supabase = createClient();

  console.log('[getMyListings] Getting user...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('[getMyListings] Auth error:', authError);
    throw new Error('Not authenticated');
  }

  console.log('[getMyListings] User authenticated, fetching listings for user:', user.id);
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

  if (error) {
    console.error('[getMyListings] Supabase error:', error);
    throw error;
  }

  console.log('[getMyListings] Successfully fetched', data?.length || 0, 'listings');

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

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) return null;

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
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const listingData = {
    profile_id: user.id,
    full_name: input.full_name,
    title: input.title,
    description: input.description,
    subjects: input.subjects,
    levels: input.levels,
    languages: input.languages || ['English'],
    location_type: input.location_type,
    location_address: input.location_address,
    location_city: input.location_city,
    location_postcode: input.location_postcode,
    location_country: input.location_country || 'United Kingdom',
    timezone: input.timezone || 'Europe/London',
    hourly_rate: input.hourly_rate,
    currency: input.currency || 'GBP',
    pricing_packages: input.pricing_packages,
    free_trial: input.free_trial || false,
    trial_duration_minutes: input.trial_duration_minutes,
    availability: input.availability,
    images: input.images || [],
    video_url: input.video_url,
    tags: input.tags || [],
    status: input.status || 'draft',
  };

  const { data, error } = await supabase
    .from('listings')
    .insert(listingData)
    .select()
    .single();

  if (error) throw error;
  return data as Listing;
}

/**
 * Update an existing listing
 */
export async function updateListing(input: UpdateListingInput): Promise<Listing> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { id, ...updates } = input;

  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .eq('profile_id', user.id) // Ensure user owns the listing
    .select()
    .single();

  if (error) throw error;
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
  return data as Listing;
}

/**
 * Unpublish a listing (change status to draft, paused, or archived)
 */
export async function unpublishListing(id: string, status: 'draft' | 'paused' | 'archived' = 'paused'): Promise<Listing> {
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
        avatar_url
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

  if (filters.location_type) {
    query = query.eq('location_type', filters.location_type);
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
    // Default sort by most recent
    query = query.order('published_at', { ascending: false });
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  // Flatten the profile data into the listing objects
  const listings = (data || []).map((listing: any) => ({
    ...listing,
    avatar_url: listing.profiles?.avatar_url,
    profiles: undefined, // Remove the nested object
  })) as Listing[];

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
