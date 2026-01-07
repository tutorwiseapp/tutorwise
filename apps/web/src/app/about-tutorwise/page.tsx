'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { MarketplaceItem } from '@/types/marketplace';
import { parseSearchQuery, queryToFilters } from '@/lib/services/gemini';
import { searchMarketplaceWithPagination, toMarketplaceItems } from '@/lib/api/marketplace';
import HeroSection from '@/app/components/feature/marketplace/HeroSection';
import FilterChips, { FilterState } from '@/app/components/feature/marketplace/FilterChips';
import RoleBasedHomepage from '@/app/components/feature/marketplace/RoleBasedHomepage';
import AdvancedFilters from '@/app/components/feature/marketplace/AdvancedFilters';
import type { SearchFilters } from '@/lib/services/savedSearches';
import styles from './page.module.css';

export default function YourHomePage() {
  const [hasSearched, setHasSearched] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>({});
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadedItems, setLoadedItems] = useState<MarketplaceItem[]>([]);

  // React Query: Fetch featured items (shown when not searching)
  const {
    data: featuredData,
    isLoading: isFeaturedLoading,
  } = useQuery({
    queryKey: ['featured-items-your-home'],
    queryFn: () => searchMarketplaceWithPagination({}, 0, 20),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
    retry: 2, // Retry failed requests twice
    enabled: !hasSearched,
  });

  // React Query: Fetch initial search results (shown when searching)
  const {
    data: searchData,
    isLoading: isSearchLoading,
  } = useQuery({
    queryKey: ['marketplace-search-your-home', searchFilters],
    queryFn: () => searchMarketplaceWithPagination(searchFilters, 0, 20),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (standardized)
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
    retry: 2, // Retry failed requests twice
    enabled: hasSearched && Object.keys(searchFilters).length > 0,
  });

  // Combine data based on search state
  const baseItems = useMemo(() => {
    if (hasSearched && searchData) {
      return toMarketplaceItems(searchData.profiles, searchData.listings);
    }
    if (featuredData) {
      return toMarketplaceItems(featuredData.profiles, featuredData.listings);
    }
    return [];
  }, [hasSearched, searchData, featuredData]);

  // Merge base items with paginated items
  const items = useMemo(() => {
    if (offset === 0 || !hasSearched) {
      return baseItems;
    }
    return [...baseItems, ...loadedItems];
  }, [baseItems, loadedItems, offset, hasSearched]);

  const total = hasSearched && searchData
    ? searchData.total
    : featuredData
    ? featuredData.total
    : 0;

  const isLoading = hasSearched ? isSearchLoading : isFeaturedLoading;
  const hasMore = items.length < total;

  // Manual pagination handler
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || isLoading) return;

    setIsLoadingMore(true);
    try {
      const nextOffset = items.length;
      const data = await searchMarketplaceWithPagination(
        hasSearched ? searchFilters : {},
        nextOffset,
        20
      );

      const newItems = toMarketplaceItems(data.profiles, data.listings);
      setLoadedItems([...loadedItems, ...newItems]);
      setOffset(nextOffset);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, isLoading, items.length, hasSearched, searchFilters, loadedItems]);

  const handleSearch = async (query: string) => {
    setHasSearched(true);
    setOffset(0);
    setLoadedItems([]);

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
    setOffset(0);
    setLoadedItems([]);
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
    setOffset(0);
    setLoadedItems([]);
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
