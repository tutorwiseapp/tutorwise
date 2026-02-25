# Sage Analytics - Hub Architecture Compliance Audit
**Date:** 2026-02-25
**Audited Against:** Listings & Bookings admin pages
**Status:** ⚠️ **MAJOR COMPLIANCE ISSUES FOUND**

---

## Executive Summary

Sage Analytics follows the hub architecture pattern with **HubPageLayout**, **HubTabs**, and **HubSidebar**, but has **significant deviations** from the standard Listings/Bookings pattern. The implementation uses custom `.statCard` components instead of standardized **HubKPICard** components, lacks historical metrics and trend data integration, has no chart visualizations, and uses non-standard CSS spacing patterns.

**Critical Gap:** Sage Analytics is the only admin page that doesn't use the **useAdminMetric** and **useAdminTrendData** hooks or the hub chart components, making it inconsistent with the rest of the platform.

---

## 🚨 CRITICAL ISSUES

### 1. **No HubKPICard Usage** ❌
Sage uses custom `.statCard` CSS classes instead of the standardized HubKPICard component.

**Listings/Bookings Pattern:**
```tsx
<HubKPIGrid>
  <HubKPICard
    label="Total Listings"
    value={totalListingsMetric.value}
    sublabel={formatMetricChange(
      totalListingsMetric.change,
      totalListingsMetric.changePercent,
      'last_month'
    )}
    icon={FileText}
    trend={totalListingsMetric.trend}
  />
  {/* ... more cards */}
</HubKPIGrid>
```

**Sage Current Implementation:**
```tsx
<div className={styles.statsGrid}>
  <div className={styles.statCard}>
    <h3>Total Sessions</h3>
    <p className={styles.statValue}>{summaryData.totalSessions.toLocaleString()}</p>
    <span className={styles.statLabel}>Learning sessions started</span>
  </div>
  {/* ... more custom cards */}
</div>
```

**Issues:**
- ❌ Custom CSS classes (`.statCard`, `.statValue`, `.statLabel`) instead of standard component
- ❌ No icon support
- ❌ No trend indicators (up/down arrows)
- ❌ No historical comparison data
- ❌ Inconsistent styling with rest of platform
- ❌ Breaks design system consistency

**Impact:** CRITICAL - Users see different card designs on Sage vs other admin pages

---

### 2. **No Historical Metrics Integration** ❌
Sage doesn't use `useAdminMetric` hook, which provides trend data from `platform_statistics_daily`.

**Listings/Bookings Pattern:**
```tsx
// Fetch metrics with automatic trend calculation
const totalListingsMetric = useAdminMetric({
  metric: 'listings_total',
  compareWith: 'last_month'
});

// Get: value, previousValue, change, changePercent, trend
// Automatically shows: "+45 vs last month" with trend arrow
```

**Sage Current Implementation:**
```tsx
// Manual API fetch with no historical comparison
const { data: summaryData } = useQuery({
  queryKey: ['admin', 'sage', 'summary'],
  queryFn: async () => {
    const response = await fetch('/api/admin/sage/analytics?type=summary');
    return data as SummaryStats;
  },
});

// Result: Only current values, no trends or changes
```

**Missing Metrics:**
- ❌ `sage_sessions_total` with trend data
- ❌ `sage_questions_total` with trend data
- ❌ `sage_active_users` with trend data
- ❌ `sage_free_users` with trend data
- ❌ `sage_pro_users` with trend data
- ❌ `sage_pro_revenue` with trend data

**Impact:** CRITICAL - No way to see if Sage usage is growing or declining

---

### 3. **No Trend Charts** ❌
Sage has zero chart components, while Listings/Bookings have multiple visualizations.

**Listings/Bookings Pattern:**
```tsx
<div className={styles.chartsSection}>
  {/* Line chart for trends over time */}
  <HubTrendChart
    data={listingTrendsQuery.data}
    title="Listing Trends"
    subtitle="Last 7 days"
    valueName="Listings"
    lineColor="#3B82F6"
  />

  {/* Bar chart for category breakdown */}
  <HubCategoryBreakdownChart
    data={listingStatusData}
    title="Listing Status Breakdown"
    subtitle="Current distribution"
  />
</div>
```

**Sage Current Implementation:**
```tsx
// NO charts at all
// Only static lists and custom cards
<div className={styles.section}>
  <h2>Popular Subjects</h2>
  <div className={styles.list}>
    {summaryData.topSubjects.map((item, idx) => (
      <div key={idx} className={styles.listItem}>
        <span>{item.subject}</span>
        <span>{item.count} questions</span>
      </div>
    ))}
  </div>
</div>
```

**Missing Charts:**
- ❌ **HubTrendChart** for session trends (7/30 days)
- ❌ **HubTrendChart** for question trends (7/30 days)
- ❌ **HubCategoryBreakdownChart** for subject distribution
- ❌ **HubCategoryBreakdownChart** for tier distribution (Free vs Pro)
- ❌ **HubTrendChart** for revenue trends
- ❌ No visual representation of cost analysis

**Impact:** HIGH - Hard to understand trends, patterns, or changes over time

---

### 4. **No useAdminTrendData Hook** ❌
Sage doesn't fetch historical daily data for visualization.

**Listings/Bookings Pattern:**
```tsx
// Fetches last 7 days from platform_statistics_daily
const bookingTrendsQuery = useAdminTrendData({
  metric: 'bookings_total',
  days: 7
});

// Returns: [{ date, value, label }, ...]
// Ready for HubTrendChart
```

**Sage Current Implementation:**
```tsx
// No trend data fetching
// Only fetches current snapshot from custom API
```

**Impact:** HIGH - Cannot show historical performance

---

### 5. **Non-Standard Loading States** ⚠️
Sage uses custom spinner CSS instead of standard ChartSkeleton component.

**Listings/Bookings Pattern:**
```tsx
{isLoadingCharts ? (
  <ChartSkeleton height="320px" />
) : (
  <HubTrendChart data={...} />
)}
```

**Sage Current Implementation:**
```tsx
{isLoading && (
  <div className={styles.loading}>
    <div className={styles.spinner} />
    <p>Loading analytics...</p>
  </div>
)}

/* Custom CSS */
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-border-light);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

**Issues:**
- ⚠️ Custom spinner implementation
- ⚠️ No ChartSkeleton usage
- ⚠️ Inconsistent loading UX with other pages

**Impact:** MEDIUM - Users see different loading patterns

---

### 6. **Missing CSS Variables** ⚠️
Sage CSS file has no hub layout CSS variables.

**Listings/Bookings Pattern:**
```css
/* Header spacing */
.bookingsHeader {
  --hub-header-margin-top: 1.5rem;
  --hub-header-margin-bottom: 0;
  --hub-header-height: 3rem;
}

/* Tabs spacing */
.bookingsTabs {
  --hub-tabs-margin-top: 3rem;
  --hub-tabs-margin-bottom: 1rem;
}

/* Mobile overrides */
@media (max-width: 767px) {
  .bookingsHeader {
    --hub-header-margin-top: 0rem;
  }
  .bookingsTabs {
    --hub-tabs-margin-top: 0rem;
  }
}
```

**Sage Current Implementation:**
```css
/* NO hub CSS variables */
.content {
  padding: 1.5rem;
}
```

**Impact:** MEDIUM - Inconsistent spacing/margins with other admin pages

---

### 7. **Inconsistent Grid System** ⚠️
Sage uses `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))` instead of standard HubKPIGrid.

**Standard Pattern (HubKPIGrid.module.css):**
```css
.kpiGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

@media (max-width: 1024px) {
  .kpiGrid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .kpiGrid {
    grid-template-columns: 1fr;
  }
}
```

**Sage Implementation:**
```css
.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}
```

**Issues:**
- ⚠️ Uses `auto-fit` which behaves differently
- ⚠️ Custom grid instead of HubKPIGrid component
- ⚠️ May not match exact breakpoints of other pages

**Impact:** MEDIUM - Layout may differ on certain screen sizes

---

### 8. **Custom Section Styling** ⚠️
Sage uses custom `.section` classes not found in Listings/Bookings.

**Sage Implementation:**
```tsx
<div className={styles.section}>
  <h2>Popular Subjects</h2>
  <div className={styles.list}>
    {/* List items */}
  </div>
</div>
```

```css
.section {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
```

**Listings/Bookings Pattern:**
- Use chart components for data visualization
- No custom section wrappers in Overview tab
- `.chartsSection` grid for organizing charts

**Impact:** LOW - Acceptable for non-chart content, but should prefer standard components

---

## ⚠️ MODERATE ISSUES

### 1. **Multiple Tab Content Patterns**
Sage has different layouts for each tab instead of consistent pattern.

**Overview Tab:**
- Custom `.statsGrid` with `.statCard` elements
- Custom `.section` with `.list` elements
- No charts

**Quota Tab:**
- Multiple custom `.section` wrappers
- Each section has its own `.statsGrid`
- Three separate sections with repeated patterns

**Subjects Tab:**
- Single `.statsGrid` with 4 cards
- Very minimal content

**Listings/Bookings Pattern:**
- **Overview Tab:** HubKPIGrid + Charts Section (consistent)
- **All Items Tab:** Table component (consistent)

**Recommendation:** Standardize tab layouts with HubKPIGrid + chartsSection pattern

---

### 2. **No Charts Section Class**
Missing `.chartsSection` for organizing chart components.

**Listings/Bookings CSS:**
```css
.chartsSection {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  margin-top: 2rem;
}

@media (min-width: 768px) {
  .chartsSection {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .chartsSection {
    grid-template-columns: 1fr;
  }
}
```

**Sage Status:** ❌ Not present

**Impact:** LOW - Would be needed when adding charts

---

### 3. **Inconsistent Content Wrapper**
Sage uses `.content` wrapper with padding, not standard in Listings/Bookings.

**Sage:**
```tsx
<HubPageLayout {...}>
  <div className={styles.content}>
    {/* Tab content */}
  </div>
</HubPageLayout>
```

**Listings/Bookings:**
```tsx
<HubPageLayout {...}>
  {/* Direct tab content, no wrapper */}
  {activeTab === 'overview' && (
    <>
      <HubKPIGrid>...</HubKPIGrid>
      <div className={styles.chartsSection}>...</div>
    </>
  )}
</HubPageLayout>
```

**Impact:** LOW - Extra div wrapper may affect spacing

---

## ✅ COMPLIANT AREAS

### 1. **Page Structure** ✓
- **HubPageLayout** with header, tabs, sidebar: ✓
- **ErrorBoundary** wrapper: ✓
- **Force dynamic rendering** (`export const dynamic = 'force-dynamic'`): ✓
- **Tab-based navigation**: ✓ (5 tabs: overview, usage, quota, subjects, subscriptions)

```tsx
<ErrorBoundary>
  <HubPageLayout
    header={<HubHeader title="Sage Analytics" subtitle="..." />}
    tabs={<HubTabs tabs={[...]} onTabChange={...} />}
    sidebar={<HubSidebar>...</HubSidebar>}
  >
    {/* Tab content */}
  </HubPageLayout>
</ErrorBoundary>
```

### 2. **Sidebar Widgets** ✓
Standard 2-widget pattern (Sage uses 2 instead of 3):
1. `AdminStatsWidget` - Quick Stats ✓
2. `AdminTipWidget` - Cost Control tips ✓

Note: Missing `AdminHelpWidget` (Listings/Bookings have 3 widgets)

### 3. **React Query Integration** ✓
- Uses `@tanstack/react-query` with `useQuery`: ✓
- `keepPreviousData` for smooth transitions: ✓
- Proper `staleTime` configuration: ✓
- Conditional fetching with `enabled` option: ✓

### 4. **Icon Consistency** ✓
While not using icons in KPI cards, the header button doesn't use non-standard icons.

**Note:** Should add Lucide icons to KPI cards when refactoring to HubKPICard.

### 5. **Tab Navigation** ✓
- URL-based tab state (`?tab=overview`): ✓
- Proper router usage: ✓
- Clean URL on default tab: ✓

### 6. **Empty States** ✓
Usage tab uses `HubEmptyState`:
```tsx
{tabFilter === 'usage' && (
  <HubEmptyState
    title="Usage Analytics Coming Soon"
    description="Detailed usage patterns, peak times, and session analytics will be available here."
  />
)}
```

### 7. **TypeScript Types** ✓
- Proper type definitions for all data structures: ✓
- TabFilter type: ✓
- Interface definitions for API responses: ✓

---

## 📊 COMPLIANCE SCORECARD

| Category | Score | Status |
|----------|-------|--------|
| Page Structure | 100% | ✅ |
| **HubKPICard Usage** | **0%** | ❌ **CRITICAL** |
| **Historical Metrics (useAdminMetric)** | **0%** | ❌ **CRITICAL** |
| **Trend Data (useAdminTrendData)** | **0%** | ❌ **CRITICAL** |
| **Chart Components** | **0%** | ❌ **CRITICAL** |
| CSS Variables | 0% | ⚠️ |
| Loading States | 40% | ⚠️ |
| Grid System | 60% | ⚠️ |
| Sidebar Widgets | 80% | ✓ |
| Empty States | 100% | ✅ |
| Icon Usage (Lucide) | 50% | ⚠️ |
| TypeScript | 100% | ✅ |
| **Overall Compliance** | **44%** | ❌ **NON-COMPLIANT** |

---

## 🎯 PRIORITY-BASED RECOMMENDATIONS

### 🔴 CRITICAL PRIORITY (Must Fix)

#### 1. Replace Custom Cards with HubKPICard
**Current:** 196-216, 249-268, 276-294, 302-324, 334-353 (all custom `.statCard` usage)

**Action Required:**
```tsx
// Replace all instances of this:
<div className={styles.statCard}>
  <h3>Total Sessions</h3>
  <p className={styles.statValue}>{summaryData.totalSessions.toLocaleString()}</p>
  <span className={styles.statLabel}>Learning sessions started</span>
</div>

// With this:
<HubKPICard
  label="Total Sessions"
  value={sessionsMetric.value}
  sublabel={formatMetricChange(
    sessionsMetric.change,
    sessionsMetric.changePercent,
    'last_month'
  )}
  icon={MessageSquare}
  trend={sessionsMetric.trend}
/>
```

**Benefits:**
- Consistent design with Listings/Bookings
- Automatic trend indicators
- Historical comparison
- Icon support
- Standardized styling

---

#### 2. Implement useAdminMetric Integration
**Current:** Manual API fetching with no historical data

**Action Required:**

**Step 1:** Add Sage metrics to `useAdminMetric.ts`:
```typescript
export type MetricName =
  // ... existing metrics
  // Sage metrics
  | 'sage_sessions_total'
  | 'sage_questions_total'
  | 'sage_active_users'
  | 'sage_free_users'
  | 'sage_pro_users'
  | 'sage_free_limit_hits'
  | 'sage_pro_revenue'
  | 'sage_ai_cost_total'
  | 'sage_cost_per_question';
```

**Step 2:** Update page to use hooks:
```tsx
// Replace custom useQuery calls with useAdminMetric
const sessionsMetric = useAdminMetric({ metric: 'sage_sessions_total', compareWith: 'last_month' });
const questionsMetric = useAdminMetric({ metric: 'sage_questions_total', compareWith: 'last_month' });
const activeUsersMetric = useAdminMetric({ metric: 'sage_active_users', compareWith: 'last_month' });
// ... etc
```

**Step 3:** Create migration to add columns to `platform_statistics_daily`:
```sql
-- Add Sage metrics columns
ALTER TABLE platform_statistics_daily
ADD COLUMN sage_sessions_total INTEGER DEFAULT 0,
ADD COLUMN sage_questions_total INTEGER DEFAULT 0,
ADD COLUMN sage_active_users INTEGER DEFAULT 0,
ADD COLUMN sage_free_users INTEGER DEFAULT 0,
ADD COLUMN sage_pro_users INTEGER DEFAULT 0,
ADD COLUMN sage_free_limit_hits INTEGER DEFAULT 0,
ADD COLUMN sage_pro_revenue INTEGER DEFAULT 0,
ADD COLUMN sage_ai_cost_total NUMERIC(10,4) DEFAULT 0,
ADD COLUMN sage_cost_per_question NUMERIC(10,4) DEFAULT 0;
```

**Step 4:** Update daily statistics job to calculate Sage metrics

---

#### 3. Add HubTrendChart Components
**Current:** No charts at all

**Action Required:**

Add to Overview tab after HubKPIGrid:
```tsx
{/* Charts Section */}
<div className={styles.chartsSection}>
  {/* Session Trends */}
  <HubTrendChart
    data={useAdminTrendData({ metric: 'sage_sessions_total', days: 7 }).data}
    title="Session Trends"
    subtitle="Last 7 days"
    valueName="Sessions"
    lineColor="#3B82F6"
  />

  {/* Question Trends */}
  <HubTrendChart
    data={useAdminTrendData({ metric: 'sage_questions_total', days: 7 }).data}
    title="Question Trends"
    subtitle="Last 7 days"
    valueName="Questions"
    lineColor="#10B981"
  />

  {/* User Tier Distribution */}
  <HubCategoryBreakdownChart
    data={[
      { label: 'Free Users', value: summaryData.freeUsers, color: '#3B82F6' },
      { label: 'Pro Users', value: summaryData.proUsers, color: '#10B981' },
    ]}
    title="User Tier Distribution"
    subtitle="Current breakdown"
  />
</div>
```

**Add CSS:**
```css
/* Charts Section */
.chartsSection {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  margin-top: 2rem;
}

@media (min-width: 768px) {
  .chartsSection {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .chartsSection {
    grid-template-columns: 1fr;
  }
}
```

---

### 🟠 HIGH PRIORITY (Should Fix)

#### 4. Add Standard CSS Variables
**File:** `page.module.css`

**Action Required:**
```css
/* Header */
.sageHeader {
  --hub-header-margin-top: 1.5rem;
  --hub-header-margin-bottom: 0;
  --hub-header-height: 3rem;
  --hub-header-padding-x: 1rem;
  --hub-header-actions-gap: 0.5rem;
  --hub-header-actions-margin-left: 1rem;
}

/* Tabs */
.sageTabs {
  --hub-tabs-margin-top: 3rem;
  --hub-tabs-margin-bottom: 1rem;
}

/* Mobile overrides */
@media (max-width: 767px) {
  .sageHeader {
    --hub-header-margin-top: 0rem;
  }
  .sageTabs {
    --hub-tabs-margin-top: 0rem;
  }
}
```

**Update JSX:**
```tsx
<HubHeader
  title="Sage Analytics"
  subtitle="AI Tutor usage and performance metrics"
  actions={...}
  className={styles.sageHeader}  // Add className
/>

<HubTabs
  tabs={[...]}
  onTabChange={handleTabChange}
  className={styles.sageTabs}  // Add className
/>
```

---

#### 5. Replace Custom Loading with ChartSkeleton
**Current:** Lines 186-191 (custom spinner)

**Action Required:**
```tsx
// Replace custom loading spinner
{isLoading && (
  <div className={styles.loading}>
    <div className={styles.spinner} />
    <p>Loading analytics...</p>
  </div>
)}

// With ChartSkeleton
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';

{isLoading && <ChartSkeleton height="320px" />}
```

**Remove CSS:**
```css
/* Delete these rules */
.loading { ... }
.spinner { ... }
@keyframes spin { ... }
```

---

#### 6. Add Missing AdminHelpWidget
**Current:** Only 2 sidebar widgets (Stats + Tips)

**Action Required:**
```tsx
<HubSidebar>
  <AdminStatsWidget
    title="Quick Stats"
    stats={[...]}
  />

  {/* ADD THIS */}
  <AdminHelpWidget
    title="Sage Analytics Help"
    items={[
      {
        question: 'What are sessions?',
        answer: 'A session represents one continuous conversation with Sage AI tutor.'
      },
      {
        question: 'Why track free tier limits?',
        answer: 'Monitoring limit hits helps identify conversion opportunities to Sage Pro.'
      },
      {
        question: 'How is cost calculated?',
        answer: 'AI costs are based on Gemini API token usage per question and response.'
      },
    ]}
  />

  <AdminTipWidget
    title="Cost Control"
    tips={[...]}
  />
</HubSidebar>
```

---

### 🟡 MEDIUM PRIORITY (Nice to Have)

#### 7. Remove Content Wrapper Div
**Current:** Line 185 (`.content` wrapper)

**Action Required:**
```tsx
// Current
<HubPageLayout {...}>
  <div className={styles.content}>
    {tabFilter === 'overview' && ...}
  </div>
</HubPageLayout>

// Should be (like Listings/Bookings)
<HubPageLayout {...}>
  {tabFilter === 'overview' && (
    <>
      <HubKPIGrid>...</HubKPIGrid>
      <div className={styles.chartsSection}>...</div>
    </>
  )}
  {tabFilter === 'quota' && ...}
</HubPageLayout>
```

---

#### 8. Consolidate Tab Layouts
**Current:** Different patterns for each tab

**Action Required:**

**Overview Tab Structure:**
```tsx
{tabFilter === 'overview' && (
  <>
    <HubKPIGrid>
      {/* 4 main KPI cards */}
    </HubKPIGrid>
    <div className={styles.chartsSection}>
      {/* Charts */}
    </div>
  </>
)}
```

**Quota Tab Structure:**
```tsx
{tabFilter === 'quota' && (
  <>
    <HubKPIGrid>
      {/* All quota KPI cards (12 total) */}
    </HubKPIGrid>
    <div className={styles.chartsSection}>
      {/* Cost analysis charts */}
    </div>
  </>
)}
```

**Subjects Tab Structure:**
```tsx
{tabFilter === 'subjects' && (
  <>
    <HubKPIGrid>
      {/* Subject KPI cards */}
    </HubKPIGrid>
    <div className={styles.chartsSection}>
      <HubCategoryBreakdownChart
        data={subjectDistributionData}
        title="Subject Distribution"
      />
    </div>
  </>
)}
```

---

#### 9. Add Icons to Future KPI Cards
**Action Required:**

Import Lucide icons:
```tsx
import {
  MessageSquare,  // Sessions
  HelpCircle,     // Questions
  Users,          // Active Users
  TrendingUp,     // Avg Questions/Session
  DollarSign,     // Revenue/Costs
  Calendar,       // Usage
  AlertCircle,    // Limit Hits
  BookOpen,       // Subjects
} from 'lucide-react';
```

Use in HubKPICard:
```tsx
<HubKPICard
  label="Total Sessions"
  value={sessionsMetric.value}
  icon={MessageSquare}
  trend={sessionsMetric.trend}
/>
```

---

#### 10. Replace Custom Sections with Chart Components
**Current:** Lines 218-240 (Popular Subjects list), Lines 230-240 (Study Levels list)

**Action Required:**

Replace custom list sections with HubCategoryBreakdownChart:
```tsx
// Replace this:
<div className={styles.section}>
  <h2>Popular Subjects</h2>
  <div className={styles.list}>
    {summaryData.topSubjects.map((item, idx) => (
      <div key={idx} className={styles.listItem}>
        <span className={styles.listLabel}>{item.subject}</span>
        <span className={styles.listValue}>{item.count} questions</span>
      </div>
    ))}
  </div>
</div>

// With this (in chartsSection):
<HubCategoryBreakdownChart
  data={summaryData.topSubjects.map(item => ({
    label: item.subject,
    value: item.count
  }))}
  title="Popular Subjects"
  subtitle="Question distribution by subject"
/>
```

---

### 🟢 LOW PRIORITY (Future Enhancements)

#### 11. Add Subject Breakdown Chart
Add HubCategoryBreakdownChart to Subjects tab:
```tsx
<HubCategoryBreakdownChart
  data={[
    { label: 'Mathematics', value: subjectData.maths, color: '#3B82F6' },
    { label: 'English', value: subjectData.english, color: '#10B981' },
    { label: 'Science', value: subjectData.science, color: '#F59E0B' },
    { label: 'General', value: subjectData.general, color: '#6B7280' },
  ]}
  title="Subject Distribution"
  subtitle="Question breakdown by subject area"
/>
```

#### 12. Add Cost Trend Chart
Add to Quota tab:
```tsx
<HubTrendChart
  data={useAdminTrendData({ metric: 'sage_ai_cost_total', days: 30 }).data}
  title="AI Cost Trends"
  subtitle="Last 30 days"
  valueName="Cost"
  lineColor="#EF4444"
  valueFormatter={(value) => `£${value.toFixed(2)}`}
/>
```

#### 13. Add Revenue Trend Chart
Add to Quota tab:
```tsx
<HubTrendChart
  data={useAdminTrendData({ metric: 'sage_pro_revenue', days: 30 }).data}
  title="Pro Revenue Trends"
  subtitle="Last 30 days"
  valueName="Revenue"
  lineColor="#10B981"
  valueFormatter={(value) => `£${(value / 100).toFixed(0)}`}
/>
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Critical Fixes (Week 1)
- [ ] Add Sage metrics to `MetricName` type in `useAdminMetric.ts`
- [ ] Create database migration for `platform_statistics_daily` columns
- [ ] Update daily statistics job to calculate Sage metrics
- [ ] Replace all custom `.statCard` with `HubKPICard` components
- [ ] Implement `useAdminMetric` hooks in page component
- [ ] Remove custom CSS for cards (`.statCard`, `.statValue`, `.statLabel`, `.statsGrid`)
- [ ] Import and apply `formatMetricChange` utility
- [ ] Add Lucide icons to all KPI cards

### Phase 2: Chart Integration (Week 2)
- [ ] Add `.chartsSection` CSS class
- [ ] Import `HubTrendChart` and `HubCategoryBreakdownChart`
- [ ] Add Session Trends chart to Overview tab
- [ ] Add Question Trends chart to Overview tab
- [ ] Add User Tier Distribution chart to Overview tab
- [ ] Replace Popular Subjects list with HubCategoryBreakdownChart
- [ ] Replace Study Levels list with HubCategoryBreakdownChart
- [ ] Add Subject Distribution chart to Subjects tab
- [ ] Implement `useAdminTrendData` hooks for all charts
- [ ] Add ChartSkeleton loading states

### Phase 3: Layout & Standards (Week 3)
- [ ] Add CSS variables (`.sageHeader`, `.sageTabs`)
- [ ] Apply className to HubHeader component
- [ ] Apply className to HubTabs component
- [ ] Remove `.content` wrapper div
- [ ] Replace custom loading spinner with ChartSkeleton
- [ ] Remove unused CSS (`.loading`, `.spinner`, animation)
- [ ] Add `AdminHelpWidget` to sidebar
- [ ] Consolidate Quota tab into single HubKPIGrid (remove multiple `.section` wrappers)
- [ ] Add Cost Trends chart to Quota tab
- [ ] Add Revenue Trends chart to Quota tab

### Phase 4: Testing & Polish (Week 4)
- [ ] Test all metrics display correctly
- [ ] Verify trend indicators work (up/down/neutral arrows)
- [ ] Ensure charts render properly on all screen sizes
- [ ] Validate loading states (ChartSkeleton appears)
- [ ] Check spacing matches Listings/Bookings exactly
- [ ] Test tab navigation works correctly
- [ ] Verify mobile responsive layout
- [ ] Cross-browser testing
- [ ] Performance audit (ensure no layout shifts)
- [ ] Update any related documentation

---

## 📊 BEFORE/AFTER COMPARISON

### Overview Tab Layout

**BEFORE (Current):**
```
┌─────────────────────────────────────────┐
│ Custom .content wrapper (1.5rem padding)│
│  ┌───────────────────────────────────┐  │
│  │ Custom .statsGrid (4 cards)      │  │
│  │  - No icons                       │  │
│  │  - No trend arrows                │  │
│  │  - No historical comparison       │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ Custom .section                   │  │
│  │ "Popular Subjects" list           │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ Custom .section                   │  │
│  │ "Study Levels" list               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**AFTER (Standard):**
```
┌─────────────────────────────────────────┐
│ No wrapper (direct HubPageLayout)       │
│  ┌───────────────────────────────────┐  │
│  │ HubKPIGrid (4 cards)             │  │
│  │  ✓ Icons (Lucide)                │  │
│  │  ✓ Trend arrows                  │  │
│  │  ✓ "+45 vs last month"           │  │
│  │  ✓ Standard styling              │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ .chartsSection grid              │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │ HubTrendChart               │ │  │
│  │  │ "Session Trends"            │ │  │
│  │  └─────────────────────────────┘ │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │ HubTrendChart               │ │  │
│  │  │ "Question Trends"           │ │  │
│  │  └─────────────────────────────┘ │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │ HubCategoryBreakdownChart   │ │  │
│  │  │ "User Tier Distribution"    │ │  │
│  │  └─────────────────────────────┘ │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🔍 DETAILED CODE EXAMPLES

### Example 1: Overview Tab Refactor

**Before:**
```tsx
{!isLoading && tabFilter === 'overview' && summaryData && (
  <div className={styles.overview}>
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <h3>Total Sessions</h3>
        <p className={styles.statValue}>{summaryData.totalSessions.toLocaleString()}</p>
        <span className={styles.statLabel}>Learning sessions started</span>
      </div>
      {/* ... 3 more cards */}
    </div>

    <div className={styles.section}>
      <h2>Popular Subjects</h2>
      <div className={styles.list}>
        {summaryData.topSubjects.map((item, idx) => (
          <div key={idx} className={styles.listItem}>
            <span className={styles.listLabel}>{item.subject}</span>
            <span className={styles.listValue}>{item.count} questions</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

**After:**
```tsx
{tabFilter === 'overview' && (
  <>
    <HubKPIGrid>
      <HubKPICard
        label="Total Sessions"
        value={sessionsMetric.value}
        sublabel={formatMetricChange(
          sessionsMetric.change,
          sessionsMetric.changePercent,
          'last_month'
        )}
        icon={MessageSquare}
        trend={sessionsMetric.trend}
      />
      <HubKPICard
        label="Total Questions"
        value={questionsMetric.value}
        sublabel={formatMetricChange(
          questionsMetric.change,
          questionsMetric.changePercent,
          'last_month'
        )}
        icon={HelpCircle}
        trend={questionsMetric.trend}
      />
      <HubKPICard
        label="Active Users"
        value={activeUsersMetric.value}
        sublabel={formatMetricChange(
          activeUsersMetric.change,
          activeUsersMetric.changePercent,
          'last_month'
        )}
        icon={Users}
        trend={activeUsersMetric.trend}
      />
      <HubKPICard
        label="Avg Questions/Session"
        value={avgQuestionsMetric.value.toFixed(1)}
        sublabel={formatMetricChange(
          avgQuestionsMetric.change,
          avgQuestionsMetric.changePercent,
          'last_month'
        )}
        icon={TrendingUp}
        trend={avgQuestionsMetric.trend}
      />
    </HubKPIGrid>

    <div className={styles.chartsSection}>
      <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load chart</div>}>
        {isLoadingCharts ? (
          <ChartSkeleton height="320px" />
        ) : (
          <HubTrendChart
            data={sessionTrendsQuery.data}
            title="Session Trends"
            subtitle="Last 7 days"
            valueName="Sessions"
            lineColor="#3B82F6"
          />
        )}
      </ErrorBoundary>

      <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load chart</div>}>
        {isLoadingCharts ? (
          <ChartSkeleton height="320px" />
        ) : (
          <HubCategoryBreakdownChart
            data={summaryData.topSubjects.map(item => ({
              label: item.subject,
              value: item.count
            }))}
            title="Popular Subjects"
            subtitle="Question distribution"
          />
        )}
      </ErrorBoundary>
    </div>
  </>
)}
```

---

### Example 2: Quota Tab Refactor

**Before:**
```tsx
{!isLoading && tabFilter === 'quota' && quotaData && (
  <div className={styles.quotaView}>
    <div className={styles.section}>
      <h2>Free Tier Analytics</h2>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Free Users</h3>
          <p className={styles.statValue}>{quotaData.freeTier.totalUsers}</p>
          <span className={styles.statLabel}>10 questions/day limit</span>
        </div>
        {/* ... 3 more cards */}
      </div>
    </div>

    <div className={styles.section}>
      <h2>Sage Pro Analytics</h2>
      <div className={styles.statsGrid}>
        {/* ... 4 more cards */}
      </div>
    </div>

    <div className={styles.section}>
      <h2>Cost Analysis</h2>
      <div className={styles.statsGrid}>
        {/* ... 4 more cards */}
      </div>
    </div>
  </div>
)}
```

**After:**
```tsx
{tabFilter === 'quota' && (
  <>
    <HubKPIGrid>
      {/* All 12 cards in single grid - NO section wrappers */}
      <HubKPICard
        label="Free Users"
        value={freeUsersMetric.value}
        sublabel={formatMetricChange(
          freeUsersMetric.change,
          freeUsersMetric.changePercent,
          'last_month'
        )}
        icon={Users}
        trend={freeUsersMetric.trend}
      />
      {/* ... 11 more cards */}
    </HubKPIGrid>

    <div className={styles.chartsSection}>
      <HubTrendChart
        data={costTrendsQuery.data}
        title="AI Cost Trends"
        subtitle="Last 30 days"
        valueName="Cost"
        lineColor="#EF4444"
        valueFormatter={(value) => `£${value.toFixed(2)}`}
      />

      <HubTrendChart
        data={revenueTrendsQuery.data}
        title="Pro Revenue Trends"
        subtitle="Last 30 days"
        valueName="Revenue"
        lineColor="#10B981"
        valueFormatter={(value) => `£${(value / 100).toFixed(0)}`}
      />
    </div>
  </>
)}
```

---

## 📝 DATABASE MIGRATION SCRIPT

Create new migration file: `20260225_add_sage_metrics.sql`

```sql
-- Add Sage Analytics metrics to platform_statistics_daily table
-- These columns enable historical trend tracking for Sage AI Tutor

ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS sage_sessions_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_questions_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_active_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_free_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_pro_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_free_limit_hits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_pro_revenue INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_ai_cost_total NUMERIC(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_cost_per_question NUMERIC(10,4) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN platform_statistics_daily.sage_sessions_total IS 'Total Sage AI tutor sessions';
COMMENT ON COLUMN platform_statistics_daily.sage_questions_total IS 'Total questions asked to Sage';
COMMENT ON COLUMN platform_statistics_daily.sage_active_users IS 'Unique users who used Sage';
COMMENT ON COLUMN platform_statistics_daily.sage_free_users IS 'Users on free tier';
COMMENT ON COLUMN platform_statistics_daily.sage_pro_users IS 'Users on Sage Pro subscription';
COMMENT ON COLUMN platform_statistics_daily.sage_free_limit_hits IS 'Free users who hit daily limit';
COMMENT ON COLUMN platform_statistics_daily.sage_pro_revenue IS 'Revenue from Pro subscriptions (pence)';
COMMENT ON COLUMN platform_statistics_daily.sage_ai_cost_total IS 'Total Gemini API cost (GBP)';
COMMENT ON COLUMN platform_statistics_daily.sage_cost_per_question IS 'Average cost per question (GBP)';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_platform_statistics_daily_sage_sessions
  ON platform_statistics_daily(date, sage_sessions_total);
CREATE INDEX IF NOT EXISTS idx_platform_statistics_daily_sage_questions
  ON platform_statistics_daily(date, sage_questions_total);
CREATE INDEX IF NOT EXISTS idx_platform_statistics_daily_sage_revenue
  ON platform_statistics_daily(date, sage_pro_revenue);
```

---

## ✅ CONCLUSION

**Sage Analytics is 44% compliant** with TutorWise hub architecture standards. While it uses the correct layout structure (HubPageLayout + HubTabs + HubSidebar), it has **major deviations** in the core metrics display pattern:

### Critical Issues:
- ❌ **No HubKPICard usage** - Uses custom CSS cards instead
- ❌ **No historical metrics** - Doesn't use useAdminMetric hook
- ❌ **No trend data** - Doesn't use useAdminTrendData hook
- ❌ **No chart components** - No HubTrendChart or HubCategoryBreakdownChart

### Impact:
- Users see inconsistent designs across admin pages
- No way to track trends over time (growing vs declining)
- Missing visual data representation
- Harder to spot patterns and anomalies

### Required Actions:
1. **CRITICAL:** Replace all custom cards with HubKPICard (Week 1)
2. **CRITICAL:** Implement useAdminMetric integration (Week 1)
3. **CRITICAL:** Add chart components for visualization (Week 2)
4. **HIGH:** Add standard CSS variables and loading states (Week 3)
5. **MEDIUM:** Consolidate tab layouts and remove custom wrappers (Week 3)

### Timeline:
- **Phase 1 (Week 1):** Critical fixes - Replace cards, add metrics
- **Phase 2 (Week 2):** Chart integration - Add all visualizations
- **Phase 3 (Week 3):** Standards compliance - CSS, layout, widgets
- **Phase 4 (Week 4):** Testing and polish

**Estimated effort:** 3-4 weeks for full compliance

**Status:** ⚠️ **REQUIRES REFACTORING** - Cannot approve for production in current state

**Next Steps:** Prioritize Critical fixes (Phase 1) to achieve minimum compliance, then add charts and polish.

---

**Audit completed:** 2026-02-25
**Auditor:** Claude Sonnet 4.5
**Approved by:** [Pending review]
