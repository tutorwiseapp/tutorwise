# Component Standards & Naming Conventions

**Version**: 1.0
**Last Updated**: 2025-12-18
**Status**: Active Standard

## Overview

This document defines the standardized component structure, naming conventions, and architectural patterns for the Tutorwise application. All new components MUST follow these standards, and existing components should be migrated opportunistically.

---

## 1. Visual Design System

### 1.1 Teal Header Pattern (Required)

All chart and widget components MUST use the standardized teal header pattern:

**CSS Requirements:**
```css
/* Widget Container */
.widget {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: box-shadow 0.2s ease-in-out;
}

.widget:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Teal Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #E6F0F0; /* Teal background */
  border-bottom: 1px solid #e5e7eb;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  color: #006c67; /* Teal icon */
  flex-shrink: 0;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.4;
}

/* Content */
.content {
  padding: 16px;
}

.subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 12px 0;
  font-weight: 500;
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .content { padding: 12px; }
  .title { font-size: 13px; }
  .subtitle { font-size: 12px; }
}
```

**Component Structure:**
```tsx
<div className={styles.widget}>
  <div className={styles.header}>
    <div className={styles.headerLeft}>
      <Icon className={styles.icon} size={20} />
      <h3 className={styles.title}>Title</h3>
    </div>
  </div>
  <div className={styles.content}>
    <p className={styles.subtitle}>Subtitle</p>
    {/* Chart/content here */}
  </div>
</div>
```

---

## 2. Component Naming Conventions

### 2.1 Feature-Specific Components

**Pattern**: `{Feature}{ComponentType}.tsx`

| Component Type | Dashboard | Referrals | Organisation |
|---------------|-----------|-----------|--------------|
| Performance Tab | `DashboardPerformanceTab.tsx` | `ReferralPerformanceTab.tsx` | `OrganisationPerformanceTab.tsx` |
| KPI Grid | `DashboardKPIGrid.tsx` | `ReferralKPIGrid.tsx` | `OrganisationKPIGrid.tsx` |
| Stats Widget | `DashboardStatsWidget.tsx` | `ReferralStatsWidget.tsx` | `OrganisationStatsWidget.tsx` |
| Help Widget | `DashboardHelpWidget.tsx` | `ReferralHelpWidget.tsx` | `OrganisationHelpWidget.tsx` |
| Tip Widget | `DashboardTipWidget.tsx` | `ReferralTipWidget.tsx` | `OrganisationTipWidget.tsx` |
| Video Widget | `DashboardVideoWidget.tsx` | `ReferralVideoWidget.tsx` | `OrganisationVideoWidget.tsx` |

**Rationale**: Consistent prefixing makes it immediately clear which feature a component belongs to and prevents naming collisions.

### 2.2 Shared Hub Components

**Pattern**: `Hub{ComponentType}.tsx`

**Location**: `apps/web/src/app/components/hub/charts/`

**Available Components**:
- `HubKPICard` - KPI metric cards with teal headers
- `HubKPIGrid` - Generic KPI grid container
- `HubEarningsTrendChart` - Line chart for revenue trends
- `HubCalendarHeatmap` - GitHub-style calendar heatmap
- `HubStudentTypeBreakdown` - Pie/bar chart for student types
- `HubTeamPerformanceTable` - Team performance table
- `HubTrendChart` - Generic line chart
- `HubCategoryBreakdownChart` - Generic bar chart

**Usage Rule**: Always use Hub components instead of creating feature-specific duplicates for common chart types.

---

## 3. Directory Structure

### 3.1 Feature Component Structure

```
apps/web/src/app/components/feature/{feature}/
├── {Feature}PerformanceTab.tsx     # Main performance view
├── {Feature}KPIGrid.tsx            # KPI metrics grid
├── {Feature}StatsWidget.tsx        # Sidebar stats widget
├── {Feature}HelpWidget.tsx         # Sidebar help widget
├── {Feature}TipWidget.tsx          # Sidebar tips widget
├── {Feature}VideoWidget.tsx        # Sidebar video widget
├── performance/                    # Performance-specific components
│   ├── {Custom}Chart.tsx          # Only if not available in Hub
│   └── {Custom}Widget.tsx
└── {Feature}{Component}.tsx        # Other feature components
```

### 3.2 Hub Components Structure

```
apps/web/src/app/components/hub/
├── charts/                         # Shared chart components
│   ├── HubKPICard.tsx
│   ├── HubKPIGrid.tsx
│   ├── HubEarningsTrendChart.tsx
│   ├── HubCalendarHeatmap.tsx
│   ├── HubStudentTypeBreakdown.tsx
│   ├── HubTeamPerformanceTable.tsx
│   ├── HubTrendChart.tsx
│   ├── HubCategoryBreakdownChart.tsx
│   └── index.ts                   # Barrel exports
├── layout/                        # Layout components
├── sidebar/                       # Sidebar components
├── content/                       # Content components
└── styles/                        # Shared styles
```

---

## 4. Empty State Management

### 4.1 Standard Pattern

**Always show structure, never hide components when empty.**

**Examples**:
- ✅ Calendar heatmap: Shows all days with gray cells (intensity0) when no bookings
- ✅ Category breakdown: Shows all categories with 0 values and empty bars
- ✅ KPI cards: Shows "-" or "0" for missing data
- ❌ Don't hide charts completely and show "No data" messages

**Code Pattern**:
```tsx
// WRONG - Conditional hiding
{hasData ? <Chart data={data} /> : <EmptyState />}

// CORRECT - Always show structure
<Chart data={data} /> // Shows empty structure internally
```

---

## 5. TypeScript Interfaces

### 5.1 Naming Convention

**Pattern**: `{ComponentName}Props`

```tsx
interface HubKPICardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  // ...
}
```

### 5.2 Data Type Naming

**Pattern**: Descriptive, domain-specific names

```tsx
export interface DayData {
  date: string;
  count: number;
  hours?: number;
}

export interface TeamMember {
  member_id: string;
  member_name: string;
  total_revenue: number;
  // ...
}
```

---

## 6. Import/Export Standards

### 6.1 Barrel Exports

All hub components MUST be exported from `index.ts`:

```tsx
// hub/charts/index.ts
export { default as HubKPICard } from './HubKPICard';
export type { HubKPICardProps } from './HubKPICard';

export { default as HubCalendarHeatmap } from './HubCalendarHeatmap';
export type { DayData } from './HubCalendarHeatmap';
```

### 6.2 Import Pattern

```tsx
// CORRECT - Import from barrel
import { HubKPICard, HubCalendarHeatmap, type DayData } from '@/app/components/hub/charts';

// WRONG - Direct imports
import HubKPICard from '@/app/components/hub/charts/HubKPICard';
```

---

## 7. Prohibited Patterns

### 7.1 Duplicated Chart Components ❌

**Don't Create**:
- `DashboardStudentTypeBreakdown` - Use `HubStudentTypeBreakdown`
- `OrganisationEarningsTrendChart` - Use `HubEarningsTrendChart`
- `ReferralCalendarHeatmap` - Use `HubCalendarHeatmap`

**Rule**: If the chart exists in Hub, use it. Don't duplicate.

### 7.2 Inconsistent Widget Naming ❌

**Don't Use**:
- `TipsCard` - Use `{Feature}TipWidget`
- `HelpCard` - Use `{Feature}HelpWidget`
- `MessagesWidget` without prefix - Use `DashboardMessagesWidget`

### 7.3 Old Visual Patterns ❌

**Don't Use**:
- Colored left accent borders on KPI cards
- Plain headers without teal background
- Different header sizes/fonts across components

---

## 8. Migration Checklist

### 8.1 Components to DELETE

- [ ] `dashboard/widgets/BookingCalendarHeatmap.tsx` - Use `HubCalendarHeatmap`
- [ ] `dashboard/widgets/StudentTypeBreakdown.tsx` - Use `HubStudentTypeBreakdown`
- [ ] `dashboard/widgets/EarningsTrendChart.tsx` - Use `HubEarningsTrendChart`
- [ ] `dashboard/widgets/KPICard.tsx` - Use `HubKPICard`
- [ ] `organisation/OrganisationStudentTypeBreakdown.tsx` - Use `HubStudentTypeBreakdown`
- [ ] `organisation/OrganisationEarningsTrendChart.tsx` - Use `HubEarningsTrendChart`

### 8.2 Components to RENAME

- [ ] `referrals/PerformanceView.tsx` → `ReferralPerformanceTab.tsx`
- [ ] `referrals/ReferralPerformanceKPIGrid.tsx` → `ReferralKPIGrid.tsx`
- [ ] `dashboard/widgets/TipsCard.tsx` → `DashboardTipWidget.tsx`
- [ ] `dashboard/widgets/KPIGrid.tsx` → `DashboardKPIGrid.tsx`

### 8.3 Components Already Compliant ✅

- `OrganisationPerformanceTab.tsx`
- `OrganisationStatsWidget.tsx`
- `OrganisationHelpWidget.tsx`
- `OrganisationTipWidget.tsx`
- `OrganisationVideoWidget.tsx`
- `DashboardHelpWidget.tsx`
- `DashboardVideoWidget.tsx`
- All Hub components

---

## 9. Code Review Checklist

Before merging any PR, verify:

- [ ] Component name follows `{Feature}{Type}` or `Hub{Type}` pattern
- [ ] Teal header pattern implemented (if widget/chart)
- [ ] Empty state shows structure, doesn't hide component
- [ ] No duplicate chart components (uses Hub components)
- [ ] Exported from appropriate `index.ts`
- [ ] TypeScript interfaces use `{Name}Props` pattern
- [ ] Mobile responsive styles included
- [ ] File located in correct directory

---

## 10. Examples

### 10.1 Good Example - HubKPICard

```tsx
// apps/web/src/app/components/hub/charts/HubKPICard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import styles from './HubKPICard.module.css';

export interface HubKPICardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: 'success' | 'info' | 'warning' | 'neutral';
}

export default function HubKPICard({ label, value, icon: Icon }: HubKPICardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {Icon && <Icon className={styles.icon} size={20} />}
          <span className={styles.label}>{label}</span>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.value}>{value}</div>
      </div>
    </div>
  );
}
```

### 10.2 Bad Example - Duplicate Component ❌

```tsx
// DON'T DO THIS
// apps/web/src/app/components/feature/dashboard/widgets/DashboardKPICard.tsx
// This duplicates HubKPICard - use Hub component instead!
```

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-18 | Initial standards document created |

---

## Enforcement

This standard is **MANDATORY** for:
- All new components created after 2025-12-18
- Any component being refactored or updated

Migration of existing components should follow the checklist in Section 8.
