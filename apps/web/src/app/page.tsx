'use client';

import { useState, useEffect } from 'react';
import type { Listing } from '@tutorwise/shared-types';
import { parseSearchQuery, queryToFilters } from '@/lib/services/gemini';
import HeroSection from '@/app/components/feature/marketplace/HeroSection';
import MarketplaceGrid from '@/app/components/feature/marketplace/MarketplaceGrid';
import styles from './page.module.css';

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
      setListings(data.listings || []);
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
      if (searchFilters.free_trial_only) {
        params.append('free_trial_only', 'true');
      }

      const response = await fetch(`/api/marketplace/search?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await response.json();

      setListings(data.listings || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.marketplacePage}>
      {/* Hero Section with AI Chat Bar */}
      <HeroSection onSearch={handleSearch} isSearching={isLoading} />

      {/* Marketplace Grid */}
      <MarketplaceGrid
        listings={listings}
        isLoading={isLoading}
        hasSearched={hasSearched}
      />
    </div>
  );
}