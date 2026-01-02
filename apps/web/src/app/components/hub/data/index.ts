/**
 * Filename: index.ts
 * Purpose: Export hub data components
 * Created: 2025-12-24
 * Updated: 2026-01-02 - Use SavedView from toolbar types (shared with HubToolbar)
 *
 * Usage:
 * import { HubDataTable } from '@/app/components/hub/data';
 * import type { Column, Filter, BulkAction, PaginationConfig } from '@/app/components/hub/data';
 * import type { SavedView } from '@/app/components/hub/toolbar/types';
 */

export { default as HubDataTable } from './HubDataTable';
export type {
  Column,
  Filter,
  FilterOption,
  AdvancedFilter,
  BulkAction,
  PaginationConfig,
  HubDataTableProps,
} from './HubDataTable';

// Re-export SavedView from toolbar types for convenience
export type { SavedView } from '@/app/components/hub/toolbar/types';
