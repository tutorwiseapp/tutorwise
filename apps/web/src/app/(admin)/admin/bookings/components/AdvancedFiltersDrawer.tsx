/**
 * Filename: AdvancedFiltersDrawer.tsx
 * Purpose: Right-side drawer for advanced booking filters
 * Created: 2025-12-25
 * Pattern: Matches marketplace AdvancedFilters drawer pattern
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './AdvancedFiltersDrawer.module.css';

export interface AdvancedFilters {
  bookingType: string;
  client: string;
  agent: string;
  tutor: string;
  amountMin: string;
  amountMax: string;
}

interface AdvancedFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  filterOptions?: {
    clients: Array<{ id: string; full_name: string }>;
    agents: Array<{ id: string; full_name: string }>;
    tutors: Array<{ id: string; full_name: string }>;
  };
}

export default function AdvancedFiltersDrawer({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  filterOptions,
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
      bookingType: '',
      client: '',
      agent: '',
      tutor: '',
      amountMin: '',
      amountMax: '',
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
          {/* Booking Type */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Booking Type</h3>
            <select
              className={styles.filterSelect}
              value={localFilters.bookingType}
              onChange={(e) => setLocalFilters({ ...localFilters, bookingType: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="direct">Direct</option>
              <option value="referred">Referred</option>
              <option value="agent_job">Agent Job</option>
            </select>
          </div>

          {/* Client */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Client</h3>
            <select
              className={styles.filterSelect}
              value={localFilters.client}
              onChange={(e) => setLocalFilters({ ...localFilters, client: e.target.value })}
            >
              <option value="">All Clients</option>
              {filterOptions?.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Agent */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Agent</h3>
            <select
              className={styles.filterSelect}
              value={localFilters.agent}
              onChange={(e) => setLocalFilters({ ...localFilters, agent: e.target.value })}
            >
              <option value="">All Agents</option>
              {filterOptions?.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Tutor */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Tutor</h3>
            <select
              className={styles.filterSelect}
              value={localFilters.tutor}
              onChange={(e) => setLocalFilters({ ...localFilters, tutor: e.target.value })}
            >
              <option value="">All Tutors</option>
              {filterOptions?.tutors.map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Range */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Amount Range (£)</h3>
            <div className={styles.priceRange}>
              <input
                type="number"
                className={styles.priceInput}
                placeholder="Min"
                min="0"
                step="0.01"
                value={localFilters.amountMin}
                onChange={(e) => setLocalFilters({ ...localFilters, amountMin: e.target.value })}
              />
              <span className={styles.priceSeparator}>-</span>
              <input
                type="number"
                className={styles.priceInput}
                placeholder="Max"
                min="0"
                step="0.01"
                value={localFilters.amountMax}
                onChange={(e) => setLocalFilters({ ...localFilters, amountMax: e.target.value })}
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
