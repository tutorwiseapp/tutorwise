'use client';

/**
 * Filename: apps/web/src/app/page.tsx
 * Purpose: Home Page - Marketplace/Browse Listings
 * Updated: 2025-12-21 - SEO optimization (metadata in root layout.tsx)
 * Architecture: Client Component with React Query
 *
 * Note: SEO metadata is defined in apps/web/src/app/layout.tsx
 * (Cannot export metadata from client components in Next.js 14+)
 */

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { MarketplaceItem } from '@/types/marketplace';
import { parseSearchQuery, queryToFilters } from '@/lib/services/gemini';
import { getFeaturedItems, searchMarketplace, toMarketplaceItems } from '@/lib/api/marketplace';
import HeroSection from '@/app/components/feature/marketplace/HeroSection';
import MarketplaceGrid from '@/app/components/feature/marketplace/MarketplaceGrid';
import AdvancedFilters from '@/app/components/feature/marketplace/AdvancedFilters';
import type { SearchFilters } from '@/lib/services/savedSearches';
import styles from './page.module.css';

export default function HomePage() {
  const [hasSearched, setHasSearched] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>({});
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});

  // React Query: Fetch featured items (shown when not searching)
  const {
    data: featuredData,
    isLoading: isFeaturedLoading,
  } = useQuery({
    queryKey: ['featured-items'],
    queryFn: () => getFeaturedItems(10, 0),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !hasSearched,
  });

  // React Query: Fetch search results (shown when searching)
  const {
    data: searchData,
    isLoading: isSearchLoading,
  } = useQuery({
    queryKey: ['marketplace-search', searchFilters],
    queryFn: () => searchMarketplace(searchFilters),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: hasSearched && Object.keys(searchFilters).length > 0,
  });

  // Combine data based on search state
  const items = hasSearched && searchData
    ? toMarketplaceItems([], searchData.listings)
    : featuredData
    ? toMarketplaceItems(featuredData.profiles, featuredData.listings)
    : [];

  const total = hasSearched && searchData
    ? searchData.total
    : featuredData
    ? featuredData.total
    : 0;

  const isLoading = hasSearched ? isSearchLoading : isFeaturedLoading;

  const handleSearch = async (query: string) => {
    setHasSearched(true);

    try {
      // Parse the natural language query using AI
      const parsed = await parseSearchQuery(query);
      console.log('Parsed query:', parsed);

      // Convert parsed query to filters
      const filters = queryToFilters(parsed);
      setSearchFilters(filters);
      setAdvancedFilters(filters);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleAdvancedFiltersChange = (newFilters: SearchFilters) => {
    setAdvancedFilters(newFilters);
    setSearchFilters(newFilters);
    setHasSearched(true);
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
    setSearchFilters({});
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
