/**
 * Filename: index.ts
 * Purpose: Barrel export for hub chart components
 * Created: 2025-12-17
 *
 * Provides centralized imports for:
 * - KPI cards and grids
 * - Chart widgets (earnings, student breakdown)
 * - Type definitions
 */

// KPI Components
export { default as HubKPICard } from './HubKPICard';
export type { HubKPICardProps } from './HubKPICard';

export { default as HubKPIGrid } from './HubKPIGrid';

// Chart Components
export { default as HubEarningsTrendChart } from './HubEarningsTrendChart';
export type { WeeklyEarnings } from './HubEarningsTrendChart';

export { default as HubStudentTypeBreakdown } from './HubStudentTypeBreakdown';
export type { StudentTypeData } from './HubStudentTypeBreakdown';
