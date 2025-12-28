/**
 * Filename: AdvancedFiltersDrawer.tsx
 * Purpose: Right-side drawer for advanced user filters
 * Created: 2025-12-28
 * Pattern: Matches Bookings AdvancedFilters drawer pattern
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
            <select
              className={styles.filterSelect}
              value={localFilters.userType}
              onChange={(e) => setLocalFilters({ ...localFilters, userType: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="tutor">Tutors</option>
              <option value="client">Clients</option>
              <option value="agent">Agents</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          {/* Onboarding Status */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Onboarding Status</h3>
            <select
              className={styles.filterSelect}
              value={localFilters.onboardingStatus}
              onChange={(e) => setLocalFilters({ ...localFilters, onboardingStatus: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Identity Verified */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Identity Verification</h3>
            <select
              className={styles.filterSelect}
              value={localFilters.identityVerified}
              onChange={(e) => setLocalFilters({ ...localFilters, identityVerified: e.target.value })}
            >
              <option value="">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>

          {/* DBS Verified */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>DBS Verification</h3>
            <select
              className={styles.filterSelect}
              value={localFilters.dbsVerified}
              onChange={(e) => setLocalFilters({ ...localFilters, dbsVerified: e.target.value })}
            >
              <option value="">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>

          {/* POA Verified */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Proof of Address</h3>
            <select
              className={styles.filterSelect}
              value={localFilters.poaVerified}
              onChange={(e) => setLocalFilters({ ...localFilters, poaVerified: e.target.value })}
            >
              <option value="">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
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
