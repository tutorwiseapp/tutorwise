/**
 * Filename: AdvancedFiltersDrawer.tsx
 * Purpose: Right-side drawer for advanced booking filters
 * Created: 2025-12-25
 * Pattern: Matches marketplace AdvancedFilters drawer pattern
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
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
            <UnifiedSelect
              value={localFilters.bookingType}
              onChange={(value) => setLocalFilters({ ...localFilters, bookingType: String(value) })}
              options={[
                { value: '', label: 'All Types' },
                { value: 'direct', label: 'Direct' },
                { value: 'referred', label: 'Referred' },
                { value: 'agent_job', label: 'Agent Job' }
              ]}
              placeholder="All Types"
            />
          </div>

          {/* Client */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Client</h3>
            <UnifiedSelect
              value={localFilters.client}
              onChange={(value) => setLocalFilters({ ...localFilters, client: String(value) })}
              options={[
                { value: '', label: 'All Clients' },
                ...(filterOptions?.clients.map((client) => ({
                  value: client.id,
                  label: client.full_name
                })) || [])
              ]}
              placeholder="All Clients"
            />
          </div>

          {/* Agent */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Agent</h3>
            <UnifiedSelect
              value={localFilters.agent}
              onChange={(value) => setLocalFilters({ ...localFilters, agent: String(value) })}
              options={[
                { value: '', label: 'All Agents' },
                ...(filterOptions?.agents.map((agent) => ({
                  value: agent.id,
                  label: agent.full_name
                })) || [])
              ]}
              placeholder="All Agents"
            />
          </div>

          {/* Tutor */}
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Tutor</h3>
            <UnifiedSelect
              value={localFilters.tutor}
              onChange={(value) => setLocalFilters({ ...localFilters, tutor: String(value) })}
              options={[
                { value: '', label: 'All Tutors' },
                ...(filterOptions?.tutors.map((tutor) => ({
                  value: tutor.id,
                  label: tutor.full_name
                })) || [])
              ]}
              placeholder="All Tutors"
            />
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
