/**
 * Filename: AdvancedFiltersDrawer.tsx
 * Purpose: Advanced filters drawer for organisations table
 * Created: 2025-12-28
 * Pattern: Follows ListingsTable/ReferralsTable AdvancedFiltersDrawer structure
 */

'use client';

import React from 'react';
import { X } from 'lucide-react';
import Button from '@/app/components/ui/actions/Button';
import styles from './AdvancedFiltersDrawer.module.css';

export interface AdvancedFilters {
  minMembers?: number;
  maxMembers?: number;
  hasWebsite: boolean;
  hasContact: boolean;
  createdAfter: string;
  createdBefore: string;
}

interface AdvancedFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

export default function AdvancedFiltersDrawer({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  onReset,
}: AdvancedFiltersDrawerProps) {
  if (!isOpen) return null;

  const handleReset = () => {
    onFiltersChange({
      hasWebsite: false,
      hasContact: false,
      createdAfter: '',
      createdBefore: '',
    });
    onReset();
  };

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Drawer */}
      <div className={styles.drawer}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Advanced Filters</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Member Count Range */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Member Count</h3>
            <div className={styles.rangeInputs}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Min Members</label>
                <input
                  type="number"
                  min="0"
                  className={styles.input}
                  value={filters.minMembers || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      minMembers: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g. 1"
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Max Members</label>
                <input
                  type="number"
                  min="0"
                  className={styles.input}
                  value={filters.maxMembers || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      maxMembers: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g. 100"
                />
              </div>
            </div>
          </div>

          {/* Content Filters */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Content Filters</h3>
            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="hasWebsite"
                className={styles.checkbox}
                checked={filters.hasWebsite}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    hasWebsite: e.target.checked,
                  })
                }
              />
              <label htmlFor="hasWebsite" className={styles.checkboxLabel}>
                Has Website
              </label>
            </div>
            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="hasContact"
                className={styles.checkbox}
                checked={filters.hasContact}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    hasContact: e.target.checked,
                  })
                }
              />
              <label htmlFor="hasContact" className={styles.checkboxLabel}>
                Has Contact Email
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Creation Date</h3>
            <div className={styles.dateInputs}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Created After</label>
                <input
                  type="date"
                  className={styles.input}
                  value={filters.createdAfter}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      createdAfter: e.target.value,
                    })
                  }
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Created Before</label>
                <input
                  type="date"
                  className={styles.input}
                  value={filters.createdBefore}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      createdBefore: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleReset}>
            Reset Filters
          </Button>
          <Button variant="primary" onClick={onApply}>
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  );
}
