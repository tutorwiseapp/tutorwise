'use client';

import { useState, useEffect } from 'react';
import type { Listing } from '@tutorwise/shared-types';
import { parseSearchQuery, queryToFilters } from '@/lib/services/gemini';
import HeroSection from '@/app/components/marketplace/HeroSection';
import FilterChips, { FilterState } from '@/app/components/marketplace/FilterChips';
import MarketplaceGrid from '@/app/components/marketplace/MarketplaceGrid';
import styles from './page.module.css';

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');

  const [filters, setFilters] = useState<FilterState>({
    subjects: [],
    levels: [],
    locationType: null,
    priceRange: { min: null, max: null },
    freeTrialOnly: false,
  });

  // Load featured tutors on initial page load
  useEffect(() => {
    loadFeaturedTutors();
  }, []);

  // Reload results when filters change
  useEffect(() => {
    if (hasSearched) {
      executeSearch();
    }
  }, [filters]);

  const loadFeaturedTutors = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/marketplace/search?limit=12');
      const data = await response.json();
      setListings(data.listings || []);
    } catch (error) {
      console.error('Failed to load featured tutors:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const executeSearch = async (customFilters?: any) => {
    setIsLoading(true);
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

      const response = await fetch(`/api/marketplace/search?${params.toString()}`);
      const data = await response.json();

      setListings(data.listings || []);
    } catch (error) {
      console.error('Search execution error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  return (
    <div className={styles.marketplacePage}>
      {/* Hero Section with AI Chat Bar */}
      <HeroSection onSearch={handleSearch} isSearching={isLoading} />

      {/* Filter Chips */}
      <FilterChips filters={filters} onFilterChange={handleFilterChange} />

      {/* Marketplace Grid */}
      <MarketplaceGrid
        listings={listings}
        isLoading={isLoading}
        hasSearched={hasSearched}
      />
    </div>
  );
}