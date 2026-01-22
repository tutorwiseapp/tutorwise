/**
 * Filename: index.ts
 * Purpose: Export all user dashboard widgets for easy importing
 * Created: 2026-01-22
 * Phase: Dashboard Alignment Phase 1.5
 * Pattern: Follows admin/widgets/index.ts structure
 *
 * Note: Only UserStatsWidget is currently implemented.
 * Other widgets (Tip, Help, Video, Activity) will be added when
 * their corresponding Hub components are created.
 */

export { default as UserStatsWidget } from './UserStatsWidget';
