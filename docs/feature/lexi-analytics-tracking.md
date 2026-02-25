# Lexi Analytics → Sage Analytics Alignment Tracking

**Goal**: Make Lexi Analytics nearly identical to Sage Analytics in structure, patterns, and compliance

**Target**: 100% Hub Architecture Compliance
**Current Lexi Compliance**: 45/100 (Failing)
**Target Sage Compliance**: 100/100 (Passing)

---

## 1. FILE STRUCTURE COMPARISON

| Aspect | Sage (✅ Target) | Lexi (❌ Current) | Action Required |
|--------|------------------|-------------------|-----------------|
| **Main Page** | `/admin/sage/page.tsx` (649 lines) | `/admin/lexi/page.tsx` (695 lines) | ✅ Exists, needs refactor |
| **CSS Module** | `/admin/sage/page.module.css` (minimal) | `/admin/lexi/page.module.css` (extensive custom) | 🔧 Remove custom styles |
| **API Route** | `/api/admin/sage/analytics/route.ts` | `/api/admin/lexi/analytics/route.ts` | 🔧 Simplify (remove if using metrics) |
| **Database Table** | `platform_statistics_daily` | Direct queries to `lexi_conversations` | ❌ **Add Lexi columns to stats table** |
| **Aggregation Function** | `aggregate_sage_statistics()` | ❌ None | ❌ **Create `aggregate_lexi_statistics()`** |
| **Cron Job** | jobid 54, daily at midnight | ❌ None | ❌ **Schedule daily Lexi stats collection** |
| **Sub-components** | `SageProSubscriptionsTable.tsx` | ❌ None | ✅ N/A (Lexi has no subscriptions) |

---

## 2. IMPORTS COMPARISON

### Sage Imports (✅ Target):
```typescript
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart, type CategoryData } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import { useAdminTrendData } from '@/hooks/useAdminTrendData';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import { Bot, Users, MessageSquare, DollarSign, TrendingUp, BookOpen, Clock, AlertTriangle } from 'lucide-react';
```

### Lexi Imports (❌ Current):
```typescript
import { HubKPIGrid, HubKPICard } from '@/app/components/hub/charts'; // ❌ Missing HubTrendChart, HubCategoryBreakdownChart
// ❌ NO useAdminMetric hook
// ❌ NO useAdminTrendData hook
// ❌ NO formatMetricChange helper
// ❌ NO ChartSkeleton
// ❌ NO CategoryData type
```

**ACTION**: Add missing imports to match Sage exactly

---

## 3. TAB STRUCTURE COMPARISON

| Tab Name | Sage | Lexi | Alignment Status |
|----------|------|------|-----------------|
| **Overview** | ✅ 8 KPICards + 3 Charts | ❌ 4 KPICards + Custom sections | 🔧 Needs charts, more KPIs |
| **Usage** | ✅ Empty state (planned) | ❌ N/A | ➖ Different feature sets |
| **Quota & Costs** | ✅ 12 KPICards (3 sections) | ✅ 12 KPICards (1 section) | 🔧 Needs historical metrics |
| **Subjects** | ✅ 4 KPICards + Chart | ❌ N/A | ➖ Lexi doesn't track subjects |
| **Subscriptions** | ✅ Table component | ❌ N/A | ➖ Lexi has no subscriptions |
| **Conversations** | ❌ N/A | ❌ Empty state | ➖ Different features |
| **Feedback** | ❌ N/A | ❌ 3 KPICards + Empty state | ➖ Lexi-specific feature |
| **Providers** | ❌ N/A | ❌ Custom provider UI | ➖ Lexi-specific feature |

**Lexi-Specific Tabs** (Keep, but make Hub-compliant):
- **Feedback**: Unique to Lexi, but needs Hub compliance (charts, historical data)
- **Providers**: Unique to Lexi, keep as-is (provider switching functionality)
- **Conversations**: Unique to Lexi, currently empty state

---

## 4. DATA FETCHING PATTERNS

### Sage Pattern (✅ Target):
```typescript
// Uses historical metrics from platform_statistics_daily
const sessionsMetric = useAdminMetric({ metric: 'sage_sessions_total', compareWith: 'last_month' });
const questionsMetric = useAdminMetric({ metric: 'sage_questions_total', compareWith: 'last_month' });
// ... 21 more metrics

// Uses trend data for charts
const sessionsTrendsQuery = useAdminTrendData({ metric: 'sage_sessions_total', days: 7 });
const questionsTrendsQuery = useAdminTrendData({ metric: 'sage_questions_total', days: 7 });
```

### Lexi Pattern (❌ Current):
```typescript
// Direct API queries (bypasses Hub metrics)
const { data: summaryData } = useQuery({
  queryKey: ['admin', 'lexi', 'summary'],
  queryFn: async () => {
    const response = await fetch('/api/admin/lexi/analytics?type=summary'); // ❌ Custom API
    return data.stats as SummaryStats;
  },
});

// No historical comparison
// No trend data
// No useAdminMetric
```

**ACTION**: Replace ALL API queries with `useAdminMetric()` and `useAdminTrendData()` hooks

---

## 5. OVERVIEW TAB COMPARISON

### Sage Overview (✅ Target):

**KPI Cards (8 total)**:
1. Total Sessions (with trend)
2. Total Questions (with trend)
3. Unique Users (with trend)
4. Avg Questions/Session (calculated, with comparison)
5. Free Users (with trend)
6. Pro Users (with trend)
7. Pro Subscriptions (with trend)
8. Monthly Recurring Revenue (with trend)

**Charts Section**:
- Session Trends (HubTrendChart, 7 days)
- Questions Trends (HubTrendChart, 7 days)
- User Type Breakdown (HubCategoryBreakdownChart)

**Additional Sections**:
- Popular Subjects (list, from API)
- Study Levels (list, from API)

### Lexi Overview (❌ Current):

**KPI Cards (4 total)** - ❌ MISSING TRENDS:
1. Total Conversations (no trend)
2. Total Messages (no trend)
3. Unique Users (no trend)
4. Avg Messages/Conv (no trend)

**Custom Sections** - ❌ NOT USING HUB COMPONENTS:
- Persona Distribution (custom CSS grid, NOT HubCategoryBreakdownChart)
- Top Intents (custom list)

**Charts Section**: ❌ MISSING ENTIRELY

**ACTION ITEMS**:
- [ ] Add 4 more KPI cards to match Sage (8 total)
- [ ] Add `useAdminMetric()` to all KPI cards
- [ ] Add trend indicators (arrows, % change)
- [ ] Add historical comparison sublabels
- [ ] Replace Persona Distribution with `HubCategoryBreakdownChart`
- [ ] Add Conversations Trends Chart (HubTrendChart)
- [ ] Add Messages Trends Chart (HubTrendChart)
- [ ] Wrap charts in ErrorBoundary
- [ ] Add ChartSkeleton loading states

---

## 6. QUOTA & COSTS TAB COMPARISON

### Sage Quota & Costs (✅ Target):

**Structure**: 3 sections with section headers
```typescript
<div className={styles.section}><h2>Free Tier Analytics</h2></div>
<HubKPIGrid>
  // 4 cards
</HubKPIGrid>

<div className={styles.section}><h2>Sage Pro Analytics</h2></div>
<HubKPIGrid>
  // 4 cards
</HubKPIGrid>

<div className={styles.section}><h2>Cost Analysis</h2></div>
<HubKPIGrid>
  // 4 cards
</HubKPIGrid>
```

**All 12 cards have**:
- ✅ Historical metrics (`useAdminMetric`)
- ✅ Trend indicators (arrows)
- ✅ "vs last month" sublabels
- ✅ Appropriate icons

### Lexi Quota & Costs (❌ Current):

**Structure**: 1 giant HubKPIGrid with 12 cards
```typescript
<HubKPIGrid>
  // All 12 cards in one grid
</HubKPIGrid>
```

**Cards have**:
- ❌ No historical metrics
- ❌ No trend indicators
- ❌ No "vs last month" sublabels
- ✅ Appropriate icons (good!)
- ✅ Correct number (12 cards)

**ACTION ITEMS**:
- [ ] Restructure into 3 sections with headers (match Sage)
- [ ] Add `useAdminMetric()` to all 12 cards
- [ ] Add trend indicators and historical comparisons
- [ ] Group cards logically:
  - Section 1: Free Tier (4 cards)
  - Section 2: Provider Usage (4 cards)
  - Section 3: Cost Analysis (4 cards)

---

## 7. METRICS TRACKING - DATABASE SCHEMA

### Metrics to Add to `platform_statistics_daily`:

```sql
-- Core Metrics (7 columns) - Match Sage pattern
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS lexi_conversations_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_messages_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_unique_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_avg_messages_per_conversation NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_feedback_positive INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_feedback_negative INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_satisfaction_rate NUMERIC(5,2) DEFAULT 0;

-- Persona Breakdown (5 columns)
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS lexi_persona_student INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_persona_tutor INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_persona_client INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_persona_agent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_persona_organisation INTEGER DEFAULT 0;

-- Provider Usage (3 columns)
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS lexi_provider_rules INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_provider_claude INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_provider_gemini INTEGER DEFAULT 0;

-- Quota Metrics (4 columns)
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS lexi_daily_usage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_limit_hits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_total_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_avg_conversations_per_user NUMERIC(10,2) DEFAULT 0;

-- Cost Metrics (3 columns)
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS lexi_ai_cost_total NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_cost_per_conversation NUMERIC(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_free_usage_percent NUMERIC(5,2) DEFAULT 0;
```

**TOTAL: 25 Lexi metrics columns**

---

## 8. AGGREGATION FUNCTION

### Required Function (Similar to Sage):

```sql
CREATE OR REPLACE FUNCTION aggregate_lexi_statistics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Core metrics (7)
  v_conversations_total INTEGER;
  v_messages_total INTEGER;
  v_unique_users INTEGER;
  v_avg_messages_per_conversation NUMERIC(10,2);
  v_feedback_positive INTEGER;
  v_feedback_negative INTEGER;
  v_satisfaction_rate NUMERIC(5,2);

  -- Persona metrics (5)
  v_persona_student INTEGER;
  v_persona_tutor INTEGER;
  v_persona_client INTEGER;
  v_persona_agent INTEGER;
  v_persona_organisation INTEGER;

  -- Provider metrics (3)
  v_provider_rules INTEGER;
  v_provider_claude INTEGER;
  v_provider_gemini INTEGER;

  -- Quota metrics (4)
  v_daily_usage INTEGER;
  v_limit_hits INTEGER;
  v_total_users INTEGER;
  v_avg_conversations_per_user NUMERIC(10,2);

  -- Cost metrics (3)
  v_ai_cost_total NUMERIC(10,2);
  v_cost_per_conversation NUMERIC(10,4);
  v_free_usage_percent NUMERIC(5,2);

  v_result jsonb;
BEGIN
  -- Query lexi_conversations and lexi_messages tables
  -- Similar structure to Sage's aggregate_sage_statistics()

  -- INSERT INTO platform_statistics_daily with all 25 metrics
  -- RETURN summary jsonb
END;
$$;
```

**ACTION**: Create this function matching Sage's pattern

---

## 9. CRON JOB SCHEDULE

### Required Cron Job:

```sql
SELECT cron.schedule(
  'aggregate-lexi-statistics',
  '0 0 * * *',
  $$SELECT aggregate_lexi_statistics(CURRENT_DATE);$$
);
```

**ACTION**: Schedule daily Lexi stats collection (will get new jobid)

---

## 10. COMPONENT USAGE COMPARISON

| Component | Sage Usage | Lexi Usage | Status |
|-----------|------------|------------|--------|
| **HubKPICard** | 8 cards (Overview), 12 cards (Quota) | 4 cards (Overview), 12 cards (Quota), 3 cards (Feedback) | 🔧 Needs trend props |
| **HubKPIGrid** | ✅ Used everywhere | ✅ Used everywhere | ✅ Good |
| **HubTrendChart** | ✅ 2 charts (Overview) | ❌ Not used | ❌ **Add 2 charts** |
| **HubCategoryBreakdownChart** | ✅ 1 chart (User Type) | ❌ Not used | ❌ **Add 1 chart** |
| **ErrorBoundary** | ✅ Wraps all charts | ❌ Only wraps page | 🔧 Wrap each chart |
| **ChartSkeleton** | ✅ Loading states | ❌ Not used | 🔧 Add loading skeletons |
| **useAdminMetric** | ✅ 16 hooks | ❌ 0 hooks | ❌ **Add ~20 hooks** |
| **useAdminTrendData** | ✅ 2 hooks | ❌ 0 hooks | ❌ **Add 2 hooks** |
| **formatMetricChange** | ✅ Used everywhere | ❌ Not used | ❌ **Use in sublabels** |

---

## 11. VISUAL LAYOUT COMPARISON

### Sage Overview Layout:
```
┌─────────────────────────────────────────┐
│ Header + Tabs                           │
├─────────────────────────────┬───────────┤
│                             │           │
│ HubKPIGrid (8 cards)        │ Sidebar   │
│ - 2 rows, 4 columns         │ - Stats   │
│                             │ - Help    │
├─────────────────────────────┤ - Tips    │
│ Charts Section (Grid 3 col) │           │
│ ┌────┐ ┌────┐ ┌────┐        │           │
│ │Ch1 │ │Ch2 │ │Ch3 │        │           │
│ └────┘ └────┘ └────┘        │           │
├─────────────────────────────┤           │
│ Lists Section               │           │
│ - Popular Subjects          │           │
│ - Study Levels              │           │
└─────────────────────────────┴───────────┘
```

### Lexi Overview Layout (Current):
```
┌─────────────────────────────────────────┐
│ Header + Tabs                           │
├─────────────────────────────┬───────────┤
│                             │           │
│ HubKPIGrid (4 cards)        │ Sidebar   │
│ - 1 row, 4 columns          │ - Stats   │
│                             │ - Help    │
├─────────────────────────────┤ - Tips    │
│ ❌ NO CHARTS SECTION        │           │
│                             │           │
├─────────────────────────────┤           │
│ Custom Sections (CSS)       │           │
│ - Persona Distribution      │           │
│ - Top Intents               │           │
└─────────────────────────────┴───────────┘
```

**ACTION**: Add charts section, match Sage layout

---

## 12. CODE STRUCTURE COMPARISON

### Sage Structure (✅ Target):
```typescript
export default function SageAnalyticsPage() {
  // Hooks section (all at top, before any conditions)
  const sessionsMetric = useAdminMetric({ metric: 'sage_sessions_total', ... });
  const questionsMetric = useAdminMetric({ metric: 'sage_questions_total', ... });
  // ... 21 more metric hooks

  const sessionsTrendsQuery = useAdminTrendData({ metric: 'sage_sessions_total', days: 7 });
  const questionsTrendsQuery = useAdminTrendData({ metric: 'sage_questions_total', days: 7 });

  const userTypeData: CategoryData[] = [ ... ];

  // Only 1 query for additional data (summaryData for lists)
  const { data: summaryData } = useQuery({ ... });

  // Format functions
  const formatCurrency = (amount: number) => { ... };

  return (
    <HubPageLayout>
      {tabFilter === 'overview' && (
        <>
          <HubKPIGrid>
            <HubKPICard ... with trend />
            // ... 8 cards
          </HubKPIGrid>

          <div className={styles.chartsSection}>
            <ErrorBoundary><HubTrendChart /></ErrorBoundary>
            <ErrorBoundary><HubTrendChart /></ErrorBoundary>
            <ErrorBoundary><HubCategoryBreakdownChart /></ErrorBoundary>
          </div>

          {summaryData && (
            <div className={styles.section}>
              // Lists from API
            </div>
          )}
        </>
      )}
    </HubPageLayout>
  );
}
```

### Lexi Structure (❌ Current):
```typescript
export default function LexiAnalyticsPage() {
  // ❌ NO metric hooks

  // ❌ 3 separate API queries
  const { data: summaryData } = useQuery({ ... });
  const { data: breakdownData } = useQuery({ ... });
  const { data: quotaData } = useQuery({ ... });

  // ❌ Passes data to sub-components instead of using metrics directly
  return (
    <HubPageLayout>
      {tabFilter === 'overview' && (
        <OverviewTab summaryData={summaryData} breakdownData={breakdownData} />
      )}
    </HubPageLayout>
  );
}

// ❌ Sub-component pattern (not used in Sage)
function OverviewTab({ summaryData, breakdownData }: Props) {
  return (
    <>
      <HubKPIGrid>
        <HubKPICard value={summaryData?.totalConversations || 0} /> // ❌ No trend
        // ... 4 cards
      </HubKPIGrid>

      {/* ❌ Custom sections instead of charts */}
      <div className={styles.section}>
        <div className={styles.distributionGrid}>
          // Custom CSS rendering
        </div>
      </div>
    </>
  );
}
```

**ACTION**: Flatten structure, remove sub-components, add metric hooks at top level

---

## 13. SIDEBAR COMPARISON

### Sage Sidebar (✅ Target):
```typescript
<HubSidebar>
  <AdminStatsWidget
    title="Quick Stats"
    stats={[
      { label: 'Total Questions', value: questionsMetric.value },
      { label: 'Total Sessions', value: sessionsMetric.value },
      { label: 'Active Users', value: uniqueUsersMetric.value },
      { label: 'Pro Subscriptions', value: proSubscriptionsMetric.value },
    ]}
  />
  <AdminTipWidget
    title="Cost Control"
    tips={[
      'Monitor free tier usage to control AI costs',
      'Track Pro subscriptions for revenue growth',
      'Review subject breakdown to optimize content',
      'Promote upgrades when users hit daily limits',
    ]}
  />
</HubSidebar>
```

### Lexi Sidebar (❌ Current):
```typescript
<HubSidebar>
  <AdminStatsWidget
    title="Quick Stats"
    stats={summaryData ? [ // ❌ Uses summaryData (API query), not metrics
      { label: 'Total Conversations', value: summaryData.totalConversations },
      { label: 'Total Messages', value: summaryData.totalMessages },
      { label: 'Unique Users', value: summaryData.uniqueUsers },
      { label: 'Avg Messages/Conv', value: summaryData.avgMessagesPerConversation },
      { label: 'Satisfaction Rate', value: `${feedbackRate}%`, valueColor: ... },
    ] : [ ... ]}
  />
  <AdminHelpWidget ... /> // ✅ Has help widget (good!)
  <AdminTipWidget ... /> // ✅ Has tips widget (good!)
</HubSidebar>
```

**ACTION**: Replace API data with metric hook values in sidebar

---

## 14. LOADING STATES COMPARISON

### Sage Loading (✅ Target):
```typescript
{isLoadingCharts ? (
  <ChartSkeleton height="320px" />
) : (
  <HubTrendChart data={sessionsTrendsQuery.data} ... />
)}
```

### Lexi Loading (❌ Current):
```typescript
if (isLoading) {
  return <div className={styles.loading}>Loading analytics...</div>; // ❌ Plain text
}
```

**ACTION**: Replace all plain text loading with `ChartSkeleton` components

---

## 15. ERROR HANDLING COMPARISON

### Sage Error Handling (✅ Target):
```typescript
<ErrorBoundary fallback={<div style={{ padding: '2rem', ... }}>Unable to load chart</div>}>
  <HubTrendChart ... />
</ErrorBoundary>
```

### Lexi Error Handling (❌ Current):
```typescript
<ErrorBoundary>
  {/* Entire page wrapped, but no granular chart error boundaries */}
</ErrorBoundary>
```

**ACTION**: Add ErrorBoundary around each chart with descriptive fallback

---

## 16. IMPLEMENTATION PHASES

### PHASE 1: Database Foundation (CRITICAL)
**Estimated Time**: 2-3 hours

- [ ] **1.1** Add 25 Lexi metrics columns to `platform_statistics_daily`
- [ ] **1.2** Create `aggregate_lexi_statistics()` function
- [ ] **1.3** Schedule daily cron job for Lexi stats
- [ ] **1.4** Test function manually
- [ ] **1.5** Verify data collection for 1 day

**Deliverable**: Lexi historical data infrastructure complete

---

### PHASE 2: Frontend Data Layer (CRITICAL)
**Estimated Time**: 3-4 hours

- [ ] **2.1** Add missing imports (HubTrendChart, HubCategoryBreakdownChart, CategoryData, useAdminMetric, useAdminTrendData, formatMetricChange, ChartSkeleton)
- [ ] **2.2** Replace ALL API queries with `useAdminMetric()` hooks (~20 hooks)
- [ ] **2.3** Add 2 `useAdminTrendData()` hooks for charts
- [ ] **2.4** Create CategoryData for persona breakdown
- [ ] **2.5** Remove sub-component pattern (flatten to main component)
- [ ] **2.6** Update sidebar to use metric values instead of API data

**Deliverable**: Lexi uses Hub metrics system

---

### PHASE 3: Overview Tab Charts (HIGH PRIORITY)
**Estimated Time**: 2-3 hours

- [ ] **3.1** Add 4 more KPI cards to Overview (total 8, matching Sage)
- [ ] **3.2** Add trend indicators to all Overview KPI cards
- [ ] **3.3** Add historical comparison sublabels
- [ ] **3.4** Create charts section div
- [ ] **3.5** Add Conversations Trends Chart (HubTrendChart)
- [ ] **3.6** Add Messages Trends Chart (HubTrendChart)
- [ ] **3.7** Replace persona distribution with HubCategoryBreakdownChart
- [ ] **3.8** Wrap each chart in ErrorBoundary
- [ ] **3.9** Add ChartSkeleton loading states

**Deliverable**: Overview tab matches Sage visual design

---

### PHASE 4: Quota & Costs Tab Refactor (HIGH PRIORITY)
**Estimated Time**: 1-2 hours

- [ ] **4.1** Restructure into 3 sections with headers
- [ ] **4.2** Add `useAdminMetric()` to all 12 cards
- [ ] **4.3** Add trend indicators to all cards
- [ ] **4.4** Add historical comparison sublabels
- [ ] **4.5** Group cards logically (Free Tier, Provider Usage, Cost Analysis)

**Deliverable**: Quota tab matches Sage pattern

---

### PHASE 5: Feedback Tab Enhancement (MEDIUM PRIORITY)
**Estimated Time**: 1-2 hours

- [ ] **5.1** Add `useAdminMetric()` to 3 feedback cards
- [ ] **5.2** Add trend indicators
- [ ] **5.3** Add Feedback Trends Chart (HubTrendChart)
- [ ] **5.4** Consider adding Feedback Breakdown Chart

**Deliverable**: Feedback tab has historical data and charts

---

### PHASE 6: Providers Tab Enhancement (LOW PRIORITY)
**Estimated Time**: 1 hour

- [ ] **6.1** Add `useAdminMetric()` for provider usage
- [ ] **6.2** Replace custom bar chart with HubCategoryBreakdownChart
- [ ] **6.3** Keep provider switching UI (Lexi-specific feature)

**Deliverable**: Providers tab uses Hub components

---

### PHASE 7: CSS Cleanup (POLISH)
**Estimated Time**: 30 minutes

- [ ] **7.1** Remove custom .section styles
- [ ] **7.2** Remove custom .distributionGrid styles
- [ ] **7.3** Remove custom .intentList styles
- [ ] **7.4** Keep only Hub-compatible styles
- [ ] **7.5** Add .chartsSection style (matches Sage)

**Deliverable**: Minimal custom CSS, Hub components provide styling

---

### PHASE 8: Documentation (FINAL)
**Estimated Time**: 1 hour

- [ ] **8.1** Create migration SQL file
- [ ] **8.2** Document all 25 Lexi metrics
- [ ] **8.3** Add verification queries
- [ ] **8.4** Update Lexi feature docs
- [ ] **8.5** Create compliance report

**Deliverable**: Complete documentation for Lexi analytics refactor

---

## 17. SUCCESS CRITERIA

Lexi Analytics will be considered **identical to Sage** when:

### Data Architecture ✅
- [ ] Uses `platform_statistics_daily` table (not direct queries)
- [ ] Has daily aggregation function (`aggregate_lexi_statistics()`)
- [ ] Has scheduled cron job for automatic data collection
- [ ] All metrics use `useAdminMetric()` hook
- [ ] Trend data uses `useAdminTrendData()` hook

### Visual Components ✅
- [ ] Overview tab has 8 KPI cards (not 4)
- [ ] All KPI cards show trend indicators (arrows)
- [ ] All KPI cards show historical comparison ("vs last month")
- [ ] Has 2 HubTrendChart components (conversations, messages)
- [ ] Has 1 HubCategoryBreakdownChart (persona distribution)
- [ ] All charts wrapped in ErrorBoundary
- [ ] All loading states use ChartSkeleton

### Code Structure ✅
- [ ] No sub-component pattern (flat structure like Sage)
- [ ] All hooks at top level (before any conditions)
- [ ] No direct API queries for metrics (use hooks)
- [ ] Minimal custom CSS (Hub components provide styling)
- [ ] Sidebar uses metric values (not API data)

### User Experience ✅
- [ ] Month-over-month comparisons visible on all metrics
- [ ] Visual trend charts show patterns over time
- [ ] Consistent styling with Sage/Bookings/Listings
- [ ] Professional polish (skeletons, error boundaries)

---

## 18. COMPLIANCE SCORE TARGETS

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| **Overall Compliance** | 45/100 | 100/100 | Match Sage exactly |
| **Data Architecture** | 10/100 | 100/100 | Critical - use Hub metrics |
| **Visual Components** | 40/100 | 100/100 | Add charts, trends |
| **Code Structure** | 60/100 | 100/100 | Flatten, use hooks |
| **UX Polish** | 50/100 | 100/100 | Skeletons, boundaries |

---

## 19. UNIQUE LEXI FEATURES TO PRESERVE

These features are **Lexi-specific** and should be kept (but made Hub-compliant):

1. **Feedback Tab** - Track positive/negative feedback (unique to Lexi)
2. **Providers Tab** - Switch between Rules/Claude/Gemini (unique to Lexi)
3. **Persona Distribution** - Student/Tutor/Client/Agent/Org (unique to Lexi)
4. **Top Intents** - Track what users are asking about (unique to Lexi)

**These are GOOD features** - just need to use Hub components and historical data!

---

## 20. FILES TO MODIFY

### Database:
- [ ] `docs/database/migrations/add-lexi-statistics-columns.sql` (create)

### Frontend:
- [ ] `apps/web/src/app/(admin)/admin/lexi/page.tsx` (major refactor)
- [ ] `apps/web/src/app/(admin)/admin/lexi/page.module.css` (cleanup)

### API (Optional):
- [ ] `apps/web/src/app/api/admin/lexi/analytics/route.ts` (simplify or remove)

### Documentation:
- [ ] `docs/feature/lexi-analytics-compliance-report.md` (create)

---

## SUMMARY

**Total Work**: ~16-20 hours across 8 phases
**Priority**: HIGH (Lexi is admin-facing, needs professional UX)
**Risk**: LOW (Sage pattern is proven, just replicate)
**Impact**: HIGH (Consistent admin experience, better insights)

**Key Insight**: Lexi has 695 lines of custom code doing LESS than Sage's 649 lines using Hub components. Refactoring will **reduce code** while **increasing functionality**.

---

**Next Step**: Start with Phase 1 (Database Foundation) to establish historical data collection, then Phase 2 (Frontend Data Layer) to switch from API queries to Hub metrics hooks.
