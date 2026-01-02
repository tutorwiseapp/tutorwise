/**
 * Filename: types.ts
 * Purpose: Shared types for HubToolbar component
 * Created: 2026-01-01
 * Updated: 2026-01-02 - Added Saved Views and Bulk Actions
 * Updated: 2026-01-02 - Added advanced filters and auto-refresh
 */

export interface FilterOption {
  label: string;
  value: string;
}

export interface Filter {
  key: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean;
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
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface BulkAction {
  label: string;
  value: string;
  onClick: (selectedIds: string[]) => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ComponentType<{ className?: string }>;
}

export interface HubToolbarProps {
  // Search
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;

  // Filters
  filters?: Filter[];
  filterValues?: Record<string, string | string[]>;
  onFilterChange?: (key: string, value: string | string[]) => void;
  advancedFilters?: AdvancedFilter[];

  // Saved Views (Phase 2)
  savedViews?: SavedView[];
  onSaveView?: (name: string, filters: Record<string, string | string[]>, searchQuery: string, sortKey?: string, sortDirection?: 'asc' | 'desc') => void;
  onLoadView?: (view: SavedView) => void;
  onDeleteView?: (viewId: string) => void;
  enableSavedViews?: boolean;
  savedViewsKey?: string; // LocalStorage key for saved views

  // Bulk Actions (Phase 2)
  bulkActions?: BulkAction[];
  selectedCount?: number;
  onClearSelection?: () => void;

  // Actions
  onRefresh?: () => void;
  isRefreshing?: boolean;
  autoRefreshInterval?: number; // Auto-refresh in milliseconds
  autoRefreshEnabled?: boolean;
  onAutoRefreshToggle?: (enabled: boolean) => void;
  onExport?: () => void;
  customActions?: React.ReactNode;
  toolbarActions?: React.ReactNode; // Custom actions rendered before export

  // Style
  variant?: 'default' | 'minimal'; // default: grey bg + border | minimal: transparent + compact
  className?: string;
  sticky?: boolean;
}
