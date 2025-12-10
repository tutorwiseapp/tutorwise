'use client';

import { useState, useEffect } from 'react';
import type { Listing } from '@tutorwise/shared-types';
import type { MarketplaceItem } from '@/types/marketplace';
import { parseSearchQuery, queryToFilters } from '@/lib/services/gemini';
import HeroSection from '@/app/components/feature/marketplace/HeroSection';
import MarketplaceGrid from '@/app/components/feature/marketplace/MarketplaceGrid';
import AdvancedFilters from '@/app/components/feature/marketplace/AdvancedFilters';
import type { SearchFilters } from '@/lib/services/savedSearches';
import styles from './page.module.css';

export default function HomePage() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [total, setTotal] = useState(0);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>({});

  // Load featured tutors on initial page load
  useEffect(() => {
    loadFeaturedTutors();
  }, []);

  const loadFeaturedTutors = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/marketplace/search?limit=12', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await response.json();

      // Convert listings to MarketplaceItem[]
      const listingItems: MarketplaceItem[] = (data.listings || []).map((listing: Listing) => ({
        type: 'listing' as const,
        data: listing,
      }));

      setItems(listingItems);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load featured tutors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      // Parse the natural language query using AI
      const parsed = await parseSearchQuery(query);
      console.log('Parsed query:', parsed);

      // Convert parsed query to filters
      const searchFilters = queryToFilters(parsed);

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

      const response = await fetch(`/api/marketplace/search?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await response.json();

      // Convert listings to MarketplaceItem[]
      const listingItems: MarketplaceItem[] = (data.listings || []).map((listing: Listing) => ({
        type: 'listing' as const,
        data: listing,
      }));

      setItems(listingItems);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvancedFiltersChange = (newFilters: SearchFilters) => {
    setAdvancedFilters(newFilters);
    // Trigger search with new filters
    applyFilters(newFilters);
  };

  const applyFilters = async (filters: SearchFilters) => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (filters.subjects) {
        params.append('subjects', filters.subjects.join(','));
      }
      if (filters.levels) {
        params.append('levels', filters.levels.join(','));
      }
      if (filters.location_type) {
        params.append('location_type', filters.location_type);
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

      const response = await fetch(`/api/marketplace/search?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await response.json();

      const listingItems: MarketplaceItem[] = (data.listings || []).map((listing: Listing) => ({
        type: 'listing' as const,
        data: listing,
      }));

      setItems(listingItems);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Filter search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate active filter count
  const activeFilterCount = Object.keys(advancedFilters).filter(key => {
    const value = advancedFilters[key as keyof SearchFilters];
    return value !== undefined && value !== null && (
      typeof value !== 'object' || (Array.isArray(value) && value.length > 0)
    );
  }).length;

  const handleReset = () => {
    setHasSearched(false);
    setAdvancedFilters({});
    loadFeaturedTutors();
  };

  return (
    <div className={styles.marketplacePage}>
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

      {/* Marketplace Grid */}
      <MarketplaceGrid
        items={items}
        isLoading={isLoading}
        isLoadingMore={false}
        hasSearched={hasSearched}
        hasMore={false}
        total={total}
        onLoadMore={() => {}}
      />
    </div>
  );
}
