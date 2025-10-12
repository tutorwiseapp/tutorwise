'use client';

import { useState } from 'react';
import styles from './FilterChips.module.css';

export interface FilterState {
  subjects: string[];
  levels: string[];
  locationType: string | null;
  priceRange: { min: number | null; max: number | null };
  freeTrialOnly: boolean;
}

interface FilterChipsProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const SUBJECTS = [
  'Mathematics',
  'English',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Geography',
  'Languages',
  'Music',
  'Art',
];

const LEVELS = [
  'Primary',
  'KS3',
  'GCSE',
  'A-Level',
  'University',
  'Adult Learning',
];

const LOCATION_TYPES = [
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'In Person' },
  { value: 'hybrid', label: 'Hybrid' },
];

export default function FilterChips({ filters, onFilterChange }: FilterChipsProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSubject = (subject: string) => {
    const newSubjects = filters.subjects.includes(subject)
      ? filters.subjects.filter(s => s !== subject)
      : [...filters.subjects, subject];
    onFilterChange({ ...filters, subjects: newSubjects });
  };

  const toggleLevel = (level: string) => {
    const newLevels = filters.levels.includes(level)
      ? filters.levels.filter(l => l !== level)
      : [...filters.levels, level];
    onFilterChange({ ...filters, levels: newLevels });
  };

  const setLocationType = (type: string | null) => {
    onFilterChange({ ...filters, locationType: type });
  };

  const toggleFreeTrial = () => {
    onFilterChange({ ...filters, freeTrialOnly: !filters.freeTrialOnly });
  };

  const clearFilters = () => {
    onFilterChange({
      subjects: [],
      levels: [],
      locationType: null,
      priceRange: { min: null, max: null },
      freeTrialOnly: false,
    });
  };

  const hasActiveFilters =
    filters.subjects.length > 0 ||
    filters.levels.length > 0 ||
    filters.locationType !== null ||
    filters.freeTrialOnly;

  return (
    <div className={styles.filterChips}>
      <div className={styles.filterRow}>
        {/* Subject Filter */}
        <div className={styles.filterGroup}>
          <button
            className={`${styles.filterButton} ${filters.subjects.length > 0 ? styles.active : ''}`}
            onClick={() => setExpandedSection(expandedSection === 'subjects' ? null : 'subjects')}
          >
            Subject
            {filters.subjects.length > 0 && (
              <span className={styles.filterCount}>{filters.subjects.length}</span>
            )}
          </button>

          {expandedSection === 'subjects' && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownContent}>
                {SUBJECTS.map(subject => (
                  <label key={subject} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={filters.subjects.includes(subject)}
                      onChange={() => toggleSubject(subject)}
                      className={styles.checkbox}
                    />
                    <span>{subject}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Level Filter */}
        <div className={styles.filterGroup}>
          <button
            className={`${styles.filterButton} ${filters.levels.length > 0 ? styles.active : ''}`}
            onClick={() => setExpandedSection(expandedSection === 'levels' ? null : 'levels')}
          >
            Level
            {filters.levels.length > 0 && (
              <span className={styles.filterCount}>{filters.levels.length}</span>
            )}
          </button>

          {expandedSection === 'levels' && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownContent}>
                {LEVELS.map(level => (
                  <label key={level} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={filters.levels.includes(level)}
                      onChange={() => toggleLevel(level)}
                      className={styles.checkbox}
                    />
                    <span>{level}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Location Type Filter */}
        <div className={styles.filterGroup}>
          <button
            className={`${styles.filterButton} ${filters.locationType ? styles.active : ''}`}
            onClick={() => setExpandedSection(expandedSection === 'location' ? null : 'location')}
          >
            Location
          </button>

          {expandedSection === 'location' && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownContent}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="radio"
                    checked={filters.locationType === null}
                    onChange={() => setLocationType(null)}
                    className={styles.checkbox}
                  />
                  <span>All</span>
                </label>
                {LOCATION_TYPES.map(type => (
                  <label key={type.value} className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      checked={filters.locationType === type.value}
                      onChange={() => setLocationType(type.value)}
                      className={styles.checkbox}
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Free Trial Toggle */}
        <button
          className={`${styles.filterButton} ${filters.freeTrialOnly ? styles.active : ''}`}
          onClick={toggleFreeTrial}
        >
          Free Trial
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button className={styles.clearButton} onClick={clearFilters}>
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
