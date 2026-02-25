# Admin AI Tutor Studio - Solution Design

**Created:** 2026-02-25
**Status:** Phase 1 Complete, Phase 2 In Progress
**Owner:** Platform Team

---

## 🎯 **Vision**

Enable platform admins to create, manage, and optimize platform-owned AI tutors that compete in the marketplace alongside user-created AI tutors, with full analytics and control capabilities.

---

## 📋 **Table of Contents**

1. [Business Goals](#business-goals)
2. [System Architecture](#system-architecture)
3. [Implementation Phases](#implementation-phases)
4. [Technical Decisions](#technical-decisions)
5. [Security & Permissions](#security--permissions)
6. [Data Model](#data-model)
7. [UI/UX Patterns](#uiux-patterns)
8. [Success Metrics](#success-metrics)

---

## 💼 **Business Goals**

### **Primary Goals:**
1. **Revenue Generation** - Platform tutors generate 100% revenue (no commission split)
2. **Market Gap Filling** - Create AI tutors for underserved subjects/levels
3. **Quality Baseline** - Set quality standards through platform examples
4. **Strategic Control** - Ability to feature, price, and prioritize platform offerings

### **Secondary Goals:**
1. **User Retention** - Free/low-cost platform tutors attract new users
2. **Data Collection** - Platform tutors provide benchmarking data
3. **Brand Differentiation** - Showcase platform AI capabilities

---

## 🏗️ **System Architecture**

### **High-Level Components**

```
┌─────────────────────────────────────────────────────────┐
│                    Admin Interface                       │
│  /admin/ai-tutors (Management + Analytics + Creation)   │
└─────────────────────────────────────────────────────────┘
                            │
                            ├─ Create Platform AI Tutors
                            ├─ Manage All AI Tutors
                            ├─ Analytics Dashboard
                            ├─ Feature/Prioritize
                            └─ Monitor Performance
                            │
┌─────────────────────────────────────────────────────────┐
│                   Database Layer                         │
│  ai_tutors (is_platform_owned, is_featured, priority)   │
│  platform_statistics_daily (metrics collection)         │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                 Marketplace (Public)                     │
│  Featured section, Search results, AI Tutor pages       │
└─────────────────────────────────────────────────────────┘
```

### **Data Flow**

```
Admin Creates Platform AI Tutor
    ↓
API validates admin role (is_admin = true)
    ↓
Sets is_platform_owned = true
    ↓
Bypasses CaaS limits
    ↓
Appears in marketplace with ⭐ badge
    ↓
Sessions generate revenue (100% platform)
    ↓
Metrics collected to platform_statistics_daily
    ↓
Analytics dashboard shows performance
```

---

## 📅 **Implementation Phases**

### **✅ Phase 1: Foundation (Complete)**
**Status:** Deployed
**Duration:** 1 week

**Delivered:**
- ✅ Admin AI Tutor Studio page (`/admin/ai-tutors`)
- ✅ 3 tabs: Overview, All AI Tutors, Create New
- ✅ Platform ownership flag (`is_platform_owned`)
- ✅ Database migration + RLS policies
- ✅ Admin navigation links
- ✅ Basic metrics (4 KPI cards, 1 chart)
- ✅ Form reuse (AITutorBuilderForm)
- ✅ Table with filters, search, bulk actions

**Files:**
- 11 new files created
- 3 files updated
- 1 database migration
- Full documentation

---

### **🟡 Phase 2A: Quick Wins (In Progress)**
**Priority:** High
**Estimated Effort:** Low (2-3 days)

#### **Feature 1: Featured AI Tutors**
**Goal:** Highlight platform AI tutors on homepage

**Components:**
- Database: `is_featured` boolean column
- Admin UI: Toggle button in AI Tutors table
- Homepage: Featured section with 4-6 tutors
- Query: Filter by `is_featured = true AND status = 'published'`

**User Experience:**
```
Homepage Visitor:
↓
Sees "Featured AI Tutors" section
↓
Clicks featured platform tutor
↓
Books session
```

**Admin Experience:**
```
Admin navigates to AI Tutors table
↓
Clicks "Feature" button on a tutor
↓
Tutor appears in homepage featured section
```

#### **Feature 2: Priority Ranking**
**Goal:** Control marketplace search order

**Components:**
- Database: `priority_rank` integer column (default 0)
- Admin UI: Priority input in AI Tutors table
- Search: ORDER BY priority_rank DESC, created_at DESC
- Visual: Show rank indicator in admin table

**Usage:**
- Higher rank = appears higher in search results
- Same rank = falls back to created_at
- Allows strategic positioning of platform tutors

---

### **🟡 Phase 2B: Analytics Dashboard (In Progress)**
**Priority:** High
**Estimated Effort:** Medium (3-4 days)

**Goal:** Match admin listings analytics pattern

**Current State:**
- ❌ 4 simplified KPI cards (no trends)
- ❌ 1 static chart (ownership breakdown)
- ❌ No historical metrics
- ❌ Placeholder for missing charts

**Target State:**
- ✅ 8 KPI cards with month-over-month trends
- ✅ 4 charts (growth, sessions, revenue, ownership)
- ✅ Historical metrics from platform_statistics_daily
- ✅ Trend indicators (↑↓) on all cards

**Components:**
1. **Metrics Collection** (Backend)
   - Add AI tutor metrics to daily stats aggregation
   - Collect: total, active, platform, user, sessions, revenue, rating, subscriptions

2. **Frontend Updates**
   - Enable `useAdminMetric` hooks (8 metrics)
   - Enable `useAdminTrendData` hooks (3 trend charts)
   - Expand KPI cards from 4 to 8
   - Add 3 trend charts + keep ownership breakdown

---

### **🔵 Phase 3: Advanced Features (Future)**
**Priority:** Medium
**Estimated Effort:** High (1-2 weeks)

#### **Feature 1: Performance Benchmarking**
Compare platform vs user AI tutors:
- Completion rate
- Average rating
- Repeat usage rate
- Revenue per session
- Student satisfaction

#### **Feature 2: Revenue Forecasting**
ML-based forecasting:
- Historical trends (3+ months)
- Seasonal patterns
- Growth projections
- What-if scenarios (pricing changes, new tutors)

#### **Feature 3: Admin Pricing Overrides** (Optional)
Allow admins to:
- Set prices outside £5-£100 range
- Offer free platform tutors (£0)
- Premium pricing (>£100)
- Promotional discounts

---

## 🔧 **Technical Decisions**

### **Architecture Pattern: Hybrid Approach**

**Decision:** Copy page structure + Reuse complex components

**Rationale:**
- **Copy:** Admin pages (40+ pages) follow consistent pattern
- **Reuse:** Complex forms (324 lines) to avoid duplication
- **Result:** Fast implementation, maintainable codebase

**Example:**
```typescript
// ✅ Copied: Page structure from admin/listings
// ✅ Reused: AITutorBuilderForm via composition
// ✅ Result: Zero form code duplication
```

### **Permission Model**

**Database-Level Security:**
```sql
CREATE POLICY ai_tutors_admin_manage_platform
FOR ALL TO authenticated
USING (
  -- Admins can manage platform-owned AI tutors
  (is_platform_owned = true AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ))
  OR
  -- Users can manage their own AI tutors
  (is_platform_owned = false AND owner_id = auth.uid())
);
```

**API-Level Verification:**
```typescript
if (isPlatformOwned) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
```

### **Metrics Collection Strategy**

**Approach:** Daily aggregation via cron job

**Rationale:**
- Historical comparison requires time-series data
- Matches existing `platform_statistics_daily` pattern
- Efficient querying (no live aggregations)

**Implementation:**
```sql
-- Runs daily at midnight
INSERT INTO platform_statistics_daily (date, metric_name, metric_value)
SELECT CURRENT_DATE, 'ai_tutors_total', COUNT(*) FROM ai_tutors;
-- ... repeat for all metrics
```

---

## 🔒 **Security & Permissions**

### **Access Control Matrix**

| Role  | View All | Create Platform | Edit Platform | Delete Platform | Edit User | Feature | Set Priority |
|-------|----------|-----------------|---------------|-----------------|-----------|---------|--------------|
| Admin | ✅       | ✅              | ✅            | ✅              | ✅        | ✅      | ✅           |
| User  | ❌       | ❌              | ❌            | ❌              | ✅ (own)  | ❌      | ❌           |

### **RLS Policies**

1. **Platform Tutor Management** - Only admins can CRUD platform tutors
2. **User Tutor Management** - Users can only CRUD their own tutors
3. **Read Access** - All authenticated users can view published tutors

---

## 💾 **Data Model**

### **ai_tutors Table Schema**

```sql
CREATE TABLE ai_tutors (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  price_per_hour NUMERIC(10,2) NOT NULL CHECK (price_per_hour >= 5 AND price_per_hour <= 100),
  status TEXT NOT NULL, -- draft, published, unpublished, archived

  -- Phase 1: Platform Ownership
  is_platform_owned BOOLEAN NOT NULL DEFAULT false,

  -- Phase 2A: Featured & Priority
  is_featured BOOLEAN DEFAULT false,
  priority_rank INTEGER DEFAULT 0,

  -- Metrics (updated by triggers/cron)
  total_sessions INTEGER DEFAULT 0,
  total_revenue NUMERIC(10,2) DEFAULT 0,
  avg_rating NUMERIC(3,2),
  total_reviews INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_ai_tutors_is_platform_owned ON ai_tutors(is_platform_owned);
CREATE INDEX idx_ai_tutors_is_featured ON ai_tutors(is_featured) WHERE is_featured = true;
CREATE INDEX idx_ai_tutors_priority_rank ON ai_tutors(priority_rank DESC);
```

### **platform_statistics_daily Schema**

```sql
CREATE TABLE platform_statistics_daily (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(date, metric_name)
);

-- AI Tutor Metrics (Phase 2B)
-- ai_tutors_total
-- ai_tutors_active
-- ai_tutors_platform
-- ai_tutors_user
-- ai_tutor_sessions_total
-- ai_tutor_revenue_total
-- ai_tutor_avg_rating
-- ai_tutor_subscriptions_active
```

---

## 🎨 **UI/UX Patterns**

### **Consistency Requirements**

All admin pages follow the **Hub Layout Pattern:**

```typescript
<HubPageLayout
  header={<HubHeader title="..." subtitle="..." actions={...} />}
  tabs={<HubTabs tabs={[...]} />}
  sidebar={<HubSidebar>widgets</HubSidebar>}
>
  {content}
</HubPageLayout>
```

### **Overview Tab Pattern**

**Structure:**
1. **KPI Grid** (8 cards, 2x4 layout)
2. **Charts Section** (2x2 grid or 3-column)
3. **Error Boundaries** (wrap all charts)
4. **Loading States** (ChartSkeleton)

**Visual Hierarchy:**
```
┌─────────────────────────────────────────────┐
│ [KPI] [KPI] [KPI] [KPI]                     │
│ [KPI] [KPI] [KPI] [KPI]                     │
│                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │ Chart 1  │ │ Chart 2  │ │ Chart 3  │     │
│ └──────────┘ └──────────┘ └──────────┘     │
│                                              │
│ ┌─────────────────────────────────┐         │
│ │ Chart 4 (full width)            │         │
│ └─────────────────────────────────┘         │
└─────────────────────────────────────────────┘
```

### **Table Pattern**

**Features Required:**
- ✅ Search (name, description)
- ✅ Filters (status, subject, ownership, subscription)
- ✅ Bulk actions (publish, unpublish, delete)
- ✅ CSV export
- ✅ Saved views
- ✅ Real-time refresh (30s)
- ✅ Mobile responsive

### **Platform Badge Design**

```typescript
{tutor.is_platform_owned && (
  <span className={styles.platformBadge}>
    ⭐ Platform
  </span>
)}
```

---

## 📊 **Success Metrics**

### **Business Metrics**

**Phase 1 Success:**
- [ ] Platform creates 5+ AI tutors
- [ ] 100+ sessions completed via platform tutors
- [ ] £1000+ revenue from platform tutors
- [ ] 4.5+ average rating on platform tutors

**Phase 2 Success:**
- [ ] 3+ platform tutors featured on homepage
- [ ] 20% increase in platform tutor discovery
- [ ] Admin uses analytics dashboard weekly
- [ ] Strategic pricing decisions made using data

### **Technical Metrics**

**Performance:**
- Overview tab loads in <2s
- Charts render without errors
- Metrics update daily
- Real-time counts accurate within 30s

**Quality:**
- Zero security vulnerabilities (RLS enforced)
- 95%+ test coverage on new features
- TypeScript strict mode compliant
- Accessibility (WCAG AA)

---

## 🚀 **Deployment Plan**

### **Phase 1: Already Deployed ✅**
- Migration executed
- Code deployed
- Navigation visible

### **Phase 2A: Feature Flags**
```typescript
// Can deploy code, enable features gradually
const FEATURES = {
  FEATURED_AI_TUTORS: process.env.NEXT_PUBLIC_ENABLE_FEATURED === 'true',
  PRIORITY_RANKING: process.env.NEXT_PUBLIC_ENABLE_PRIORITY === 'true',
};
```

### **Phase 2B: Gradual Rollout**
1. Deploy metrics collection (backend)
2. Collect data for 7 days (populate history)
3. Deploy frontend updates (show metrics)
4. Monitor for issues

---

## 📝 **Notes & Considerations**

### **Why Platform Tutors?**
1. **Revenue:** 100% vs commission split
2. **Control:** Can adjust pricing, featuring
3. **Quality:** Set standards for marketplace
4. **Gaps:** Fill underserved subjects

### **Fairness to User Creators**
**Potential concerns:**
- Platform competing with own users
- Unfair advantages (featured, pricing)
- Market dominance by platform

**Mitigations:**
- Transparent badging (⭐ Platform)
- Same pricing constraints (£5-£100)
- Limited featured slots
- Focus on market gaps, not direct competition

### **Scalability**
- Metrics collection: Daily aggregation (not real-time)
- Search: Indexed by priority_rank
- Homepage featured: Cached (CDN)
- Analytics: Pre-computed in daily stats

---

## 🔗 **Related Documents**

- [Admin AI Tutor Studio Implementation](./ADMIN_AI_TUTOR_STUDIO_IMPLEMENTATION.md)
- [Phase 2A: Featured AI Tutors Implementation](./PHASE_2A_FEATURED_IMPLEMENTATION.md)
- [Phase 2A: Priority Ranking Implementation](./PHASE_2A_PRIORITY_IMPLEMENTATION.md)
- [Phase 2B: Analytics Dashboard Implementation](./PHASE_2B_ANALYTICS_IMPLEMENTATION.md)

---

**Last Updated:** 2026-02-25
**Version:** 2.0
**Status:** Living Document
