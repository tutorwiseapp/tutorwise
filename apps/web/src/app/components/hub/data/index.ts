/**
 * Filename: index.ts
 * Purpose: Export hub data components
 * Created: 2025-12-24
 * Updated: 2025-12-24 - Phase 2 types
 *
 * Usage:
 * import { HubDataTable } from '@/app/components/hub/data';
 * import type { Column, Filter, BulkAction, SavedView, PaginationConfig } from '@/app/components/hub/data';
 */

export { default as HubDataTable } from './HubDataTable';
export type {
  Column,
  Filter,
  FilterOption,
  AdvancedFilter,
  SavedView,
  BulkAction,
  PaginationConfig,
  HubDataTableProps,
} from './HubDataTable';
