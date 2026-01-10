/**
 * Filename: AdvancedFiltersDrawer.tsx
 * Purpose: Right-side drawer for advanced user filters
 * Created: 2025-12-28
 * Pattern: Matches Bookings AdvancedFilters drawer pattern
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import styles from './AdvancedFiltersDrawer.module.css';

export interface AdvancedFilters {
  userType: string;
  onboardingStatus: string;
  identityVerified: string;
  dbsVerified: string;
  poaVerified: string;
  createdDateFrom: string;
  createdDateTo: string;
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
    const emptyFilters: AdvancedFilters = {
      userType: '',
      onboardingStatus: '',
      identityVerified: '',
      dbsVerified: '',
      poaVerified: '',
      createdDateFrom: '',
      createdDateTo: '',
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const activeFilterCount = Object.values(localFilters).filter((value) => value !== '').length;

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
          {/* User Type */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>User Type</h3>
            <UnifiedSelect
              value={localFilters.userType}
              onChange={(value) => setLocalFilters({ ...localFilters, userType: String(value) })}
              options={[
                { value: '', label: 'All Types' },
                { value: 'tutor', label: 'Tutors' },
                { value: 'client', label: 'Clients' },
                { value: 'agent', label: 'Agents' },
                { value: 'admin', label: 'Admins' }
              ]}
              placeholder="All Types"
            />
          </div>

          {/* Onboarding Status */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Onboarding Status</h3>
            <UnifiedSelect
              value={localFilters.onboardingStatus}
              onChange={(value) => setLocalFilters({ ...localFilters, onboardingStatus: String(value) })}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'completed', label: 'Completed' },
                { value: 'pending', label: 'Pending' }
              ]}
              placeholder="All Statuses"
            />
          </div>

          {/* Identity Verified */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Identity Verification</h3>
            <UnifiedSelect
              value={localFilters.identityVerified}
              onChange={(value) => setLocalFilters({ ...localFilters, identityVerified: String(value) })}
              options={[
                { value: '', label: 'All' },
                { value: 'verified', label: 'Verified' },
                { value: 'unverified', label: 'Unverified' }
              ]}
              placeholder="All"
            />
          </div>

          {/* DBS Verified */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>DBS Verification</h3>
            <UnifiedSelect
              value={localFilters.dbsVerified}
              onChange={(value) => setLocalFilters({ ...localFilters, dbsVerified: String(value) })}
              options={[
                { value: '', label: 'All' },
                { value: 'verified', label: 'Verified' },
                { value: 'unverified', label: 'Unverified' }
              ]}
              placeholder="All"
            />
          </div>

          {/* POA Verified */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Proof of Address</h3>
            <UnifiedSelect
              value={localFilters.poaVerified}
              onChange={(value) => setLocalFilters({ ...localFilters, poaVerified: String(value) })}
              options={[
                { value: '', label: 'All' },
                { value: 'verified', label: 'Verified' },
                { value: 'unverified', label: 'Unverified' }
              ]}
              placeholder="All"
            />
          </div>

          {/* Created Date Range */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Registration Date</h3>
            <div className={styles.dateRange}>
              <input
                type="date"
                className={styles.dateInput}
                placeholder="From"
                value={localFilters.createdDateFrom}
                onChange={(e) => setLocalFilters({ ...localFilters, createdDateFrom: e.target.value })}
              />
              <span className={styles.dateSeparator}>-</span>
              <input
                type="date"
                className={styles.dateInput}
                placeholder="To"
                value={localFilters.createdDateTo}
                onChange={(e) => setLocalFilters({ ...localFilters, createdDateTo: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
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
            <button className={styles.applyButton} onClick={handleApply}>
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
