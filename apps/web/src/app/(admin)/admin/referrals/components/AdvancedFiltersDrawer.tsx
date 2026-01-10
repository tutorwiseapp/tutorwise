/**
 * Filename: AdvancedFiltersDrawer.tsx
 * Purpose: Advanced filters drawer for admin referrals table
 * Created: 2025-12-27
 * Pattern: Follows BookingsTable AdvancedFiltersDrawer structure
 */

'use client';

import React from 'react';
import { X } from 'lucide-react';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import styles from './AdvancedFiltersDrawer.module.css';

export interface AdvancedFilters {
  minDaysActive?: number;
  maxDaysActive?: number;
  attributionMethod?: string;
  hasCommission?: boolean;
  convertedOnly?: boolean;
}

interface AdvancedFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
}

export default function AdvancedFiltersDrawer({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
}: AdvancedFiltersDrawerProps) {
  if (!isOpen) return null;

  const handleReset = () => {
    onFiltersChange({
      minDaysActive: undefined,
      maxDaysActive: undefined,
      attributionMethod: '',
      hasCommission: false,
      convertedOnly: false,
    });
  };

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={onClose} />

      {/* Drawer */}
      <div className={styles.drawer}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>Advanced Filters</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className={styles.content}>
          {/* Days Active Range */}
          <div className={styles.filterSection}>
            <h4 className={styles.sectionTitle}>Days Active</h4>
            <div className={styles.rangeInputs}>
              <div className={styles.rangeInput}>
                <label>Min Days</label>
                <input
                  type="number"
                  min="0"
                  value={filters.minDaysActive || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      minDaysActive: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div className={styles.rangeInput}>
                <label>Max Days</label>
                <input
                  type="number"
                  min="0"
                  value={filters.maxDaysActive || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      maxDaysActive: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="365"
                />
              </div>
            </div>
          </div>

          {/* Attribution Method */}
          <div className={styles.filterSection}>
            <h4 className={styles.sectionTitle}>Attribution Method</h4>
            <UnifiedSelect
              value={filters.attributionMethod || ''}
              onChange={(value) =>
                onFiltersChange({
                  ...filters,
                  attributionMethod: String(value),
                })
              }
              options={[
                { value: '', label: 'All Methods' },
                { value: 'url_parameter', label: 'URL Parameter' },
                { value: 'cookie', label: 'Cookie' },
                { value: 'manual_entry', label: 'Manual Entry' }
              ]}
              placeholder="All Methods"
            />
          </div>

          {/* Checkboxes */}
          <div className={styles.filterSection}>
            <h4 className={styles.sectionTitle}>Options</h4>
            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="hasCommission"
                checked={filters.hasCommission || false}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    hasCommission: e.target.checked,
                  })
                }
              />
              <label htmlFor="hasCommission">Has Commission</label>
            </div>
            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="convertedOnly"
                checked={filters.convertedOnly || false}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    convertedOnly: e.target.checked,
                  })
                }
              />
              <label htmlFor="convertedOnly">Converted Only</label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button onClick={handleReset} className={styles.resetButton}>
            Reset Filters
          </button>
          <button onClick={onClose} className={styles.applyButton}>
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
