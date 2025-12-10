'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Listing } from '@tutorwise/shared-types';
import type { MarketplaceItem } from '@/types/marketplace';
import { parseSearchQuery, queryToFilters } from '@/lib/services/gemini';
import HeroSection from '@/app/components/feature/marketplace/HeroSection';
import FilterChips, { FilterState } from '@/app/components/feature/marketplace/FilterChips';
import RoleBasedHomepage from '@/app/components/feature/marketplace/RoleBasedHomepage';
import AdvancedFilters from '@/app/components/feature/marketplace/AdvancedFilters';
import type { SearchFilters } from '@/lib/services/savedSearches';
import styles from './page.module.css';

export default function YourHomePage() {
  const [items, setItems] = useState<MarketplaceItem[]>([]); // Unified: profiles + listings
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<FilterState>({
    subjects: [],
    levels: [],
    locationType: null,
    priceRange: { min: null, max: null },
    freeTrialOnly: false,
  });

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>({});

  // Memoized executeSearch function (resets listings and offset)
  const executeSearch = useCallback(async (customFilters?: any, resetOffset = true) => {
    setIsLoading(true);
    if (resetOffset) {
      setOffset(0);
    }

    try {
      const searchFilters = customFilters || {
        subjects: filters.subjects.length > 0 ? filters.subjects : undefined,
        levels: filters.levels.length > 0 ? filters.levels : undefined,
        location_type: filters.locationType || undefined,
        min_price: filters.priceRange.min || undefined,
        max_price: filters.priceRange.max || undefined,
        free_trial_only: filters.freeTrialOnly || undefined,
      };

      // Build query string
      const params = new URLSearchParams();
      if (searchFilters.subjects) {
        params.append('subjects', searchFilters.subjects.join(','));
      }
      if (searchFilters.levels) {
        params.append('levels', searchFilters.levels.join(','));
      }
      if (searchFilters.location_type) {
        params.append('location_type', searchFilters.location_type);
      }
      if (searchFilters.location_city) {
        params.append('location_city', searchFilters.location_city);
      }
      if (searchFilters.min_price) {
        params.append('min_price', searchFilters.min_price.toString());
      }
      if (searchFilters.max_price) {
        params.append('max_price', searchFilters.max_price.toString());
      }
      if (searchFilters.free_trial_only) {
        params.append('free_trial_only', 'true');
      }

      // Always start at offset 0 for new searches
      params.append('offset', '0');
      params.append('limit', '20');

      // Fetch both profiles and listings when searching
      const [profilesRes, listingsRes] = await Promise.all([
        fetch(`/api/marketplace/profiles?limit=10&offset=0`),
        fetch(`/api/marketplace/search?${params.toString()}`),
      ]);

      const profilesData = await profilesRes.json();
      const listingsData = await listingsRes.json();

      // Merge into unified items
      const profileItems: MarketplaceItem[] = (profilesData.profiles || []).map((profile: any) => ({
        type: 'profile' as const,
        data: profile,
      }));

      const listingItems: MarketplaceItem[] = (listingsData.listings || []).map((listing: any) => ({
        type: 'listing' as const,
        data: listing,
      }));

      const merged = interleaveItems(profileItems, listingItems);

      setItems(merged);
      setTotal((profilesData.total || 0) + (listingsData.total || 0));
      setHasMore(merged.length === 20);
      setOffset(20);
    } catch (error) {
      console.error('Search execution error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Load More function for pagination
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const searchFilters = {
        subjects: filters.subjects.length > 0 ? filters.subjects : undefined,
        levels: filters.levels.length > 0 ? filters.levels : undefined,
        location_type: filters.locationType || undefined,
        min_price: filters.priceRange.min || undefined,
        max_price: filters.priceRange.max || undefined,
        free_trial_only: filters.freeTrialOnly || undefined,
      };

      const params = new URLSearchParams();
      if (searchFilters.subjects) {
        params.append('subjects', searchFilters.subjects.join(','));
      }
      if (searchFilters.levels) {
        params.append('levels', searchFilters.levels.join(','));
      }
      if (searchFilters.location_type) {
        params.append('location_type', searchFilters.location_type);
      }
      if (searchFilters.min_price) {
        params.append('min_price', searchFilters.min_price.toString());
      }
      if (searchFilters.max_price) {
        params.append('max_price', searchFilters.max_price.toString());
      }
      if (searchFilters.free_trial_only) {
        params.append('free_trial_only', 'true');
      }

      params.append('offset', offset.toString());
      params.append('limit', '20');

      // Fetch more profiles and listings
      const [profilesRes, listingsRes] = await Promise.all([
        fetch(`/api/marketplace/profiles?limit=10&offset=${Math.floor(offset / 2)}`),
        fetch(`/api/marketplace/search?${params.toString()}`),
      ]);

      const profilesData = await profilesRes.json();
      const listingsData = await listingsRes.json();

      const profileItems: MarketplaceItem[] = (profilesData.profiles || []).map((profile: any) => ({
        type: 'profile' as const,
        data: profile,
      }));

      const listingItems: MarketplaceItem[] = (listingsData.listings || []).map((listing: any) => ({
        type: 'listing' as const,
        data: listing,
      }));

      const newMerged = interleaveItems(profileItems, listingItems);

      setItems([...items, ...newMerged]);
      setHasMore(newMerged.length === 20);
      setOffset(offset + newMerged.length);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [filters, offset, hasMore, isLoadingMore, items]);

  // Load featured profiles and listings on initial page load
  useEffect(() => {
    const loadFeatured = async () => {
      setIsLoading(true);
      try {
        // Fetch both profiles and listings in parallel
        const [profilesRes, listingsRes] = await Promise.all([
          fetch('/api/marketplace/profiles?limit=10&offset=0'),
          fetch('/api/marketplace/search?limit=10&offset=0'),
        ]);

        const profilesData = await profilesRes.json();
        const listingsData = await listingsRes.json();


        // Merge profiles and listings into unified MarketplaceItem[]
        const profileItems: MarketplaceItem[] = (profilesData.profiles || []).map((profile: any) => ({
          type: 'profile' as const,
          data: profile,
        }));

        const listingItems: MarketplaceItem[] = (listingsData.listings || []).map((listing: any) => ({
          type: 'listing' as const,
          data: listing,
        }));

        // Interleave profiles and listings for variety
        const merged = interleaveItems(profileItems, listingItems);


        setItems(merged);
        setTotal((profilesData.total || 0) + (listingsData.total || 0));
        setHasMore(merged.length === 20);
        setOffset(20);

      } catch (error) {
        console.error('Failed to load featured items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeatured();
  }, []);

  // Helper function to interleave profiles and listings (alternating pattern)
  const interleaveItems = (profiles: MarketplaceItem[], listings: MarketplaceItem[]): MarketplaceItem[] => {
    const result: MarketplaceItem[] = [];
    const maxLength = Math.max(profiles.length, listings.length);

    for (let i = 0; i < maxLength; i++) {
      if (i < listings.length) result.push(listings[i]);
      if (i < profiles.length) result.push(profiles[i]);
    }

    return result;
  };

  // Reload results when filters change
  useEffect(() => {
    if (hasSearched) {
      executeSearch();
    }
  }, [filters, hasSearched, executeSearch]);

  const handleSearch = async (query: string) => {
    setCurrentQuery(query);
    setIsLoading(true);
    setHasSearched(true);

    try {
      // Parse the natural language query using AI
      const parsed = await parseSearchQuery(query);
      console.log('Parsed query:', parsed);

      // Convert parsed query to filters
      const searchFilters = queryToFilters(parsed);

      // Update filter state
      setFilters({
        subjects: searchFilters.subjects || [],
        levels: searchFilters.levels || [],
        locationType: searchFilters.location_type || null,
        priceRange: {
          min: searchFilters.min_price || null,
          max: searchFilters.max_price || null,
        },
        freeTrialOnly: searchFilters.free_trial_only || false,
      });

      // Execute the search
      await executeSearch(searchFilters);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleAdvancedFiltersChange = (newFilters: SearchFilters) => {
    setAdvancedFilters(newFilters);

    // Convert SearchFilters to FilterState
    setFilters({
      subjects: newFilters.subjects || [],
      levels: newFilters.levels || [],
      locationType: newFilters.location_type || null,
      priceRange: {
        min: newFilters.min_price || null,
        max: newFilters.max_price || null,
      },
      freeTrialOnly: false, // Not in advanced filters yet
    });
  };

  // Calculate active filter count
  const activeFilterCount = Object.keys(advancedFilters).filter(key => {
    const value = advancedFilters[key as keyof SearchFilters];
    return value !== undefined && value !== null && (
      typeof value !== 'object' || (Array.isArray(value) && value.length > 0)
    );
  }).length;

  const handleReset = async () => {
    setHasSearched(false);
    setAdvancedFilters({});
    setFilters({
      subjects: [],
      levels: [],
      locationType: null,
      priceRange: { min: null, max: null },
      freeTrialOnly: false,
    });

    // Reload featured items
    setIsLoading(true);
    try {
      const [profilesRes, listingsRes] = await Promise.all([
        fetch('/api/marketplace/profiles?limit=10&offset=0'),
        fetch('/api/marketplace/search?limit=10&offset=0'),
      ]);

      const profilesData = await profilesRes.json();
      const listingsData = await listingsRes.json();

      const profileItems: MarketplaceItem[] = (profilesData.profiles || []).map((profile: any) => ({
        type: 'profile' as const,
        data: profile,
      }));

      const listingItems: MarketplaceItem[] = (listingsData.listings || []).map((listing: any) => ({
        type: 'listing' as const,
        data: listing,
      }));

      const merged = interleaveItems(profileItems, listingItems);

      setItems(merged);
      setTotal((profilesData.total || 0) + (listingsData.total || 0));
      setHasMore(merged.length === 20);
      setOffset(20);
    } catch (error) {
      console.error('Failed to reload featured items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.yourHomePage}>
      {/* Hero Section with AI Chat Bar */}
      <HeroSection
        onSearch={handleSearch}
        isSearching={isLoading}
        onOpenFilters={() => setIsFiltersOpen(true)}
        activeFilterCount={activeFilterCount}
        onReset={handleReset}
        hasActiveSearch={hasSearched}
      />

      {/* Advanced Filters Drawer */}
      <AdvancedFilters
        filters={advancedFilters}
        onFiltersChange={handleAdvancedFiltersChange}
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
      />

      {/* Filter Chips - Hidden */}
      {/* <FilterChips filters={filters} onFilterChange={handleFilterChange} /> */}

      {/* Role-Based Homepage Variants */}
      <RoleBasedHomepage
        initialItems={items}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        total={total}
        onSearch={handleSearch}
        onLoadMore={loadMore}
      />
    </div>
  );
}
