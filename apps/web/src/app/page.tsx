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
import { parseSearchQuery, queryToFilters } from '@/lib/services/gemini';
import { getFeaturedItems, searchMarketplace, toMarketplaceItems } from '@/lib/api/marketplace';
import HeroSection from '@/app/components/feature/marketplace/HeroSection';
import BetaBanner from '@/app/components/feature/marketing/BetaBanner';
import FeaturedAIAgentsSection from '@/app/components/feature/ai-agents/FeaturedAIAgentsSection';
import MarketplaceGrid from '@/app/components/feature/marketplace/MarketplaceGrid';
import AdvancedFilters from '@/app/components/feature/marketplace/AdvancedFilters';
import type { SearchFilters } from '@/lib/services/savedSearches';
import styles from './page.module.css';

export default function HomePage() {
  const [hasSearched, setHasSearched] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>({});
  const [searchFilters, setSearchFilters] = useState<SearchFilters & { query?: string }>({});
  const [interpretedQuery, setInterpretedQuery] = useState<string>('');

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
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
    retry: 2, // Retry failed requests twice
    enabled: !hasSearched,
  });

  // React Query: Fetch search results (shown when searching)
  const {
    data: searchData,
    isLoading: isSearchLoading,
  } = useQuery({
    queryKey: ['marketplace-search', searchFilters],
    queryFn: () => {
      // Map marketplace_type to entity_type for API
      const apiFilters = { ...searchFilters };
      if (searchFilters.marketplace_type) {
        // Map: 'tutors' → 'humans', 'ai-agents' → 'ai-agents', 'all' → 'all'
        let entityType: 'humans' | 'ai-agents' | 'all' = 'all';
        if (searchFilters.marketplace_type === 'tutors') {
          entityType = 'humans';
        } else if (searchFilters.marketplace_type === 'ai-agents') {
          entityType = 'ai-agents';
        } else if (searchFilters.marketplace_type === 'organisations') {
          entityType = 'humans'; // Organisations are part of humans search
        } else {
          entityType = 'all';
        }
        apiFilters.entity_type = entityType;
      }
      return searchMarketplace(apiFilters);
    },
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (standardized)
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
    retry: 2, // Retry failed requests twice
    enabled: hasSearched && Object.keys(searchFilters).length > 0,
  });

  // Combine data based on search state
  let allItems = hasSearched && searchData
    ? toMarketplaceItems(searchData.profiles || [], searchData.listings, searchData.organisations || [], searchData.aiTutors || [])
    : featuredData
    ? toMarketplaceItems(featuredData.profiles, featuredData.listings, featuredData.organisations || [], featuredData.aiTutors || [])
    : [];

  // Filter by marketplace type (tutors/organisations/ai-agents/all)
  const marketplaceType = searchFilters.marketplace_type || 'all';
  const items = allItems.filter(item => {
    if (marketplaceType === 'all') return true;
    if (marketplaceType === 'tutors') return item.type === 'profile' || item.type === 'listing';
    if (marketplaceType === 'organisations') return item.type === 'organisation';
    if (marketplaceType === 'ai-agents') return item.type === 'ai_tutor';
    return true;
  });

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

      // Convert parsed query to filters (includes raw query for hybrid search)
      const filters = queryToFilters(parsed, query);
      setSearchFilters(filters);
      setAdvancedFilters(filters);
      setInterpretedQuery(parsed.interpretedQuery || query);
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
    setInterpretedQuery('');
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
        interpretedQuery={interpretedQuery}
      />

      {/* Beta Launch Announcement Banner */}
      <BetaBanner />

      {/* Featured AI Tutors - Phase 2A */}
      {!hasSearched && <FeaturedAIAgentsSection />}

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
