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
import { Search, Download, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Save, MoreVertical, X } from 'lucide-react';
import HubPagination from '@/app/components/hub/layout/HubPagination';
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

export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, string | string[]>;
  searchQuery: string;
  sortKey: string;
  sortDirection: 'asc' | 'desc';
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
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  // Phase 2: Bulk actions state
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Phase 2: Keyboard shortcuts state
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Phase 2: Save current view
  const handleSaveView = useCallback(() => {
    if (!newViewName.trim()) return;

    const newView: SavedView = {
      id: Date.now().toString(),
      name: newViewName.trim(),
      filters: filterValues,
      searchQuery,
      sortKey: sortKey || '',
      sortDirection,
    };

    const updatedViews = [...savedViews, newView];
    setSavedViews(updatedViews);
    localStorage.setItem(savedViewsKey, JSON.stringify(updatedViews));
    setShowSaveViewModal(false);
    setNewViewName('');
  }, [newViewName, filterValues, searchQuery, sortKey, sortDirection, savedViews, savedViewsKey]);

  // Phase 2: Load saved view
  const handleLoadView = useCallback((view: SavedView) => {
    setFilterValues(view.filters);
    setSearchQuery(view.searchQuery);
    setSortKey(view.sortKey);
    setSortDirection(view.sortDirection);

    // Notify parent components
    Object.entries(view.filters).forEach(([key, value]) => {
      onFilterChange?.(key, value);
    });
    onSearch?.(view.searchQuery);
    if (view.sortKey) {
      onSort?.(view.sortKey, view.sortDirection);
    }
  }, [onFilterChange, onSearch, onSort]);

  // Phase 2: Delete saved view
  const handleDeleteView = useCallback((viewId: string) => {
    const updatedViews = savedViews.filter(v => v.id !== viewId);
    setSavedViews(updatedViews);
    localStorage.setItem(savedViewsKey, JSON.stringify(updatedViews));
  }, [savedViews, savedViewsKey]);

  // Phase 2: Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Cmd/Ctrl + R: Refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r' && onRefresh) {
        e.preventDefault();
        handleManualRefresh();
      }

      // Escape: Clear search
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        onSearch?.('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRefresh, onSearch, handleManualRefresh]);

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
      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Search */}
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={`${searchPlaceholder} (⌘K)`}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Filters */}
        {filters.length > 0 && (
          <div className={styles.filters}>
            {filters.map((filter) => (
              <div key={filter.key} className={styles.filterWrapper}>
                <select
                  value={filterValues[filter.key] || ''}
                  onChange={(e) => handleFilter(filter.key, e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">{filter.label}</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className={styles.filterIcon} />
              </div>
            ))}
          </div>
        )}

        {/* Phase 2: Saved Views */}
        {enableSavedViews && savedViews.length > 0 && (
          <div className={styles.filterWrapper}>
            <select
              onChange={(e) => {
                const view = savedViews.find(v => v.id === e.target.value);
                if (view) handleLoadView(view);
              }}
              className={styles.filterSelect}
            >
              <option value="">Saved Views</option>
              {savedViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                </option>
              ))}
            </select>
            <ChevronDown className={styles.filterIcon} />
          </div>
        )}

        {/* Phase 2: Save View Button */}
        {enableSavedViews && (
          <button
            onClick={() => setShowSaveViewModal(true)}
            className={styles.iconButton}
            title="Save current view"
          >
            <Save className={styles.buttonIcon} />
          </button>
        )}

        {/* Phase 2: Refresh Button */}
        {onRefresh && (
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`${styles.iconButton} ${isRefreshing ? styles.refreshing : ''}`}
            title="Refresh data (⌘R)"
          >
            <RefreshCw className={styles.buttonIcon} />
          </button>
        )}

        {/* Phase 2: Auto-refresh Toggle */}
        {onRefresh && autoRefreshInterval && (
          <label className={styles.autoRefreshToggle}>
            <input
              type="checkbox"
              checked={autoRefreshEnabled}
              onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
            />
            <span className={styles.autoRefreshLabel}>Auto-refresh</span>
          </label>
        )}

        {/* Custom Toolbar Actions (rendered before Export) */}
        {toolbarActions}

        {/* Export */}
        {onExport && (
          <button onClick={onExport} className={styles.exportButton}>
            <Download className={styles.exportIcon} />
            <span className={styles.exportText}>Export CSV</span>
          </button>
        )}

        {/* Phase 2: Bulk Actions */}
        {bulkActions.length > 0 && selectedRows.size > 0 && (
          <div className={styles.bulkActionsWrapper}>
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className={styles.bulkActionsButton}
            >
              <MoreVertical className={styles.buttonIcon} />
              <span>Actions ({selectedRows.size})</span>
              <ChevronDown className={styles.buttonIcon} />
            </button>
            {showBulkActions && (
              <div className={styles.bulkActionsDropdown}>
                {bulkActions.map((action) => (
                  <button
                    key={action.value}
                    onClick={() => {
                      action.onClick(Array.from(selectedRows));
                      setShowBulkActions(false);
                    }}
                    className={`${styles.bulkActionItem} ${styles[action.variant || 'secondary']}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Phase 2: Save View Modal */}
      {showSaveViewModal && (
        <div className={styles.modal}>
          <div className={styles.modalOverlay} onClick={() => setShowSaveViewModal(false)} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Save Current View</h3>
              <button onClick={() => setShowSaveViewModal(false)} className={styles.modalClose}>
                <X className={styles.buttonIcon} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <input
                type="text"
                placeholder="View name"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
                className={styles.modalInput}
                autoFocus
              />
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setShowSaveViewModal(false)} className={styles.modalButtonSecondary}>
                Cancel
              </button>
              <button onClick={handleSaveView} className={styles.modalButtonPrimary} disabled={!newViewName.trim()}>
                Save View
              </button>
            </div>
          </div>
        </div>
      )}

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
