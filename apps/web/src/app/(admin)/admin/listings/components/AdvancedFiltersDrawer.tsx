/**
 * Filename: AdvancedFiltersDrawer.tsx
 * Purpose: Right-side drawer for advanced listing filters
 * Created: 2025-12-27
 * Pattern: Matches bookings AdvancedFilters drawer pattern
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '@/app/components/ui/actions/Button';
import styles from './AdvancedFiltersDrawer.module.css';

export interface AdvancedFilters {
  minViews?: number;
  maxViews?: number;
  minBookings?: number;
  maxBookings?: number;
  minRating?: number;
  maxRating?: number;
  minPrice?: number;
  maxPrice?: number;
  isFeatured: boolean;
  hasVideo: boolean;
  hasGallery: boolean;
  createdAfter: string;
  createdBefore: string;
}

interface AdvancedFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilters;
  onApply: (filters: AdvancedFilters) => void;
  onReset: () => void;
}

export default function AdvancedFiltersDrawer({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
}: AdvancedFiltersDrawerProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

  // Update local filters when parent filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    onReset();
  };

  if (!isOpen) return null;

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
          {/* Engagement Metrics */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Engagement Metrics</h3>

            {/* Views Range */}
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>View Count</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  value={localFilters.minViews || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      minViews: Number(e.target.value) || undefined,
                    })
                  }
                  className={styles.filterInput}
                />
                <span className={styles.rangeSeparator}>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  value={localFilters.maxViews || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      maxViews: Number(e.target.value) || undefined,
                    })
                  }
                  className={styles.filterInput}
                />
              </div>
            </div>

            {/* Bookings Range */}
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>Booking Count</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  value={localFilters.minBookings || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      minBookings: Number(e.target.value) || undefined,
                    })
                  }
                  className={styles.filterInput}
                />
                <span className={styles.rangeSeparator}>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  value={localFilters.maxBookings || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      maxBookings: Number(e.target.value) || undefined,
                    })
                  }
                  className={styles.filterInput}
                />
              </div>
            </div>

            {/* Rating Range */}
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>Rating</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  placeholder="Min (0-5)"
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
                  step="0.1"
                  min="0"
                  max="5"
                  placeholder="Max (0-5)"
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
          </div>

          {/* Pricing */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Pricing</h3>

            {/* Price Range */}
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>Hourly Rate (£)</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  value={localFilters.minPrice || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      minPrice: Number(e.target.value) || undefined,
                    })
                  }
                  className={styles.filterInput}
                />
                <span className={styles.rangeSeparator}>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  value={localFilters.maxPrice || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      maxPrice: Number(e.target.value) || undefined,
                    })
                  }
                  className={styles.filterInput}
                />
              </div>
            </div>
          </div>

          {/* Features */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Features</h3>

            {/* Boolean Filters */}
            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="isFeatured"
                checked={localFilters.isFeatured}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, isFeatured: e.target.checked })
                }
                className={styles.checkbox}
              />
              <label htmlFor="isFeatured" className={styles.checkboxLabel}>
                Featured listings only
              </label>
            </div>

            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="hasVideo"
                checked={localFilters.hasVideo}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, hasVideo: e.target.checked })
                }
                className={styles.checkbox}
              />
              <label htmlFor="hasVideo" className={styles.checkboxLabel}>
                Has video
              </label>
            </div>

            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="hasGallery"
                checked={localFilters.hasGallery}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, hasGallery: e.target.checked })
                }
                className={styles.checkbox}
              />
              <label htmlFor="hasGallery" className={styles.checkboxLabel}>
                Has gallery images
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Date Range</h3>

            {/* Created After */}
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>Created After</label>
              <input
                type="date"
                value={localFilters.createdAfter}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, createdAfter: e.target.value })
                }
                className={styles.filterInput}
              />
            </div>

            {/* Created Before */}
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>Created Before</label>
              <input
                type="date"
                value={localFilters.createdBefore}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, createdBefore: e.target.value })
                }
                className={styles.filterInput}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleReset} fullWidth>
            Reset Filters
          </Button>
          <Button variant="primary" onClick={handleApply} fullWidth>
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
