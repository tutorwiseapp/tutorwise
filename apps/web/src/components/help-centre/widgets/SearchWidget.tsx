/**
 * Filename: apps/web/src/app/components/help-centre/widgets/SearchWidget.tsx
 * Purpose: Search widget for Help Centre articles with analytics tracking
 * Created: 2025-01-19
 * Updated: 2025-12-21 - Removed keyboard shortcuts, optimized for mobile
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trackHelpCentreSearch } from '@/lib/api/help-centre';
import styles from './widgets.module.css';

interface SearchWidgetProps {
  placeholder?: string;
  variant?: 'sidebar' | 'hero';
}

export default function SearchWidget({
  placeholder = 'Search for help articles, guides, and FAQs...',
  variant = 'sidebar',
}: SearchWidgetProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedQuery = query.trim();

      if (trimmedQuery) {
        // Track search query for analytics
        await trackHelpCentreSearch(trimmedQuery);

        // Navigate to search results page with query parameter
        router.push(`/help-centre?q=${encodeURIComponent(trimmedQuery)}`);
      }
    },
    [query, router]
  );

  return (
    <form
      onSubmit={handleSearch}
      className={variant === 'hero' ? styles.searchHero : styles.searchSidebar}
    >
      <div className={`${styles.searchInputWrapper} ${isFocused ? styles.focused : ''}`}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={styles.searchInput}
          aria-label="Search help articles"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className={styles.searchClear}
            aria-label="Clear search"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 3L3 9M3 3L9 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      <button type="submit" className={styles.searchButton}>
        Search
      </button>
    </form>
  );
}
