/**
 * Filename: apps/web/src/app/components/ui/Autocomplete.tsx
 * Purpose: Reusable autocomplete component with keyboard navigation
 * Created: 2025-12-10
 * Phase: Marketplace Phase 1 - Task 2
 *
 * Features:
 * - Keyboard navigation (↑↓ arrows, Enter, Escape)
 * - Click outside to close
 * - Loading spinner
 * - Error states
 * - Accessible (ARIA attributes)
 * - Icon support
 * - Customizable styling
 */

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useAutocomplete, AutocompleteSuggestion, UseAutocompleteOptions } from '@/hooks/useAutocomplete';
import styles from './Autocomplete.module.css';

interface AutocompleteProps extends UseAutocompleteOptions {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (query: string) => void;
}

export default function Autocomplete({
  placeholder = 'Search...',
  className = '',
  inputClassName = '',
  dropdownClassName = '',
  value: controlledValue,
  onChange: onControlledChange,
  onSubmit,
  onSelect,
  ...autocompleteOptions
}: AutocompleteProps) {
  const { query, suggestions, loading, error, search, clear, selectSuggestion } = useAutocomplete({
    ...autocompleteOptions,
    onSelect: (suggestion) => {
      if (onSelect) {
        onSelect(suggestion);
      }
      if (onControlledChange) {
        onControlledChange(suggestion.display);
      }
      setShowDropdown(false);
    },
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Controlled input support
  const inputValue = controlledValue !== undefined ? controlledValue : query;

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    search(value);
    setShowDropdown(true);
    setSelectedIndex(-1);

    if (onControlledChange) {
      onControlledChange(value);
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter' && onSubmit) {
        e.preventDefault();
        onSubmit(inputValue);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex]);
        } else if (onSubmit) {
          onSubmit(inputValue);
        }
        setShowDropdown(false);
        break;

      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;

      default:
        break;
    }
  };

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = (suggestion: AutocompleteSuggestion) => {
    selectSuggestion(suggestion);
  };

  /**
   * Handle input focus
   */
  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowDropdown(true);
    }
  };

  /**
   * Click outside to close
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Show dropdown when suggestions change
   */
  useEffect(() => {
    if (suggestions.length > 0 && document.activeElement === inputRef.current) {
      setShowDropdown(true);
    }
  }, [suggestions]);

  /**
   * Scroll selected item into view
   */
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className={`${styles.autocompleteContainer} ${className}`}>
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={`${styles.input} ${inputClassName}`}
          aria-label="Search"
          aria-autocomplete="list"
          aria-controls="autocomplete-dropdown"
          aria-expanded={showDropdown}
          aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
        />
        {loading && (
          <div className={styles.spinner} aria-label="Loading">
            <div className={styles.spinnerIcon}></div>
          </div>
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          id="autocomplete-dropdown"
          className={`${styles.dropdown} ${dropdownClassName}`}
          role="listbox"
        >
          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          {!loading && !error && suggestions.length === 0 && inputValue.length >= 2 && (
            <div className={styles.noResults}>
              No suggestions found
            </div>
          )}

          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}:${suggestion.value}`}
              id={`suggestion-${index}`}
              className={`${styles.suggestion} ${index === selectedIndex ? styles.selected : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              {suggestion.icon && (
                <span className={styles.icon} aria-hidden="true">
                  {suggestion.icon}
                </span>
              )}
              <div className={styles.suggestionContent}>
                <div className={styles.suggestionDisplay}>{suggestion.display}</div>
                <div className={styles.suggestionType}>{suggestion.type}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
