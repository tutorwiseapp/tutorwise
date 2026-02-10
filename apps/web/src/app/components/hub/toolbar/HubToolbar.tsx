/**
 * Filename: HubToolbar.tsx
 * Purpose: Reusable toolbar component for HubDataTable and HubKanbanBoard
 * Created: 2026-01-01
 * Updated: 2026-01-02 - Added Saved Views and Bulk Actions (Phase 2)
 * Pattern: Search + Filters + Saved Views + Bulk Actions + Actions
 *
 * Standards: Follows HUB-UI-STANDARDS.md
 * - Icon buttons: 36px × 36px
 * - Icons: 16px (1rem)
 * - Toolbar height: 68px (16px padding + 36px controls + 16px padding)
 * - Responsive breakpoints: 767px (mobile), 1023px (tablet)
 *
 * Features:
 * - Search with Cmd+K shortcut
 * - Dropdown filters
 * - Saved Views (save/load/delete filter combinations)
 * - Bulk Actions (actions for selected items)
 * - Refresh, Export, Custom actions
 */

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Search, ChevronDown, RefreshCw, Download, Save, X, Trash2 } from 'lucide-react';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import type { HubToolbarProps } from './types';
import styles from './HubToolbar.module.css';

export default function HubToolbar({
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  showSearch = true,
  filters = [],
  filterValues = {},
  onFilterChange,
  advancedFilters: _advancedFilters = [],
  savedViews = [],
  onSaveView,
  onLoadView,
  onDeleteView,
  enableSavedViews = false,
  savedViewsKey = 'hubToolbar_savedViews',
  bulkActions = [],
  selectedCount = 0,
  onClearSelection,
  onRefresh,
  isRefreshing = false,
  autoRefreshInterval,
  autoRefreshEnabled = false,
  onAutoRefreshToggle,
  onExport,
  customActions,
  toolbarActions,
  variant = 'default',
  className = '',
  sticky = false,
}: HubToolbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement>(null);
  const [localSavedViews, setLocalSavedViews] = useState<typeof savedViews>([]);
  const [internalAutoRefreshEnabled, setInternalAutoRefreshEnabled] = useState(autoRefreshEnabled);
  const [showSavedViewsMenu, setShowSavedViewsMenu] = useState(false);
  const savedViewsMenuRef = useRef<HTMLDivElement>(null);

  // Scroll buttons state for mobile/tablet
  const scrollableContentRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll overflow and update button states
  const checkScrollOverflow = () => {
    const el = scrollableContentRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  // Scroll by a fixed amount
  const handleScrollLeft = () => {
    const el = scrollableContentRef.current;
    if (!el) return;
    el.scrollBy({ left: -150, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    const el = scrollableContentRef.current;
    if (!el) return;
    el.scrollBy({ left: 150, behavior: 'smooth' });
  };

  // Check overflow on mount, resize, and content changes
  useEffect(() => {
    checkScrollOverflow();

    const el = scrollableContentRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollOverflow);
    }

    window.addEventListener('resize', checkScrollOverflow);

    return () => {
      if (el) {
        el.removeEventListener('scroll', checkScrollOverflow);
      }
      window.removeEventListener('resize', checkScrollOverflow);
    };
  }, [filters, filterValues]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && showSearch) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Cmd/Ctrl + R: Refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r' && onRefresh) {
        e.preventDefault();
        onRefresh();
      }

      // Escape: Clear search or close modals
      if (e.key === 'Escape') {
        if (showSaveViewModal) {
          setShowSaveViewModal(false);
          setNewViewName('');
        } else if (showBulkMenu) {
          setShowBulkMenu(false);
        } else if (showSavedViewsMenu) {
          setShowSavedViewsMenu(false);
        } else if (document.activeElement === searchInputRef.current) {
          onSearchChange?.('');
          searchInputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, onSearchChange, onRefresh, showSaveViewModal, showBulkMenu, showSavedViewsMenu]);

  // Close bulk menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) {
        setShowBulkMenu(false);
      }
    };

    if (showBulkMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBulkMenu]);

  // Close saved views menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (savedViewsMenuRef.current && !savedViewsMenuRef.current.contains(e.target as Node)) {
        setShowSavedViewsMenu(false);
      }
    };

    if (showSavedViewsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSavedViewsMenu]);

  // Load saved views from localStorage
  useEffect(() => {
    if (!enableSavedViews) return;
    try {
      const stored = localStorage.getItem(savedViewsKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setLocalSavedViews(parsed);
      }
    } catch (error) {
      console.error('Failed to load saved views:', error);
    }
  }, [enableSavedViews, savedViewsKey]);

  // Merge external savedViews with localStorage savedViews
  const mergedSavedViews = enableSavedViews
    ? [...(savedViews || []), ...localSavedViews]
    : savedViews || [];

  // Handle save view
  const handleSaveView = () => {
    if (!newViewName.trim()) return;

    const newView = {
      id: Date.now().toString(),
      name: newViewName.trim(),
      filters: filterValues,
      searchQuery: searchValue,
    };

    // Save to localStorage
    try {
      const updatedViews = [...localSavedViews, newView];
      setLocalSavedViews(updatedViews);
      localStorage.setItem(savedViewsKey, JSON.stringify(updatedViews));
    } catch (error) {
      console.error('Failed to save view:', error);
    }

    // Call parent callback if provided
    if (onSaveView) {
      onSaveView(newViewName.trim(), filterValues, searchValue);
    }

    setShowSaveViewModal(false);
    setNewViewName('');
  };

  // Handle delete saved view
  const handleDeleteView = (viewId: string) => {
    try {
      const updatedViews = localSavedViews.filter(v => v.id !== viewId);
      setLocalSavedViews(updatedViews);
      localStorage.setItem(savedViewsKey, JSON.stringify(updatedViews));
    } catch (error) {
      console.error('Failed to delete view:', error);
    }

    // Call parent callback if provided
    if (onDeleteView) {
      onDeleteView(viewId);
    }
  };

  // Handle auto-refresh toggle
  const handleAutoRefreshToggle = (enabled: boolean) => {
    setInternalAutoRefreshEnabled(enabled);
    if (onAutoRefreshToggle) {
      onAutoRefreshToggle(enabled);
    }
  };

  // Render toolbar content (filters, actions, etc.) - used in both desktop and mobile layouts
  const renderToolbarContent = () => (
    <>
      {/* Filters */}
      {filters.length > 0 && (
        <div className={styles.filters}>
          {filters.map((filter) => {
            const filterValue = filterValues[filter.key];
            const stringValue = Array.isArray(filterValue) ? filterValue[0] || '' : (filterValue || '');

            return (
              <div key={filter.key} className={styles.filterWrapper}>
                <UnifiedSelect
                  value={stringValue}
                  onChange={(value) => onFilterChange?.(filter.key, String(value))}
                  options={[
                    { value: '', label: filter.label },
                    ...filter.options.map(option => ({
                      value: option.value,
                      label: option.label
                    }))
                  ]}
                  placeholder={filter.label}
                  size="sm"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Saved Views */}
      {enableSavedViews && mergedSavedViews.length > 0 && (
        <div className={styles.savedViewsWrapper} ref={savedViewsMenuRef}>
          <button
            onClick={() => setShowSavedViewsMenu(!showSavedViewsMenu)}
            className={styles.savedViewsButton}
            aria-label="Saved views"
          >
            Saved Views
            <ChevronDown className={styles.filterIcon} />
          </button>
          {showSavedViewsMenu && (
            <div className={styles.savedViewsMenu}>
              {mergedSavedViews.map((view) => {
                const isLocalView = localSavedViews.some(v => v.id === view.id);
                return (
                  <div key={view.id} className={styles.savedViewItem}>
                    <button
                      onClick={() => {
                        if (onLoadView) onLoadView(view);
                        setShowSavedViewsMenu(false);
                      }}
                      className={styles.savedViewItemButton}
                    >
                      {view.name}
                    </button>
                    {isLocalView && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteView(view.id);
                        }}
                        className={styles.savedViewDeleteButton}
                        title="Delete view"
                        aria-label="Delete view"
                      >
                        <Trash2 className={styles.savedViewDeleteIcon} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Save View Button */}
      {enableSavedViews && onSaveView && (
        <button
          onClick={() => setShowSaveViewModal(true)}
          className={styles.iconButton}
          title="Save current view"
          aria-label="Save view"
        >
          <Save className={styles.buttonIcon} />
        </button>
      )}

      {/* Bulk Actions */}
      {bulkActions.length > 0 && selectedCount > 0 && (
        <div className={styles.bulkActionsContainer}>
          <div className={styles.bulkSelectedCount}>
            {selectedCount} selected
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className={styles.bulkClearButton}
                aria-label="Clear selection"
              >
                <X className={styles.bulkClearIcon} />
              </button>
            )}
          </div>
          <div className={styles.bulkActionsWrapper} ref={bulkMenuRef}>
            <button
              onClick={() => setShowBulkMenu(!showBulkMenu)}
              className={styles.bulkActionsButton}
              aria-label="Bulk actions"
            >
              Actions
              <ChevronDown className={styles.bulkActionIcon} />
            </button>
            {showBulkMenu && (
              <div className={styles.bulkActionsMenu}>
                {bulkActions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <button
                      key={action.value}
                      onClick={() => {
                        const selectedIds: string[] = []; // Parent should track selected IDs
                        action.onClick(selectedIds);
                        setShowBulkMenu(false);
                      }}
                      className={`${styles.bulkActionItem} ${action.variant ? styles[`variant-${action.variant}`] : ''}`}
                    >
                      {ActionIcon && <ActionIcon className={styles.bulkActionItemIcon} />}
                      {action.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`${styles.iconButton} ${isRefreshing ? styles.refreshing : ''}`}
            title="Refresh (⌘R)"
            aria-label="Refresh"
          >
            <RefreshCw className={styles.buttonIcon} />
          </button>
        )}

        {/* Auto-refresh Toggle */}
        {onRefresh && autoRefreshInterval && (
          <label className={styles.autoRefreshToggle}>
            <input
              type="checkbox"
              checked={internalAutoRefreshEnabled}
              onChange={(e) => handleAutoRefreshToggle(e.target.checked)}
              className={styles.autoRefreshCheckbox}
            />
            <span className={styles.autoRefreshLabel}>Auto-refresh</span>
          </label>
        )}

        {/* Custom Toolbar Actions (rendered before Export) */}
        {toolbarActions}

        {/* Export Button */}
        {onExport && (
          <button
            onClick={onExport}
            className={styles.iconButton}
            title="Export to CSV"
            aria-label="Export to CSV"
          >
            <Download className={styles.buttonIcon} />
          </button>
        )}

        {/* Custom Actions */}
        {customActions}
      </div>
    </>
  );

  return (
    <div className={`${styles.toolbar} ${variant === 'minimal' ? styles.toolbarMinimal : ''} ${sticky ? styles.sticky : ''} ${className}`}>
      {/* Search */}
      {showSearch && (
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={`${searchPlaceholder} (⌘K)`}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      )}

      {/* Desktop: Scrollable container (shown on desktop, hidden on mobile/tablet via CSS) */}
      <div className={styles.toolbarScrollable}>
        {renderToolbarContent()}
      </div>

      {/* Mobile/Tablet: Scroll buttons wrapper (hidden on desktop, shown on mobile/tablet via CSS) */}
      <div className={styles.scrollButtonsWrapper}>
        {/* Left scroll button */}
        <button
          className={`${styles.scrollButton} ${styles.scrollButtonLeft}`}
          onClick={handleScrollLeft}
          disabled={!canScrollLeft}
          aria-label="Scroll left"
        >
          <span className={styles.scrollArrowLeft} />
        </button>

        {/* Scrollable content */}
        <div
          ref={scrollableContentRef}
          className={styles.scrollableContent}
        >
          {renderToolbarContent()}
        </div>

        {/* Right scroll button */}
        <button
          className={`${styles.scrollButton} ${styles.scrollButtonRight}`}
          onClick={handleScrollRight}
          disabled={!canScrollRight}
          aria-label="Scroll right"
        >
          <span className={styles.scrollArrowRight} />
        </button>
      </div>

      {/* Save View Modal */}
      {showSaveViewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSaveViewModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Save View</h3>
              <button
                onClick={() => setShowSaveViewModal(false)}
                className={styles.modalCloseButton}
                aria-label="Close"
              >
                <X className={styles.modalCloseIcon} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.modalLabel}>
                View Name
                <input
                  type="text"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveView();
                  }}
                  placeholder="e.g., Pending Approvals"
                  className={styles.modalInput}
                  autoFocus
                />
              </label>
              <div className={styles.modalInfo}>
                Current filters and search will be saved
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowSaveViewModal(false)}
                className={styles.modalButtonSecondary}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveView}
                disabled={!newViewName.trim()}
                className={styles.modalButtonPrimary}
              >
                Save View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
