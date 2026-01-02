/**
 * Filename: HubDataTable.tsx
 * Purpose: Generic data table component for admin pages
 * Created: 2025-12-24
 * Updated: 2025-12-24 - Phase 2 features
 * Design: Hybrid approach - table on desktop/tablet, cards on mobile
 *
 * Features (Phase 1):
 * - Responsive table (40px header, 48px rows on desktop)
 * - Search bar
 * - Basic filters (status, date)
 * - Bulk select checkboxes
 * - Export to CSV
 * - Pagination (50 per page)
 * - Loading/empty/error states
 * - Sort functionality
 * - Row click handler for detail modal
 * - Mobile card fallback
 *
 * Features (Phase 2):
 * - Real-time updates with auto-refresh toggle
 * - Saved filter views with localStorage
 * - Advanced filters (multi-select, date ranges)
 * - Quick actions dropdown for bulk operations
 * - Keyboard shortcuts (Cmd+K search, arrow navigation)
 *
 * Usage:
 * <HubDataTable
 *   columns={bookingColumns}
 *   data={bookings}
 *   loading={isLoading}
 *   onRowClick={(booking) => openModal(booking)}
 *   onRefresh={() => refetch()}
 *   autoRefreshInterval={30000}
 *   bulkActions={[
 *     { label: 'Approve', value: 'approve', onClick: handleBulkApprove },
 *     { label: 'Reject', value: 'reject', onClick: handleBulkReject }
 *   ]}
 *   pagination={{
 *     page: 1,
 *     limit: 50,
 *     total: 1000,
 *     onPageChange: (page) => setPage(page)
 *   }}
 *   mobileCard={(booking) => <BookingCard booking={booking} />}
 * />
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HubPagination from '@/app/components/hub/layout/HubPagination';
import HubToolbar from '@/app/components/hub/toolbar/HubToolbar';
import type { SavedView } from '@/app/components/hub/toolbar/types';
import styles from './HubDataTable.module.css';

export interface Column<T> {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface Filter {
  key: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean; // Phase 2: Allow multiple selections
}

export interface AdvancedFilter {
  type: 'date-range' | 'multi-select' | 'number-range';
  key: string;
  label: string;
  options?: FilterOption[]; // For multi-select
}

export interface BulkAction {
  label: string;
  value: string;
  onClick: (selectedIds: string[]) => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[]; // Options for page size selector (default: [10, 25, 50, 100])
}

export interface HubDataTableProps<T> {
  // Data
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string;

  // Selection
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  getRowId?: (row: T) => string;

  // Interaction
  onRowClick?: (row: T) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onSearch?: (query: string) => void;
  onFilterChange?: (filterKey: string, value: string | string[]) => void;
  onExport?: () => void;
  onRefresh?: () => void; // Phase 2: Manual refresh

  // Configuration
  pagination?: PaginationConfig;
  filters?: Filter[];
  advancedFilters?: AdvancedFilter[]; // Phase 2
  bulkActions?: BulkAction[]; // Phase 2
  autoRefreshInterval?: number; // Phase 2: Auto-refresh in milliseconds
  enableSavedViews?: boolean; // Phase 2: Enable saved filter views
  savedViewsKey?: string; // Phase 2: LocalStorage key for saved views
  searchPlaceholder?: string;
  emptyMessage?: string;
  emptyState?: React.ReactNode;
  mobileCard?: (row: T) => React.ReactNode;
  toolbarActions?: React.ReactNode; // Custom actions rendered on right side of toolbar

  // Styling
  className?: string;
}

export default function HubDataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  error,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  getRowId = (row) => row.id,
  onRowClick,
  onSort,
  onSearch,
  onFilterChange,
  onExport,
  onRefresh,
  pagination,
  filters = [],
  advancedFilters = [],
  bulkActions = [],
  autoRefreshInterval,
  enableSavedViews = false,
  savedViewsKey = 'hubDataTable_savedViews',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data found',
  emptyState,
  mobileCard,
  toolbarActions,
  className = '',
}: HubDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string | string[]>>({});

  // Phase 2: Auto-refresh state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 2: Saved views state
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  // Handle sort
  const handleSort = (key: string) => {
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  // Handle filter
  const handleFilter = (filterKey: string, value: string | string[]) => {
    setFilterValues((prev) => ({ ...prev, [filterKey]: value }));
    onFilterChange?.(filterKey, value);
  };

  // Phase 2: Handle manual refresh
  const handleManualRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500); // Show animation for at least 500ms
    }
  }, [onRefresh]);

  // Phase 2: Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshInterval || !autoRefreshEnabled || !onRefresh) return;

    refreshTimerRef.current = setInterval(() => {
      onRefresh();
    }, autoRefreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefreshInterval, autoRefreshEnabled, onRefresh]);

  // Phase 2: Load saved views from localStorage
  useEffect(() => {
    if (!enableSavedViews) return;
    try {
      const saved = localStorage.getItem(savedViewsKey);
      if (saved) {
        setSavedViews(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load saved views:', error);
    }
  }, [enableSavedViews, savedViewsKey]);

  // Phase 2: Save current view (for HubToolbar)
  const handleSaveViewForToolbar = useCallback((name: string, filters: Record<string, string | string[]>, search: string, sort?: string, sortDir?: 'asc' | 'desc') => {
    const newView: SavedView = {
      id: Date.now().toString(),
      name: name.trim(),
      filters,
      searchQuery: search,
      sortKey: sort || sortKey || undefined,
      sortDirection: sortDir || sortDirection,
    };

    const updatedViews = [...savedViews, newView];
    setSavedViews(updatedViews);
    localStorage.setItem(savedViewsKey, JSON.stringify(updatedViews));
  }, [sortKey, sortDirection, savedViews, savedViewsKey]);

  // Phase 2: Load saved view
  const handleLoadView = useCallback((view: SavedView) => {
    setFilterValues(view.filters);
    setSearchQuery(view.searchQuery);
    setSortKey(view.sortKey || null);
    setSortDirection(view.sortDirection || 'asc');

    // Notify parent components
    Object.entries(view.filters).forEach(([key, value]) => {
      onFilterChange?.(key, value);
    });
    onSearch?.(view.searchQuery);
    if (view.sortKey && view.sortDirection) {
      onSort?.(view.sortKey, view.sortDirection);
    }
  }, [onFilterChange, onSearch, onSort]);

  // Phase 2: Delete saved view
  const handleDeleteView = useCallback((viewId: string) => {
    const updatedViews = savedViews.filter(v => v.id !== viewId);
    setSavedViews(updatedViews);
    localStorage.setItem(savedViewsKey, JSON.stringify(updatedViews));
  }, [savedViews, savedViewsKey]);

  // Handle bulk select
  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedRows.size === data.length) {
      onSelectionChange(new Set());
    } else {
      const allIds = new Set(data.map(getRowId));
      onSelectionChange(allIds);
    }
  };

  const handleSelectRow = (rowId: string) => {
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowId)) {
      newSelection.delete(rowId);
    } else {
      newSelection.add(rowId);
    }
    onSelectionChange(newSelection);
  };

  // Calculate pagination info
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;
  const startItem = pagination ? (pagination.page - 1) * pagination.limit + 1 : 1;
  const endItem = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : data.length;

  return (
    <div className={`${styles.tableContainer} ${className}`}>
      {/* Toolbar - Using standalone HubToolbar component */}
      <HubToolbar
        searchPlaceholder={searchPlaceholder}
        searchValue={searchQuery}
        onSearchChange={handleSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilter}
        savedViews={savedViews}
        onSaveView={enableSavedViews ? handleSaveViewForToolbar : undefined}
        onLoadView={handleLoadView}
        onDeleteView={handleDeleteView}
        enableSavedViews={enableSavedViews}
        savedViewsKey={savedViewsKey}
        bulkActions={bulkActions}
        selectedCount={selectedRows.size}
        onClearSelection={() => onSelectionChange?.(new Set())}
        onRefresh={onRefresh ? handleManualRefresh : undefined}
        isRefreshing={isRefreshing}
        autoRefreshInterval={autoRefreshInterval}
        autoRefreshEnabled={autoRefreshEnabled}
        onAutoRefreshToggle={setAutoRefreshEnabled}
        onExport={onExport}
        toolbarActions={toolbarActions}
      />

      {/* Desktop/Tablet Table */}
      <div className={styles.desktopTable}>
        {error ? (
          <div className={styles.errorState}>
            <p className={styles.errorMessage}>{error}</p>
            <button onClick={() => window.location.reload()} className={styles.retryButton}>
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className={styles.loadingState}>
            {[...Array(10)].map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                {selectable && <div className={styles.skeletonCell} style={{ width: '40px' }} />}
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className={styles.skeletonCell}
                    style={{ width: col.width || 'auto' }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className={styles.emptyState}>
            {emptyState || <p className={styles.emptyMessage}>{emptyMessage}</p>}
          </div>
        ) : (
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.headerRow}>
                {selectable && (
                  <th className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={selectedRows.size === data.length && data.length > 0}
                      onChange={handleSelectAll}
                      className={styles.checkbox}
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`${styles.headerCell} ${
                      column.sortable ? styles.sortable : ''
                    } ${column.hideOnTablet ? styles.hideOnTablet : ''} ${
                      column.hideOnMobile ? styles.hideOnMobile : ''
                    }`}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className={styles.headerContent}>
                      <span>{column.label}</span>
                      {column.sortable && sortKey === column.key && (
                        <span className={styles.sortIndicator}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={styles.tbody}>
              {data.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selectedRows.has(rowId);

                return (
                  <tr
                    key={rowId}
                    className={`${styles.dataRow} ${isSelected ? styles.selected : ''} ${
                      onRowClick ? styles.clickable : ''
                    }`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className={styles.checkboxCell}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(rowId);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={styles.checkbox}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`${styles.dataCell} ${
                          column.hideOnTablet ? styles.hideOnTablet : ''
                        } ${column.hideOnMobile ? styles.hideOnMobile : ''}`}
                      >
                        {column.render ? column.render(row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards */}
      {mobileCard && (
        <div className={styles.mobileCards}>
          {loading ? (
            <div className={styles.loadingState}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className={styles.skeletonCard} />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className={styles.emptyState}>
              {emptyState || <p className={styles.emptyMessage}>{emptyMessage}</p>}
            </div>
          ) : (
            data.map((row) => (
              <div key={getRowId(row)} onClick={() => onRowClick?.(row)}>
                {mobileCard(row)}
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <div className={styles.paginationWrapper}>
          {/* Page Size Selector - Left aligned */}
          {pagination.onLimitChange && (
            <select
              value={pagination.limit}
              onChange={(e) => {
                pagination.onLimitChange!(Number(e.target.value));
                pagination.onPageChange(1); // Reset to first page when changing page size
              }}
              className={styles.pageSizeSelector}
            >
              {(pagination.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          )}
          {/* HubPagination Component - Centered */}
          <div className={styles.paginationCenter}>
            <HubPagination
              currentPage={pagination.page}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={pagination.onPageChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
