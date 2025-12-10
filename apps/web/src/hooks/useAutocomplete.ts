/**
 * Filename: apps/web/src/hooks/useAutocomplete.ts
 * Purpose: React hook for marketplace autocomplete with debouncing and caching
 * Created: 2025-12-10
 * Phase: Marketplace Phase 1 - Task 2
 *
 * Features:
 * - Automatic debouncing (300ms default)
 * - Request caching to reduce API calls
 * - Loading states
 * - Error handling
 * - Customizable suggestion types
 *
 * Usage:
 * ```tsx
 * const { suggestions, loading, error, search } = useAutocomplete({
 *   types: ['subject', 'location', 'tutor'],
 *   debounceMs: 300,
 * });
 *
 * <input onChange={(e) => search(e.target.value)} />
 * {suggestions.map(s => <div key={s.value}>{s.display}</div>)}
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AutocompleteSuggestion {
  type: 'subject' | 'level' | 'location' | 'tutor' | 'listing' | 'semantic';
  value: string;
  display: string;
  icon?: string;
  metadata?: any;
}

export interface AutocompleteResponse {
  query: string;
  suggestions: AutocompleteSuggestion[];
  total: number;
}

export interface UseAutocompleteOptions {
  /**
   * Types of suggestions to fetch
   * @default ['subject', 'location', 'tutor', 'listing']
   */
  types?: Array<'subject' | 'level' | 'location' | 'tutor' | 'listing' | 'semantic'>;

  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounceMs?: number;

  /**
   * Maximum number of suggestions
   * @default 10
   */
  limit?: number;

  /**
   * Enable semantic search
   * @default false
   */
  semantic?: boolean;

  /**
   * Minimum query length to trigger search
   * @default 2
   */
  minLength?: number;

  /**
   * Callback when suggestion is selected
   */
  onSelect?: (suggestion: AutocompleteSuggestion) => void;
}

export function useAutocomplete(options: UseAutocompleteOptions = {}) {
  const {
    types = ['subject', 'location', 'tutor', 'listing'],
    debounceMs = 300,
    limit = 10,
    semantic = false,
    minLength = 2,
    onSelect,
  } = options;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache for storing recent results
  const cacheRef = useRef<Map<string, AutocompleteResponse>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch suggestions from API
   */
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    // Check cache first
    const cacheKey = `${searchQuery}:${types.join(',')}:${limit}:${semantic}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setSuggestions(cached.suggestions);
      setLoading(false);
      return;
    }

    // Abort previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        q: searchQuery,
        types: types.join(','),
        limit: limit.toString(),
        semantic: semantic.toString(),
      });

      const response = await fetch(`/api/marketplace/autocomplete?${params}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data: AutocompleteResponse = await response.json();

      // Cache the result
      cacheRef.current.set(cacheKey, data);

      // Limit cache size to 50 entries
      if (cacheRef.current.size > 50) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) {
          cacheRef.current.delete(firstKey);
        }
      }

      setSuggestions(data.suggestions);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          // Request was aborted, ignore
          return;
        }
        setError(err.message);
      }
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [types, limit, semantic]);

  /**
   * Search with debouncing
   */
  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Clear suggestions if query is too short
    if (searchQuery.length < minLength) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    // Set debounce timer
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, debounceMs);
  }, [debounceMs, minLength, fetchSuggestions]);

  /**
   * Clear suggestions
   */
  const clear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setError(null);
    setLoading(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Select a suggestion
   */
  const selectSuggestion = useCallback((suggestion: AutocompleteSuggestion) => {
    if (onSelect) {
      onSelect(suggestion);
    }
    clear();
  }, [onSelect, clear]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    suggestions,
    loading,
    error,
    search,
    clear,
    selectSuggestion,
  };
}
