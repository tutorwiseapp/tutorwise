/**
 * Filename: AdvancedFilters.tsx
 * Purpose: Advanced filtering UI for marketplace search
 * Created: 2025-12-10
 * Phase: Marketplace Phase 3 - Advanced User Interactions
 *
 * Features:
 * - Rich filter controls (price range, availability, ratings)
 * - Save search functionality
 * - Filter presets
 * - Mobile-responsive drawer
 */

'use client';

import React, { useState } from 'react';
import type { SearchFilters } from '@/lib/services/savedSearches';
import styles from './AdvancedFilters.module.css';

interface AdvancedFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSaveSearch?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvancedFilters({
  filters,
  onFiltersChange,
  onSaveSearch,
  isOpen,
  onClose,
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const emptyFilters: SearchFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const handleSubjectToggle = (subject: string) => {
    const subjects = localFilters.subjects || [];
    const newSubjects = subjects.includes(subject)
      ? subjects.filter(s => s !== subject)
      : [...subjects, subject];

    setLocalFilters({ ...localFilters, subjects: newSubjects });
  };

  const handleLevelToggle = (level: string) => {
    const levels = localFilters.levels || [];
    const newLevels = levels.includes(level)
      ? levels.filter(l => l !== level)
      : [...levels, level];

    setLocalFilters({ ...localFilters, levels: newLevels });
  };

  const handleDeliveryModeToggle = (mode: string) => {
    const modes = localFilters.delivery_modes || [];
    const newModes = modes.includes(mode)
      ? modes.filter(m => m !== mode)
      : [...modes, mode];

    setLocalFilters({ ...localFilters, delivery_modes: newModes });
  };

  if (!isOpen) return null;

  const activeFilterCount = Object.keys(localFilters).filter(key => {
    const value = localFilters[key as keyof SearchFilters];
    return value !== undefined && value !== null && (
      typeof value !== 'object' || (Array.isArray(value) && value.length > 0)
    );
  }).length;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Advanced Filters</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {/* Subjects */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Subjects</h3>
            <div className={styles.chipGrid}>
              {['Mathematics', 'English', 'Sciences', 'Languages', 'Computer Science', 'Business', 'Arts', 'Music'].map(subject => (
                <button
                  key={subject}
                  className={`${styles.chip} ${(localFilters.subjects || []).includes(subject) ? styles.active : ''}`}
                  onClick={() => handleSubjectToggle(subject)}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>

          {/* Levels */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Levels</h3>
            <div className={styles.chipGrid}>
              {['Primary', 'Secondary', 'GCSE', 'A-Level', 'University', 'Adult'].map(level => (
                <button
                  key={level}
                  className={`${styles.chip} ${(localFilters.levels || []).includes(level) ? styles.active : ''}`}
                  onClick={() => handleLevelToggle(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Modes */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Teaching Location</h3>
            <div className={styles.chipGrid}>
              {[
                { value: 'online', label: 'Online' },
                { value: 'in_person', label: 'In Person' },
                { value: 'hybrid', label: 'Hybrid' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  className={`${styles.chip} ${(localFilters.delivery_modes || []).includes(value) ? styles.active : ''}`}
                  onClick={() => handleDeliveryModeToggle(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Price Range (£/hour)</h3>
            <div className={styles.priceRange}>
              <input
                type="number"
                className={styles.priceInput}
                placeholder="Min"
                value={localFilters.min_price || ''}
                onChange={(e) => setLocalFilters({
                  ...localFilters,
                  min_price: e.target.value ? parseInt(e.target.value) : undefined
                })}
              />
              <span className={styles.priceSeparator}>-</span>
              <input
                type="number"
                className={styles.priceInput}
                placeholder="Max"
                value={localFilters.max_price || ''}
                onChange={(e) => setLocalFilters({
                  ...localFilters,
                  max_price: e.target.value ? parseInt(e.target.value) : undefined
                })}
              />
            </div>
          </div>

          {/* Listing Type */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Listing Type</h3>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="listing_type"
                  checked={!localFilters.listing_type}
                  onChange={() => setLocalFilters({ ...localFilters, listing_type: undefined })}
                />
                <span>Any</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="listing_type"
                  value="session"
                  checked={localFilters.listing_type === 'session'}
                  onChange={(e) => setLocalFilters({ ...localFilters, listing_type: e.target.value as any })}
                />
                <span>Sessions</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="listing_type"
                  value="course"
                  checked={localFilters.listing_type === 'course'}
                  onChange={(e) => setLocalFilters({ ...localFilters, listing_type: e.target.value as any })}
                />
                <span>Courses</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="listing_type"
                  value="job"
                  checked={localFilters.listing_type === 'job'}
                  onChange={(e) => setLocalFilters({ ...localFilters, listing_type: e.target.value as any })}
                />
                <span>Jobs</span>
              </label>
            </div>
          </div>

          {/* Marketplace Type (Tutors/AI Tutors/Organisations/All) */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Browse</h3>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="marketplace_type"
                  checked={!localFilters.marketplace_type || localFilters.marketplace_type === 'all'}
                  onChange={() => setLocalFilters({ ...localFilters, marketplace_type: 'all' })}
                />
                <span>All</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="marketplace_type"
                  value="tutors"
                  checked={localFilters.marketplace_type === 'tutors'}
                  onChange={(e) => setLocalFilters({ ...localFilters, marketplace_type: e.target.value as any })}
                />
                <span>Human Tutors</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="marketplace_type"
                  value="ai-agents"
                  checked={localFilters.marketplace_type === 'ai-agents'}
                  onChange={(e) => setLocalFilters({ ...localFilters, marketplace_type: e.target.value as any })}
                />
                <span>🤖 AI Tutors</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="marketplace_type"
                  value="organisations"
                  checked={localFilters.marketplace_type === 'organisations'}
                  onChange={(e) => setLocalFilters({ ...localFilters, marketplace_type: e.target.value as any })}
                />
                <span>Organisations</span>
              </label>
            </div>
          </div>

          {/* Min Rating */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Minimum Rating</h3>
            <div className={styles.ratingButtons}>
              {[5, 4, 3].map(rating => (
                <button
                  key={rating}
                  className={`${styles.ratingButton} ${localFilters.min_rating === rating ? styles.active : ''}`}
                  onClick={() => setLocalFilters({
                    ...localFilters,
                    min_rating: localFilters.min_rating === rating ? undefined : rating
                  })}
                >
                  {rating}+ ⭐
                </button>
              ))}
            </div>
          </div>

          {/* Verified Only */}
          <div className={styles.filterSection}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={localFilters.verified_only || false}
                onChange={(e) => setLocalFilters({ ...localFilters, verified_only: e.target.checked })}
              />
              <span>Show verified tutors only</span>
            </label>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <button className={styles.resetButton} onClick={handleReset}>
              Reset All
            </button>
            {activeFilterCount > 0 && (
              <span className={styles.filterCount}>
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </span>
            )}
          </div>
          <div className={styles.footerRight}>
            {onSaveSearch && (
              <button className={styles.saveButton} onClick={onSaveSearch}>
                Save Search
              </button>
            )}
            <button className={styles.applyButton} onClick={handleApply}>
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
