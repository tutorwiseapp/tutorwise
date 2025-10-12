'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export default function HeroSection({ onSearch, isSearching }: HeroSectionProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isSearching) {
      onSearch(query.trim());
    }
  };

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
    onSearch(exampleQuery);
  };

  const exampleQueries = [
    'Find a GCSE maths tutor in London',
    'Chemistry tutor for A-Level online',
    'Spanish teacher available weekends',
    'Piano lessons for beginners near me',
  ];

  return (
    <div className={styles.heroSection}>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>Find Your Perfect Tutor or Learning Experience</h1>
        <p className={styles.heroSubtitle}>
          Use AI to plan, book, or refer your next lesson
        </p>

        {/* AI Chat Bar */}
        <form onSubmit={handleSubmit} className={styles.searchForm}>
          <div className={styles.searchBarContainer}>
            <svg
              className={styles.searchIcon}
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z"
                stroke="currentColor"
                strokeWidth="1.67"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me anything — e.g., 'Find a GCSE maths tutor in London next week.'"
              className={styles.searchInput}
              disabled={isSearching}
            />

            <button
              type="submit"
              disabled={!query.trim() || isSearching}
              className={styles.searchButton}
            >
              {isSearching ? (
                <div className={styles.buttonSpinner}></div>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2.5 10H17.5M17.5 10L11.875 4.375M17.5 10L11.875 15.625"
                    stroke="currentColor"
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* Example Queries */}
        <div className={styles.examplesContainer}>
          <p className={styles.examplesLabel}>Try:</p>
          <div className={styles.exampleChips}>
            {exampleQueries.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className={styles.exampleChip}
                disabled={isSearching}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
