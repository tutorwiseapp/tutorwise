/**
 * Filename: index.ts
 * Purpose: Barrel export for hub chart components
 * Created: 2025-12-17
 * Updated: 2025-12-17 - Simplified to Dashboard design pattern
 *
 * Provides centralized imports for:
 * - Chart components (simple, self-contained)
 * - KPI cards and grids
 * - Type definitions
 */

// ============================================
// CHART COMPONENTS - Simple, self-contained
// ============================================
export { default as HubEarningsTrendChart } from './HubEarningsTrendChart';
export type { WeeklyEarnings } from './HubEarningsTrendChart';

export { default as HubTrendChart } from './HubTrendChart';
export type { TrendDataPoint, HubTrendChartProps } from './HubTrendChart';

export { default as HubCategoryBreakdownChart } from './HubCategoryBreakdownChart';
export type { CategoryData, HubCategoryBreakdownChartProps } from './HubCategoryBreakdownChart';

// ============================================
// KPI Components
// ============================================
export { default as HubKPICard } from './HubKPICard';
export type { HubKPICardProps } from './HubKPICard';

export { default as HubKPIGrid } from './HubKPIGrid';

export { default as HubComplexKPICard } from './HubComplexKPICard';
export type { HubComplexKPICardProps, HubComplexKPICardStat } from './HubComplexKPICard';

// ============================================
// Other Chart Components
// ============================================
export { default as HubStudentTypeBreakdown } from './HubStudentTypeBreakdown';
export type { StudentTypeData } from './HubStudentTypeBreakdown';

export { default as HubTeamPerformanceTable } from './HubTeamPerformanceTable';
export type { TeamMember } from './HubTeamPerformanceTable';

export { default as HubCalendarHeatmap } from './HubCalendarHeatmap';
export type { DayData } from './HubCalendarHeatmap';
