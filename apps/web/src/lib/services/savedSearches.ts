/**
 * Filename: savedSearches.ts
 * Purpose: Saved search management and notifications
 * Created: 2025-12-10
 * Phase: Marketplace Phase 3 - Advanced User Interactions
 *
 * Features:
 * - Save search criteria for quick access
 * - Search notifications when new matches appear
 * - Search history tracking
 * - Search analytics
 */

export interface SavedSearch {
  id: string;
  profile_id: string;
  name: string;
  search_query: string;
  filters: SearchFilters;
  notify_enabled: boolean;
  last_checked?: string;
  created_at: string;
  updated_at: string;
}

export interface SearchFilters {
  subjects?: string[];
  levels?: string[];
  delivery_modes?: string[]; // Migration 195: Array of delivery modes
  location_city?: string;
  min_price?: number;
  max_price?: number;
  listing_type?: 'session' | 'course' | 'job';
  marketplace_type?: 'tutors' | 'ai-agents' | 'organisations' | 'all'; // Filter by human tutors, AI tutors, organisations, or all
  entity_type?: 'humans' | 'ai-agents' | 'all'; // API-level filter (mapped from marketplace_type)
  availability?: string[];
  min_rating?: number;
  verified_only?: boolean;
}

export interface SearchHistory {
  id: string;
  profile_id: string;
  search_query: string;
  filters: SearchFilters;
  results_count: number;
  clicked_items: string[];
  created_at: string;
}

/**
 * Create a new saved search
 */
export async function createSavedSearch(
  supabase: any,
  profileId: string,
  name: string,
  searchQuery: string,
  filters: SearchFilters,
  notifyEnabled: boolean = false
): Promise<SavedSearch> {
  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      profile_id: profileId,
      name,
      search_query: searchQuery,
      filters,
      notify_enabled: notifyEnabled,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all saved searches for a profile
 */
export async function getSavedSearches(
  supabase: any,
  profileId: string
): Promise<SavedSearch[]> {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Update a saved search
 */
export async function updateSavedSearch(
  supabase: any,
  searchId: string,
  updates: Partial<SavedSearch>
): Promise<SavedSearch> {
  const { data, error } = await supabase
    .from('saved_searches')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', searchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a saved search
 */
export async function deleteSavedSearch(
  supabase: any,
  searchId: string
): Promise<void> {
  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', searchId);

  if (error) throw error;
}

/**
 * Execute a saved search and get results
 */
export async function executeSavedSearch(
  supabase: any,
  search: SavedSearch
): Promise<any[]> {
  const { filters } = search;

  let query = supabase
    .from('listings')
    .select('*, profile:profiles(*)')
    .eq('status', 'published');

  // Apply filters
  if (filters.subjects && filters.subjects.length > 0) {
    query = query.contains('subjects', filters.subjects);
  }

  if (filters.levels && filters.levels.length > 0) {
    query = query.contains('levels', filters.levels);
  }

  if (filters.delivery_modes && filters.delivery_modes.length > 0) {
    query = query.overlaps('delivery_mode', filters.delivery_modes);
  }

  if (filters.location_city) {
    query = query.eq('location_city', filters.location_city);
  }

  if (filters.min_price !== undefined) {
    query = query.gte('hourly_rate', filters.min_price);
  }

  if (filters.max_price !== undefined) {
    query = query.lte('hourly_rate', filters.max_price);
  }

  if (filters.listing_type) {
    query = query.eq('listing_type', filters.listing_type);
  }

  if (filters.verified_only) {
    query = query.eq('profile.verified', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Check for new matches since last check
 */
export async function checkForNewMatches(
  supabase: any,
  search: SavedSearch
): Promise<{ newMatches: any[]; count: number }> {
  const lastChecked = search.last_checked || search.created_at;

  let query = supabase
    .from('listings')
    .select('*, profile:profiles(*)')
    .eq('status', 'published')
    .gte('created_at', lastChecked);

  // Apply same filters as executeSavedSearch
  const { filters } = search;

  if (filters.subjects && filters.subjects.length > 0) {
    query = query.contains('subjects', filters.subjects);
  }

  if (filters.levels && filters.levels.length > 0) {
    query = query.contains('levels', filters.levels);
  }

  if (filters.delivery_modes && filters.delivery_modes.length > 0) {
    query = query.overlaps('delivery_mode', filters.delivery_modes);
  }

  if (filters.location_city) {
    query = query.eq('location_city', filters.location_city);
  }

  if (filters.min_price !== undefined) {
    query = query.gte('hourly_rate', filters.min_price);
  }

  if (filters.max_price !== undefined) {
    query = query.lte('hourly_rate', filters.max_price);
  }

  if (filters.listing_type) {
    query = query.eq('listing_type', filters.listing_type);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Update last_checked
  await updateSavedSearch(supabase, search.id, {
    last_checked: new Date().toISOString(),
  });

  return {
    newMatches: data || [],
    count: (data || []).length,
  };
}

/**
 * Log a search to history
 */
export async function logSearchHistory(
  supabase: any,
  profileId: string,
  searchQuery: string,
  filters: SearchFilters,
  resultsCount: number
): Promise<void> {
  const { error } = await supabase
    .from('search_history')
    .insert({
      profile_id: profileId,
      search_query: searchQuery,
      filters,
      results_count: resultsCount,
      clicked_items: [],
    });

  if (error && error.code !== '23505') { // Ignore duplicates
    console.error('Search history error:', error);
  }
}

/**
 * Get search history for a profile
 */
export async function getSearchHistory(
  supabase: any,
  profileId: string,
  limit: number = 20
): Promise<SearchHistory[]> {
  const { data, error } = await supabase
    .from('search_history')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Track clicked items in search history
 */
export async function trackSearchClick(
  supabase: any,
  historyId: string,
  itemId: string
): Promise<void> {
  // Get current clicked_items
  const { data: history } = await supabase
    .from('search_history')
    .select('clicked_items')
    .eq('id', historyId)
    .single();

  if (!history) return;

  const clickedItems = history.clicked_items || [];
  if (!clickedItems.includes(itemId)) {
    clickedItems.push(itemId);

    await supabase
      .from('search_history')
      .update({ clicked_items: clickedItems })
      .eq('id', historyId);
  }
}

/**
 * Get popular search terms
 */
export async function getPopularSearchTerms(
  supabase: any,
  limit: number = 10
): Promise<{ term: string; count: number }[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('search_history')
    .select('search_query')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .not('search_query', 'is', null)
    .not('search_query', 'eq', '');

  if (error) {
    console.error('Popular search terms error:', error);
    return [];
  }

  // Count occurrences
  const termCounts = new Map<string, number>();
  (data || []).forEach((item: any) => {
    const term = item.search_query.toLowerCase().trim();
    if (term) {
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    }
  });

  // Sort and return top terms
  return Array.from(termCounts.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
