/**
 * Filename: apps/web/src/app/components/help-centre/widgets/SearchWidget.tsx
 * Purpose: Search widget for Help Centre articles
 * Created: 2025-01-19
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './widgets.module.css';

interface SearchWidgetProps {
  placeholder?: string;
  variant?: 'sidebar' | 'hero';
}

export default function SearchWidget({
  placeholder = 'Search help articles...',
  variant = 'sidebar',
}: SearchWidgetProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        // Navigate to search results page with query parameter
        router.push(`/help-centre?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  return (
    <form
      onSubmit={handleSearch}
      className={variant === 'hero' ? styles.searchHero : styles.searchSidebar}
    >
      <div className={styles.searchInputWrapper}>
        <svg
          className={styles.searchIcon}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11.5 11.5L15 15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
