/**
 * Filename: src/hooks/useTableState.ts
 * Purpose: Reusable hook for managing table state (search, filters, pagination, sorting)
 * Created: 2025-12-30
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { ADMIN_TABLE_DEFAULTS, ADMIN_SEARCH_DEFAULTS } from '@/constants/admin';

export interface TableStateOptions {
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
  searchDebounceMs?: number;
}

export interface TableFilters {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface TableState {
  // Search
  searchQuery: string;
  debouncedSearchQuery: string;
  setSearchQuery: (query: string) => void;

  // Filters
  filters: TableFilters;
  setFilter: (key: string, value: string | number | boolean | string[] | undefined) => void;
  setFilters: (filters: TableFilters) => void;
  clearFilters: () => void;

  // Pagination
  currentPage: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetPagination: () => void;

  // Sorting
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  setSorting: (field: string, order: 'asc' | 'desc') => void;
  toggleSortOrder: () => void;

  // Utility
  resetAll: () => void;
  hasActiveFilters: boolean;
}

/**
 * Custom hook for managing table state
 */
export function useTableState(options: TableStateOptions = {}): TableState {
  const {
    initialPageSize = ADMIN_TABLE_DEFAULTS.PAGE_SIZE,
    initialSortBy = 'created_at',
    initialSortOrder = 'desc',
    searchDebounceMs = ADMIN_SEARCH_DEFAULTS.DEBOUNCE_MS,
  } = options;

  // Search state
  const [searchQuery, setSearchQueryState] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Filters state
  const [filters, setFiltersState] = useState<TableFilters>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Sorting state
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);

  // Debounce search query
  const setSearchQuery = useCallback(
    (query: string) => {
      setSearchQueryState(query);

      // Reset to page 1 when searching
      setCurrentPage(1);

      // Debounce the search query
      const timeout = setTimeout(() => {
        setDebouncedSearchQuery(query);
      }, searchDebounceMs);

      return () => clearTimeout(timeout);
    },
    [searchDebounceMs]
  );

  // Set individual filter
  const setFilter = useCallback(
    (key: string, value: string | number | boolean | string[] | undefined) => {
      setFiltersState((prev) => ({
        ...prev,
        [key]: value,
      }));

      // Reset to page 1 when filtering
      setCurrentPage(1);
    },
    []
  );

  // Set multiple filters
  const setFilters = useCallback((newFilters: TableFilters) => {
    setFiltersState(newFilters);

    // Reset to page 1 when filtering
    setCurrentPage(1);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState({});
    setCurrentPage(1);
  }, []);

  // Reset pagination
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Set sorting
  const setSorting = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);

    // Reset to page 1 when sorting changes
    setCurrentPage(1);
  }, []);

  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));

    // Reset to page 1 when sorting changes
    setCurrentPage(1);
  }, []);

  // Reset all state
  const resetAll = useCallback(() => {
    setSearchQueryState('');
    setDebouncedSearchQuery('');
    setFiltersState({});
    setCurrentPage(1);
    setPageSize(initialPageSize);
    setSortBy(initialSortBy);
    setSortOrder(initialSortOrder);
  }, [initialPageSize, initialSortBy, initialSortOrder]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      debouncedSearchQuery.length > 0 ||
      Object.values(filters).some((value) => {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'string') return value !== '' && value !== 'all';
        if (typeof value === 'boolean') return true;
        if (typeof value === 'number') return true;
        return false;
      })
    );
  }, [debouncedSearchQuery, filters]);

  return {
    // Search
    searchQuery,
    debouncedSearchQuery,
    setSearchQuery,

    // Filters
    filters,
    setFilter,
    setFilters,
    clearFilters,

    // Pagination
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    resetPagination,

    // Sorting
    sortBy,
    sortOrder,
    setSorting,
    toggleSortOrder,

    // Utility
    resetAll,
    hasActiveFilters,
  };
}

/**
 * Helper function to build query params from table state
 */
export function buildTableQueryParams(state: TableState): Record<string, any> {
  const params: Record<string, any> = {
    page: state.currentPage,
    limit: state.pageSize,
    sort_by: state.sortBy,
    sort_order: state.sortOrder,
  };

  // Add search query if present
  if (state.debouncedSearchQuery) {
    params.search = state.debouncedSearchQuery;
  }

  // Add filters (exclude empty values)
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return;
    }

    if (Array.isArray(value) && value.length === 0) {
      return;
    }

    params[key] = value;
  });

  return params;
}

/**
 * Helper function to calculate pagination info
 */
export function calculatePaginationInfo(
  currentPage: number,
  pageSize: number,
  totalCount: number
): {
  totalPages: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  return {
    totalPages,
    startIndex,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}
