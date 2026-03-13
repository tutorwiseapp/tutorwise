'use client';

import { useState, useRef } from 'react';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  onReset?: () => void;
  hasActiveSearch?: boolean;
  interpretedQuery?: string;
}

export default function HeroSection({ onSearch, isSearching, onOpenFilters, activeFilterCount, onReset, hasActiveSearch, interpretedQuery }: HeroSectionProps) {
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isSearching) {
      onSearch(query.trim());
      setQuery(''); // Clear after sending
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleClear = () => {
    setQuery('');
    if (onReset) {
      onReset();
    }
    textareaRef.current?.focus();
  };

  const handleFilterButtonClick = () => {
    // If there's an active search or filters, reset instead of opening filters
    if (hasActiveSearch || (activeFilterCount && activeFilterCount > 0)) {
      if (onReset) {
        onReset();
      }
    } else if (onOpenFilters) {
      onOpenFilters();
    }
  };

  return (
    <div className={styles.heroSection}>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>
          Find your perfect match with AI
        </h1>
        <p className={styles.heroSubtitle}>
          Tell us what you&apos;re looking for and let AI help you find the best match
        </p>

        {/* ChatGPT-style Chat Bar */}
        <form onSubmit={handleSubmit} className={styles.chatForm}>
          <div className={styles.chatInputContainer}>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., 'I need a GCSE maths tutor in London for weekday evenings'"
              className={styles.chatInput}
              disabled={isSearching}
              rows={1}
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className={styles.clearButton}
                aria-label="Clear search"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            <div className={styles.buttonGroup}>
              <button
                type="submit"
                disabled={!query.trim() || isSearching}
                className={styles.sendButton}
                aria-label="Send"
              >
                {isSearching ? (
                  <div className={styles.buttonSpinner}></div>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7 11L12 6L17 11M12 18V7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              {onOpenFilters && (
                <button
                  type="button"
                  onClick={handleFilterButtonClick}
                  className={`${styles.filterButton} ${hasActiveSearch || (activeFilterCount && activeFilterCount > 0) ? styles.filterButtonActive : ''}`}
                  aria-label={hasActiveSearch || (activeFilterCount && activeFilterCount > 0) ? "Reset search" : "Open filters"}
                  title={hasActiveSearch || (activeFilterCount && activeFilterCount > 0) ? "Reset search" : "Open filters"}
                >
                  {hasActiveSearch || (activeFilterCount && activeFilterCount > 0) ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M18 6L6 18M6 6l12 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 7h16M7 12h10M10 17h4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {activeFilterCount !== undefined && activeFilterCount > 0 && (
                    <span className={styles.filterButtonBadge}>{activeFilterCount}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Interpreted query feedback */}
        {hasActiveSearch && interpretedQuery && (
          <div className={styles.interpretedQuery}>
            Showing: {interpretedQuery}
          </div>
        )}

        {/* Example queries */}
        <div className={styles.exampleQueries}>
          <button
            className={styles.exampleChip}
            onClick={() => onSearch('GCSE maths tutor in London')}
            disabled={isSearching}
          >
            GCSE maths tutor in London
          </button>
          <button
            className={styles.exampleChip}
            onClick={() => onSearch('Online A-Level chemistry tutor')}
            disabled={isSearching}
          >
            Online A-Level chemistry tutor
          </button>
          <button
            className={styles.exampleChip}
            onClick={() => onSearch('Piano teacher for beginners')}
            disabled={isSearching}
          >
            Piano teacher for beginners
          </button>
        </div>
      </div>
    </div>
  );
}
