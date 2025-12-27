/**
 * Filename: AdvancedFiltersDrawer.tsx
 * Purpose: Right-side drawer for advanced review filters with 9 filter types
 * Created: 2025-12-27
 * Pattern: Mirrors listings AdvancedFiltersDrawer with review-specific adaptations
 */

'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './AdvancedFiltersDrawer.module.css';

export interface AdvancedFilters {
  minRating?: number;
  maxRating?: number;
  minHelpful?: number;
  maxHelpful?: number;
  subjects?: string[];
  locationType?: string;
  hasComment?: boolean;
  hasResponse?: boolean;
  verifiedOnly?: boolean;
  reviewedAfter?: string;
  reviewedBefore?: string;
}

interface AdvancedFiltersDrawerProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  onClose: () => void;
}

export function AdvancedFiltersDrawer({
  filters,
  onFiltersChange,
  onClose,
}: AdvancedFiltersDrawerProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

  // Update local filters when parent filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: AdvancedFilters = {
      minRating: undefined,
      maxRating: undefined,
      minHelpful: undefined,
      maxHelpful: undefined,
      subjects: undefined,
      locationType: undefined,
      hasComment: false,
      hasResponse: false,
      verifiedOnly: false,
      reviewedAfter: '',
      reviewedBefore: '',
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  // Common subjects (you may want to fetch these dynamically)
  const commonSubjects = [
    'Mathematics',
    'English',
    'Science',
    'Physics',
    'Chemistry',
    'Biology',
    'History',
    'Geography',
    'Computer Science',
    'Languages',
    'Music',
    'Art',
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Advanced Filters</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close filters">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Rating & Engagement Section */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Rating & Engagement</h3>

            {/* 1. Rating Range (1-5) */}
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>Rating</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="5"
                  placeholder="Min (1-5)"
                  value={localFilters.minRating || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      minRating: Number(e.target.value) || undefined,
                    })
                  }
                  className={styles.filterInput}
                />
                <span className={styles.rangeSeparator}>to</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="5"
                  placeholder="Max (1-5)"
                  value={localFilters.maxRating || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      maxRating: Number(e.target.value) || undefined,
                    })
                  }
                  className={styles.filterInput}
                />
              </div>
            </div>

            {/* 2. Helpful Votes Range */}
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>Helpful Votes</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  value={localFilters.minHelpful || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      minHelpful: Number(e.target.value) || undefined,
                    })
                  }
                  className={styles.filterInput}
                />
                <span className={styles.rangeSeparator}>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  value={localFilters.maxHelpful || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      maxHelpful: Number(e.target.value) || undefined,
                    })
                  }
                  className={styles.filterInput}
                />
              </div>
            </div>
          </div>

          {/* Service Context Section */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Service Context</h3>

            {/* 3. Subjects (Multi-select) */}
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>Subjects</label>
              <div className={styles.multiSelect}>
                {commonSubjects.map((subject) => (
                  <div key={subject} className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      id={`subject-${subject}`}
                      checked={localFilters.subjects?.includes(subject) || false}
                      onChange={(e) => {
                        const currentSubjects = localFilters.subjects || [];
                        if (e.target.checked) {
                          setLocalFilters({
                            ...localFilters,
                            subjects: [...currentSubjects, subject],
                          });
                        } else {
                          setLocalFilters({
                            ...localFilters,
                            subjects: currentSubjects.filter((s) => s !== subject),
                          });
                        }
                      }}
                      className={styles.checkbox}
                    />
                    <label htmlFor={`subject-${subject}`} className={styles.checkboxLabel}>
                      {subject}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Service Type (Location Type) */}
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>Service Type</label>
              <select
                value={localFilters.locationType || ''}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, locationType: e.target.value || undefined })
                }
                className={styles.filterSelect}
              >
                <option value="">All</option>
                <option value="online">Online</option>
                <option value="in_person">In Person</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Content Filters Section */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Content Filters</h3>

            {/* 5. Has Comment */}
            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="hasComment"
                checked={localFilters.hasComment || false}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, hasComment: e.target.checked })
                }
                className={styles.checkbox}
              />
              <label htmlFor="hasComment" className={styles.checkboxLabel}>
                Has comment text
              </label>
            </div>

            {/* 6. Has Response */}
            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="hasResponse"
                checked={localFilters.hasResponse || false}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, hasResponse: e.target.checked })
                }
                className={styles.checkbox}
              />
              <label htmlFor="hasResponse" className={styles.checkboxLabel}>
                Has tutor response
              </label>
            </div>

            {/* 7. Verified Only */}
            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="verifiedOnly"
                checked={localFilters.verifiedOnly || false}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, verifiedOnly: e.target.checked })
                }
                className={styles.checkbox}
              />
              <label htmlFor="verifiedOnly" className={styles.checkboxLabel}>
                Verified bookings only
              </label>
            </div>
          </div>

          {/* Date Range Section */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Date Range</h3>

            {/* 8. Reviewed After */}
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>Reviewed After</label>
              <input
                type="date"
                value={localFilters.reviewedAfter || ''}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, reviewedAfter: e.target.value })
                }
                className={styles.filterInput}
              />
            </div>

            {/* 9. Reviewed Before */}
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>Reviewed Before</label>
              <input
                type="date"
                value={localFilters.reviewedBefore || ''}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, reviewedBefore: e.target.value })
                }
                className={styles.filterInput}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button onClick={handleReset} className={styles.resetButton}>
            Reset Filters
          </button>
          <button onClick={handleApply} className={styles.applyButton}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
