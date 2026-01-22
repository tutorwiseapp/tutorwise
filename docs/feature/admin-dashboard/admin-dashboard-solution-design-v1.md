# Tutorwise Admin Dashboard - Solution Design v1

**Document Status**: Draft v1.0
**Created**: 2025-12-23
**Last Updated**: 2025-12-23
**Owner**: Engineering Team
**Stakeholders**: Product, Engineering, Business Operations

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Strategic Context](#2-strategic-context)
3. [Current State Analysis](#3-current-state-analysis)
4. [Competitive Research](#4-competitive-research)
5. [Solution Architecture](#5-solution-architecture)
6. [Database Schema](#6-database-schema)
7. [Component Design](#7-component-design)
8. [Admin Sections](#8-admin-sections)
9. [Implementation Plan](#9-implementation-plan)
10. [Cost & Timeline](#10-cost--timeline)
11. [Success Metrics](#11-success-metrics)
12. [Risk Mitigation](#12-risk-mitigation)
13. [Appendices](#13-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

This document defines the technical architecture and implementation strategy for Tutorwise's first comprehensive admin dashboard. The admin dashboard will serve as the central command center for platform operations, SEO management, business analytics, and system configuration.

### 1.2 Key Drivers

**Immediate Trigger**: SEO solution implementation requires admin UI for content management, configuration, and citation tracking.

**Strategic Opportunity**: Tutorwise has no admin dashboard yet—this is the opportunity to build it strategically for the entire platform, not just SEO.

**Business Impact**:
- Enable non-technical team members to manage SEO content
- Provide visibility into platform health and performance
- Support data-driven decision making
- Reduce engineering bottlenecks for operational tasks

### 1.3 Solution Approach

**Hybrid Architecture**: Combine best-in-class Shadcn admin patterns with Tutorwise's proven Hub components.

**Key Benefits**:
- 80% code reuse from existing Hub components
- Professional persistent sidebar navigation
- Consistent UX with user-facing Hub
- 1 week setup vs 2 weeks for pure Shadcn template
- $3,200 cost vs $6,400 for pure Shadcn approach

### 1.4 Scope

**In Scope**:
- Admin dashboard shell (persistent sidebar, top bar, layout)
- SEO management (Hub Manager, Spoke Manager, Citation Tracker, Config)
- Platform management (Users, Listings, Bookings, Reviews)
- Business analytics (Financials, Reports, Platform Statistics)
- System settings (Configuration, Integrations, Team Management)

**Out of Scope** (Future Phases):
- Advanced analytics (custom dashboards, data visualization tools)
- Marketing automation
- Customer support ticketing system
- Mobile admin app

### 1.5 Timeline & Resources

- **Design & Setup**: 1 week (40 hours)
- **Core Admin Sections**: 3-4 weeks (120-160 hours)
- **Total First Release**: 4-5 weeks (160-200 hours)
- **Team**: 1 senior full-stack engineer + 1 designer (part-time)

---

## 2. Strategic Context

### 2.1 Why Now?

1. **SEO Initiative**: Page 1 ranking strategy requires sophisticated content management
2. **Platform Scale**: Growing user base demands operational efficiency
3. **Team Growth**: Non-technical team members need self-service tools
4. **Data Maturity**: Platform has rich data that needs accessible insights

### 2.2 Strategic Goals

**Operational Efficiency**:
- Reduce engineering time on routine tasks by 70%
- Enable marketing team to manage SEO content independently
- Provide real-time visibility into platform health

**SEO Success**:
- Manage 50+ Hub pages, 300+ Spoke pages, 2,500+ Matrix pages
- Track ChatGPT/Perplexity citations and rankings
- A/B test content strategies with data-driven insights

**Business Growth**:
- Monitor revenue, booking trends, user acquisition
- Identify high-performing tutors and content
- Support strategic planning with accurate data

**Platform Quality**:
- Proactive moderation and quality control
- Fast response to user issues
- Data-backed product decisions

### 2.3 Design Principles

1. **Leverage Existing Patterns**: Reuse Hub components (80% code reuse target)
2. **Professional Grade**: Match quality of Stripe, Vercel, Supabase admin UIs
3. **Role-Based Access**: Support multiple admin roles (Super Admin, SEO Manager, Support)
4. **Mobile Responsive**: Full functionality on tablet, essential features on mobile
5. **Performance First**: Fast load times, optimistic updates, efficient queries
6. **Audit Everything**: Complete audit logs for compliance and debugging

---

## 3. Current State Analysis

### 3.1 Existing Hub Architecture

Tutorwise has a **sophisticated Hub component system** used for user-facing pages:

**HubPageLayout** (`/apps/web/src/app/components/hub/layout/HubPageLayout.tsx`):
- Three-column layout: Header + Tabs + Content + Sidebar
- Mobile-responsive with floating buttons and drawer sidebar
- Comprehensive migration checklist in comments
- Used by Network, Reviews, Organisation pages

**HubSidebar** (`/apps/web/src/app/components/hub/sidebar/HubSidebar.tsx`):
- Pure layout component (Tier 2)
- Generic sidebar container with SidebarWidget utility
- Widget system for modular content blocks

**Key Components Available**:
- `HubHeader` - Title, filters, actions
- `HubTabs` - Full-width underline tabs
- `HubPagination` - Pagination controls
- Hub filter styles (`hub-filters.module.css`)
- Hub action styles (`hub-actions.module.css`)

**Patterns Established**:
```typescript
// Standard Hub page structure
<HubPageLayout
  header={
    <HubHeader
      title="Page Title"
      filters={<>search + sort</>}
      actions={<>primary + secondary buttons</>}
    />
  }
  tabs={<HubTabs tabs={tabs} onTabChange={setActiveTab} />}
  sidebar={<HubSidebar>widgets</HubSidebar>}
>
  {/* Content: empty state OR list + pagination */}
</HubPageLayout>
```

**Reference Implementation**: `/apps/web/src/app/(authenticated)/network/page.tsx` is the gold standard.

### 3.2 Gaps for Admin Use Case

**Missing for Admin**:
1. **Persistent Left Sidebar**: Current Hub uses right contextual sidebar, not persistent navigation
2. **Breadcrumbs**: No breadcrumb navigation in Hub system
3. **Notification Center**: No global notifications/alerts
4. **Multi-Level Navigation**: Hub tabs are flat, admin needs nested nav
5. **Bulk Actions**: Hub components don't support multi-select/bulk operations
6. **Data Tables**: No advanced table component (sorting, filtering, column management)

**What Works Well**:
- Search + sort filter patterns
- Pagination
- Empty states
- Mobile responsiveness
- Widget system for sidebars

### 3.3 Technology Stack

**Frontend**:
- Next.js 14 (App Router, Server Components, Server Actions)
- React 18 (TypeScript)
- Tailwind CSS
- React Query (TanStack Query) for data fetching

**Backend**:
- Supabase (PostgreSQL + Auth + Storage)
- Row Level Security (RLS) policies
- Database functions for complex queries

**Current Auth**:
- Supabase Auth
- Profile-based user management
- `account_type`: 'Tutor', 'Student', 'Parent'

**Deployment**:
- Vercel (production)
- Preview deployments for PRs

---

## 4. Competitive Research

### 4.1 Best-in-Class Admin Dashboards

**Stripe Dashboard**:
- Persistent left sidebar with icons + labels
- Nested navigation (e.g., Payments → Transactions)
- Search-first navigation (Cmd+K)
- Real-time updates with WebSocket
- Dark mode support

**Vercel Dashboard**:
- Clean persistent sidebar
- Project-scoped context
- Fast search with keyboard shortcuts
- Deployment logs with real-time streaming
- Excellent mobile responsive

**Supabase Dashboard**:
- Technical admin for developers
- Table editor, SQL editor, API docs
- Organization → Project hierarchy
- Role-based access control

**Shopify Admin**:
- Icon-based persistent navigation
- Quick actions in top bar
- Bulk operations on lists
- Mobile app for essential tasks

**Key Patterns Identified**:
1. Persistent left sidebar (200-280px) with collapsible option
2. Top bar: Breadcrumbs + Search + Notifications + User menu
3. Main content area reuses patterns (tables, cards, forms)
4. Right sidebar for contextual actions/info (consistent across pages)
5. Cmd+K search for everything
6. Dark mode as standard feature

### 4.2 Admin Framework Analysis

**Shadcn Admin Templates**:
- `shadcn-admin` template by satnaing (8k+ stars)
- Modern SaaS-style persistent sidebar
- Breadcrumbs, theme toggle, search
- Data tables with sorting, filtering, pagination
- Form components with validation
- **Pros**: Production-ready, TypeScript, Tailwind, accessible
- **Cons**: 2 weeks to customize, not integrated with Hub patterns

**TailAdmin** (Tailwind CSS):
- 200+ dashboard UI components
- Analytics, eCommerce, marketing templates
- **Pros**: Comprehensive component library
- **Cons**: Not React-based (HTML/CSS), licensing costs

**Next.js Admin Templates**:
- Multiple open-source templates on GitHub
- Varying quality and maintenance
- **Pros**: Next.js optimized
- **Cons**: Inconsistent patterns, often outdated

**Recommendation**: Use Shadcn admin patterns as design reference, but integrate with Tutorwise Hub components for 80% code reuse.

### 4.3 Marketplace Admin Research

**Airbnb Host Dashboard**:
- Listing management with performance metrics
- Calendar and pricing tools
- Earnings and payout tracking
- Professional photography services

**Etsy Seller Dashboard**:
- Shop analytics (views, favorites, orders)
- Listing management with SEO optimization
- Order processing and shipping
- Marketing tools (ads, promotions)

**Upwork Freelancer Dashboard**:
- Job search and proposals
- Contract management
- Time tracking and invoicing
- Profile optimization tips

**Common Features**:
- Performance metrics at a glance
- Content/listing management
- Financial tracking
- Analytics and insights
- Marketing/SEO tools

---

## 5. Solution Architecture

### 5.1 Hybrid Approach Overview

**Core Concept**: Combine Shadcn admin shell (persistent left sidebar, top bar) with Tutorwise Hub components (3-column layout: content + right sidebar).

**CRITICAL**: This is Option 3 - full 3-column layout matching existing Hub architecture for 100% code reuse and consistency.

**Architecture Diagram**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ AdminTopBar                                                              │
│ [Breadcrumbs] ─────────────────────────── [Notifications] [User Menu]   │
├──────────┬──────────────────────────────────────────────┬───────────────┤
│          │                                               │               │
│  Admin   │  HubPageLayout (Standard Hub Pattern)        │  HubSidebar   │
│  Sidebar │  ┌─────────────────────────────────────────┐ │               │
│          │  │ HubHeader                                │ │  Stats        │
│  Logo    │  │ [Title] [Search+Filters] [Actions]       │ │  Widget       │
│          │  ├─────────────────────────────────────────┤ │               │
│  - Over- │  │ HubTabs (optional)                       │ │  Quick        │
│    view  │  ├─────────────────────────────────────────┤ │  Actions      │
│  - SEO   │  │ Content Area                             │ │               │
│    • Hubs│  │ - Lists with HubPagination               │ │  Related      │
│    • Ci- │  │ - Forms                                  │ │  Info         │
│      tati│  │ - Data tables                            │ │               │
│      ons │  │ - Empty states                           │ │  Charts       │
│  - Plat- │  └─────────────────────────────────────────┘ │               │
│    form  │                                               │  Activity     │
│    • Us- │                                               │  Feed         │
│      ers │                                               │               │
│    • Li- │                                               │               │
│      sting                                               │               │
│    • Rev │                                               │               │
│          │                                               │               │
└──────────┴───────────────────────────────────────────────┴───────────────┘
     ↑                        ↑                                  ↑
 AdminSidebar          Hub Components                      Hub Sidebar
  (new, Shadcn)      (existing, 100% reuse)             (existing, 100% reuse)
```

**Layout Breakdown**:
- **AdminTopBar**: Simple top bar (breadcrumbs, notifications, user menu)
- **AdminSidebar (LEFT)**: Persistent navigation for admin sections
- **HubPageLayout (MIDDLE)**: Reused from existing Hub system
  - HubHeader: Title + Search/Filters + Action buttons (page-specific)
  - HubTabs: Optional tab navigation
  - Content: Lists, forms, tables, empty states
- **HubSidebar (RIGHT)**: Contextual widgets (stats, charts, quick actions)

**Key Benefits**:
- **100% Hub Pattern Reuse**: Same 3-column layout as user-facing Hub pages
- **Consistent UX**: Admins experience same familiar patterns
- **Maximum Code Reuse**: 80%+ component reuse from existing Hub system
- **Right Sidebar Always Present**: Stats, quick actions, contextual info on every page

### 5.2 Layout Components

#### AdminLayout (New)

**Purpose**: Top-level wrapper for all admin pages.

**Responsibilities**:
- Render persistent AdminSidebar
- Render AdminTopBar
- Provide main content area
- Handle sidebar collapse state
- Provide admin context (current user, permissions)

**File**: `/apps/web/src/app/components/admin/layout/AdminLayout.tsx`

```typescript
interface AdminLayoutProps {
  children: ReactNode;
  breadcrumbs?: Breadcrumb[];
}

export default function AdminLayout({ children, breadcrumbs }: AdminLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={styles.adminContainer}>
      <AdminSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className={styles.adminMain}>
        <AdminTopBar breadcrumbs={breadcrumbs} />
        <main className={styles.adminContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### AdminSidebar (New)

**Purpose**: Persistent left navigation for admin sections.

**Design**:
- Width: 280px (expanded), 64px (collapsed)
- Logo at top
- Navigation groups (Overview, SEO, Platform, Business, Settings)
- Active state styling
- Collapse toggle button
- Mobile: Drawer overlay

**File**: `/apps/web/src/app/components/admin/sidebar/AdminSidebar.tsx`

**Navigation Structure**:
```typescript
const navigationGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ]
  },
  {
    label: 'SEO',
    items: [
      { label: 'Hubs', href: '/admin/seo/hubs', icon: Network },
      { label: 'Spokes', href: '/admin/seo/spokes', icon: FileText },
      { label: 'Citations', href: '/admin/seo/citations', icon: Quote },
      { label: 'Configuration', href: '/admin/seo/config', icon: Settings2 },
    ]
  },
  {
    label: 'Platform',
    items: [
      { label: 'Users', href: '/admin/accounts', icon: Users },
      { label: 'Listings', href: '/admin/listings', icon: BookOpen },
      { label: 'Bookings', href: '/admin/bookings', icon: Calendar },
      { label: 'Reviews', href: '/admin/reviews', icon: Star },
    ]
  },
  {
    label: 'Business',
    items: [
      { label: 'Financials', href: '/admin/financials', icon: DollarSign },
      { label: 'Reports', href: '/admin/reports', icon: FileBarChart },
    ]
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/admin/settings', icon: Settings },
      { label: 'Team', href: '/admin/team', icon: UserCog },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileCheck },
    ]
  }
];
```

#### AdminTopBar (New)

**Purpose**: Minimal top bar with only breadcrumbs, notifications, and user menu.

**IMPORTANT**: Search, filters, and actions are handled by HubHeader (inside HubPageLayout), not by AdminTopBar. This maintains consistency with existing Hub design where each page controls its own filtering.

**Components**:
- Breadcrumbs (dynamic based on current page) - LEFT
- Notifications (bell icon with unread count) - RIGHT
- User menu (avatar, name, role, sign out) - RIGHT

**File**: `/apps/web/src/app/components/admin/topbar/AdminTopBar.tsx`

```typescript
interface AdminTopBarProps {
  breadcrumbs?: Breadcrumb[];
}

export default function AdminTopBar({ breadcrumbs }: AdminTopBarProps) {
  return (
    <header className={styles.topBar}>
      {/* Left: Breadcrumbs */}
      <Breadcrumbs items={breadcrumbs} />

      {/* Right: Notifications + User Menu */}
      <div className={styles.topBarActions}>
        <NotificationCenter />
        <UserMenu />
      </div>
    </header>
  );
}
```

**Note**: Cmd+K global search will be triggered via keyboard shortcut, not a button in the top bar. The search modal will overlay the entire admin interface.

### 5.3 Content Area Integration

**Strategy**: Admin pages use existing Hub components EXACTLY as-is for content areas with 3-column layout.

**Pattern** (Full 3-column layout on ALL pages):
```typescript
// Admin page example: /admin/seo/hubs/page.tsx
export default function AdminSEOHubsPage() {
  return (
    <AdminLayout breadcrumbs={[
      { label: 'SEO', href: '/admin/seo' },
      { label: 'Hubs', href: '/admin/seo/hubs' }
    ]}>
      {/* Use existing HubPageLayout EXACTLY as-is (3-column layout) */}
      <HubPageLayout
        header={
          <HubHeader
            title="SEO Hubs"
            subtitle="Manage hub pages for topical authority"
            filters={<>search + sort + status filter</>}
            actions={<Button>Create Hub</Button>}
          />
        }
        tabs={<HubTabs tabs={hubTabs} />}
        sidebar={
          {/* ALWAYS include HubSidebar - this is the 3rd column */}
          <HubSidebar>
            <SidebarWidget title="Hub Statistics">
              <StatsCard label="Total Hubs" value={totalHubs} />
              <StatsCard label="Published" value={publishedHubs} />
              <StatsCard label="Draft" value={draftHubs} />
            </SidebarWidget>

            <SidebarWidget title="SEO Performance">
              <ChartWidget data={seoPerformance} />
            </SidebarWidget>

            <SidebarWidget title="Quick Actions">
              <Button variant="secondary">Create Hub</Button>
              <Button variant="secondary">Bulk Publish</Button>
            </SidebarWidget>
          </HubSidebar>
        }
      >
        {/* List of hubs with HubPagination */}
        {hubs.length === 0 ? (
          <EmptyState title="No hubs yet" />
        ) : (
          <>
            <HubList items={paginatedHubs} />
            <HubPagination
              currentPage={currentPage}
              totalItems={filteredHubs.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </HubPageLayout>
    </AdminLayout>
  );
}
```

**Benefits**:
- **100% Hub Pattern Consistency**: Same 3-column layout on all admin pages
- **80% code reuse** from existing Hub components
- **Consistent UX**: Between user Hub and admin (admins already familiar)
- **Faster development**: Components already battle-tested
- **Easier maintenance**: Single component library
- **Right sidebar provides**: Stats, quick actions, contextual info on EVERY admin page

### 5.4 Responsive Design

**Desktop (≥1024px)**:
- Left: Persistent AdminSidebar (280px)
- Top: AdminTopBar (full-width)
- Middle: HubPageLayout content area
- Right: HubSidebar (320px) - ALWAYS present

**Tablet (768px - 1023px)**:
- Left: Collapsible AdminSidebar (default collapsed to 64px icons)
- Top: AdminTopBar (full-width)
- Middle: HubPageLayout content area (expanded)
- Right: HubSidebar (floating drawer, triggered by button)

**Mobile (<768px)**:
- Left: Hidden AdminSidebar (drawer overlay on hamburger menu tap)
- Top: Simplified AdminTopBar (hamburger, search icon, user avatar)
- Middle: Full-width content
- Right: HubSidebar (floating drawer, triggered by info button - same as user Hub)
- Essential admin tasks only (approve listings, respond to support)

**Note**: The HubPageLayout component already handles right sidebar responsiveness (floating button + drawer on mobile). AdminLayout only needs to handle left AdminSidebar responsiveness.

### 5.5 Authentication & Authorization

**Admin Access Control**:

**New Database Fields**:
```sql
-- Add to existing profiles table
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN admin_role TEXT; -- 'super_admin', 'seo_manager', 'support', 'analyst'
ALTER TABLE profiles ADD COLUMN admin_permissions JSONB; -- Granular permissions
```

**Permission System**:
```typescript
type AdminRole = 'super_admin' | 'seo_manager' | 'support' | 'analyst';

const rolePermissions: Record<AdminRole, string[]> = {
  super_admin: ['*'], // All permissions
  seo_manager: ['seo:*', 'analytics:view'],
  support: ['users:view', 'users:edit', 'bookings:view', 'reviews:moderate'],
  analyst: ['analytics:*', 'reports:*']
};
```

**Middleware Protection**:
```typescript
// /apps/web/src/middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const session = await getSession(request);

    if (!session || !session.user.is_admin) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check role-based permissions for specific admin sections
    const requiredPermission = getRequiredPermission(pathname);
    if (!hasPermission(session.user, requiredPermission)) {
      return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}
```

**Row Level Security (RLS)**:
```sql
-- Admin access policy
CREATE POLICY "Admin users can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE is_admin = true
  )
);

-- Audit log policy
CREATE POLICY "Admin actions are logged"
ON admin_audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE is_admin = true
  )
);
```

### 5.6 Performance Considerations

**Optimization Strategies**:

1. **Server Components**: Use Next.js Server Components for data fetching
2. **Streaming SSR**: Stream large lists for faster initial render
3. **Pagination**: Cursor-based pagination for large datasets
4. **Caching**: React Query for client-side caching, revalidation
5. **Database Indexes**: Index all foreign keys, search fields
6. **Lazy Loading**: Code-split admin sections with dynamic imports

**Example**:
```typescript
// Lazy load admin sections
const SEOHubManager = dynamic(() => import('./seo/HubManager'), {
  loading: () => <AdminLoadingSkeleton />,
  ssr: false // Admin only, no SSR needed
});
```

---

## 6. Database Schema

### 6.1 Admin-Specific Tables

#### admin_audit_logs

**Purpose**: Track all admin actions for compliance and debugging.

```sql
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'publish', 'moderate'
  resource_type TEXT NOT NULL, -- 'hub', 'user', 'listing', 'booking', etc.
  resource_id UUID, -- ID of affected resource
  details JSONB, -- Action-specific details (old/new values, etc.)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audit_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX idx_audit_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_resource ON admin_audit_logs(resource_type, resource_id);
```

**Example Log Entry**:
```json
{
  "admin_id": "uuid",
  "action": "publish",
  "resource_type": "seo_hub",
  "resource_id": "hub-uuid",
  "details": {
    "old_status": "draft",
    "new_status": "published",
    "hub_title": "Chemistry Tutors in Sydney"
  },
  "ip_address": "203.0.113.42",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2025-12-23T10:30:00Z"
}
```

#### admin_notifications

**Purpose**: In-app notifications for admin users.

```sql
CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'citation_alert', 'listing_flagged', 'payment_issue', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Deep link to relevant admin page
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON admin_notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON admin_notifications(recipient_id, read_at) WHERE read_at IS NULL;
```

**Example Notification**:
```json
{
  "type": "citation_alert",
  "title": "New ChatGPT Citation",
  "message": "Your hub 'Chemistry Tutors in Sydney' was cited by ChatGPT",
  "link": "/admin/seo/citations?hub=chem-sydney",
  "priority": "normal"
}
```

#### admin_saved_filters

**Purpose**: Save commonly used filter configurations.

```sql
CREATE TABLE admin_saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  page TEXT NOT NULL, -- 'users', 'listings', 'bookings', etc.
  filter_name TEXT NOT NULL,
  filter_config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_filters_admin ON admin_saved_filters(admin_id, page);
```

**Example Saved Filter**:
```json
{
  "admin_id": "uuid",
  "page": "listings",
  "filter_name": "High-Value Inactive Listings",
  "filter_config": {
    "status": "published",
    "price_min": 100,
    "last_booking_days_ago": 90,
    "rating_min": 4.5
  }
}
```

### 6.2 Extending Existing Tables

#### profiles Table Extensions

```sql
-- Admin-specific fields (already covered in 5.5)
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN admin_role TEXT;
ALTER TABLE profiles ADD COLUMN admin_permissions JSONB;
ALTER TABLE profiles ADD COLUMN last_admin_access TIMESTAMPTZ;

-- Index for admin queries
CREATE INDEX idx_profiles_admin ON profiles(is_admin) WHERE is_admin = true;
```

#### seo_hubs Table Extensions

```sql
-- Admin workflow fields
ALTER TABLE seo_hubs ADD COLUMN created_by UUID REFERENCES profiles(id);
ALTER TABLE seo_hubs ADD COLUMN last_edited_by UUID REFERENCES profiles(id);
ALTER TABLE seo_hubs ADD COLUMN last_edited_at TIMESTAMPTZ;
ALTER TABLE seo_hubs ADD COLUMN published_by UUID REFERENCES profiles(id);
ALTER TABLE seo_hubs ADD COLUMN review_notes TEXT;

-- Performance tracking
ALTER TABLE seo_hubs ADD COLUMN google_rank INTEGER;
ALTER TABLE seo_hubs ADD COLUMN chatgpt_citations INTEGER DEFAULT 0;
ALTER TABLE seo_hubs ADD COLUMN perplexity_citations INTEGER DEFAULT 0;
ALTER TABLE seo_hubs ADD COLUMN total_views INTEGER DEFAULT 0;
ALTER TABLE seo_hubs ADD COLUMN last_rank_check TIMESTAMPTZ;
```

#### listings_v4_1 Table Extensions

```sql
-- Admin moderation
ALTER TABLE listings_v4_1 ADD COLUMN moderation_status TEXT DEFAULT 'pending'; -- 'pending', 'approved', 'flagged', 'rejected'
ALTER TABLE listings_v4_1 ADD COLUMN moderation_notes TEXT;
ALTER TABLE listings_v4_1 ADD COLUMN moderated_by UUID REFERENCES profiles(id);
ALTER TABLE listings_v4_1 ADD COLUMN moderated_at TIMESTAMPTZ;

-- Quality flags
ALTER TABLE listings_v4_1 ADD COLUMN quality_score NUMERIC(3,2); -- 0.00 to 5.00
ALTER TABLE listings_v4_1 ADD COLUMN has_quality_photos BOOLEAN DEFAULT false;
ALTER TABLE listings_v4_1 ADD COLUMN has_complete_profile BOOLEAN DEFAULT false;
```

### 6.3 Analytics & Reporting Tables

#### platform_statistics_daily

**Purpose**: Daily snapshot of platform metrics for trend analysis.

```sql
CREATE TABLE platform_statistics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  active_tutors INTEGER,
  active_students INTEGER,
  published_listings INTEGER,
  total_bookings INTEGER,
  completed_bookings INTEGER,
  total_revenue NUMERIC(10,2),
  new_signups INTEGER,
  avg_listing_quality_score NUMERIC(3,2),
  avg_response_time_hours NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_stats_date ON platform_statistics_daily(date DESC);

-- Automated daily snapshot function
CREATE OR REPLACE FUNCTION capture_daily_statistics()
RETURNS void AS $$
BEGIN
  INSERT INTO platform_statistics_daily (
    date,
    active_tutors,
    active_students,
    published_listings,
    total_bookings,
    completed_bookings,
    total_revenue,
    new_signups,
    avg_listing_quality_score
  )
  SELECT
    CURRENT_DATE,
    (SELECT COUNT(*) FROM profiles WHERE account_type = 'Tutor' AND last_login > CURRENT_DATE - INTERVAL '30 days'),
    (SELECT COUNT(*) FROM profiles WHERE account_type IN ('Student', 'Parent') AND last_login > CURRENT_DATE - INTERVAL '30 days'),
    (SELECT COUNT(*) FROM listings_v4_1 WHERE status = 'published'),
    (SELECT COUNT(*) FROM bookings WHERE created_at::date = CURRENT_DATE),
    (SELECT COUNT(*) FROM bookings WHERE status = 'Completed' AND completed_at::date = CURRENT_DATE),
    (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE status = 'Completed' AND completed_at::date = CURRENT_DATE),
    (SELECT COUNT(*) FROM profiles WHERE created_at::date = CURRENT_DATE),
    (SELECT AVG(quality_score) FROM listings_v4_1 WHERE quality_score IS NOT NULL)
  ON CONFLICT (date) DO UPDATE SET
    active_tutors = EXCLUDED.active_tutors,
    active_students = EXCLUDED.active_students,
    published_listings = EXCLUDED.published_listings,
    total_bookings = EXCLUDED.total_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    total_revenue = EXCLUDED.total_revenue,
    new_signups = EXCLUDED.new_signups,
    avg_listing_quality_score = EXCLUDED.avg_listing_quality_score;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily (use pg_cron or external scheduler)
-- SELECT cron.schedule('capture-daily-stats', '0 1 * * *', 'SELECT capture_daily_statistics()');
```

---

## 7. Component Design

### 7.1 New Admin Components

#### DataTable Component

**Purpose**: Advanced table with sorting, filtering, column management, bulk actions.

**Features**:
- Column sorting (ascending, descending, none)
- Column visibility toggle
- Row selection (checkbox)
- Bulk actions toolbar
- Inline editing (optional)
- Responsive (card view on mobile)
- Export to CSV

**File**: `/apps/web/src/app/components/admin/data-table/DataTable.tsx`

**Usage**:
```typescript
<DataTable
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'status', label: 'Status', filterable: true },
    { key: 'created_at', label: 'Joined', sortable: true, type: 'date' }
  ]}
  data={users}
  bulkActions={[
    { label: 'Activate', onClick: handleBulkActivate },
    { label: 'Deactivate', onClick: handleBulkDeactivate }
  ]}
  onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
/>
```

#### StatsCard Component

**Purpose**: Display key metrics with trend indicators.

**File**: `/apps/web/src/app/components/admin/stats-card/StatsCard.tsx`

```typescript
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number; // Percentage change
    period: string; // 'vs last week', 'vs last month'
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: ReactNode;
  link?: string;
}

// Usage
<StatsCard
  title="Total Bookings"
  value={1234}
  change={{ value: 12.5, period: 'vs last month', trend: 'up' }}
  icon={<Calendar />}
  link="/admin/bookings"
/>
```

#### CommandPalette Component

**Purpose**: Cmd+K search across all admin sections.

**Features**:
- Fuzzy search across pages, users, listings
- Keyboard navigation
- Recent searches
- Quick actions (e.g., "Create new hub")
- Search results grouped by type

**File**: `/apps/web/src/app/components/admin/command-palette/CommandPalette.tsx`

**Implementation**: Use `cmdk` library by Paco Coursey (used by Vercel, Linear).

#### BulkActionToolbar Component

**Purpose**: Show bulk actions when rows are selected.

**File**: `/apps/web/src/app/components/admin/bulk-actions/BulkActionToolbar.tsx`

```typescript
<BulkActionToolbar
  selectedCount={selectedRows.length}
  actions={[
    { label: 'Publish', icon: <Check />, onClick: handleBulkPublish },
    { label: 'Delete', icon: <Trash />, onClick: handleBulkDelete, variant: 'danger' }
  ]}
  onClearSelection={() => setSelectedRows([])}
/>
```

### 7.2 Reused Hub Components

**Directly Reusable**:
- `HubPageLayout` - Content area wrapper
- `HubHeader` - Page title, filters, actions
- `HubTabs` - Tab navigation
- `HubPagination` - Pagination controls
- `HubSidebar` - Right contextual sidebar (for detail views)
- Filter styles (`hub-filters.module.css`)
- Action styles (`hub-actions.module.css`)

**Minor Adaptations Needed**:
- Empty states (add admin-specific illustrations)
- Loading skeletons (optimize for data tables)

### 7.3 Form Components

**FormBuilder Component**: Dynamic form generation from schema.

```typescript
interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'number' | 'rich-text';
  placeholder?: string;
  required?: boolean;
  validation?: (value: any) => string | null;
  options?: { label: string; value: string }[]; // For select/multiselect
}

<FormBuilder
  fields={hubFormFields}
  initialValues={hubData}
  onSubmit={handleSubmit}
  submitLabel="Save Hub"
/>
```

**Rich Text Editor**: Use Tiptap for SEO content editing.

```typescript
<RichTextEditor
  content={hubContent}
  onChange={setHubContent}
  features={['headings', 'bold', 'italic', 'link', 'lists', 'images']}
/>
```

---

## 8. Admin Sections

### 8.1 Dashboard (Overview)

**Route**: `/admin`

**Purpose**: High-level platform health and key metrics.

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ Dashboard                                        │
├─────────────────────────────────────────────────┤
│ Stats Cards (4 columns)                         │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐        │
│ │Bookings│ │Revenue│ │Active │ │Avg.   │        │
│ │1,234   │ │$45.2K │ │Tutors │ │Rating │        │
│ │+12.5%  │ │+8.3%  │ │856    │ │4.8/5  │        │
│ └───────┘ └───────┘ └───────┘ └───────┘        │
├─────────────────────────────────────────────────┤
│ Charts (2 columns)                              │
│ ┌─────────────────┐ ┌──────────────────────┐   │
│ │ Bookings Trend  │ │ Revenue by Subject   │   │
│ │ (Line chart)    │ │ (Pie chart)          │   │
│ └─────────────────┘ └──────────────────────┘   │
├─────────────────────────────────────────────────┤
│ Recent Activity (table)                         │
│ - New user signups                              │
│ - Pending listing approvals                     │
│ - Flagged reviews                               │
└─────────────────────────────────────────────────┘
```

**Data Sources**:
- Real-time: `platform_statistics_daily` table
- Trends: Last 30 days comparison
- Activity feed: Recent audit logs + system events

### 8.2 SEO Management

#### 8.2.1 Hub Manager

**Route**: `/admin/seo/hubs`

**Features**:
- List all hubs with status, type, performance metrics
- Search by title, keyword, type
- Filter by status (draft, published), type (subject, location, service)
- Sort by created date, last edited, Google rank, ChatGPT citations
- Bulk actions: Publish, unpublish, delete
- Create new hub (button → form modal)

**Hub Detail View** (`/admin/seo/hubs/[id]`):
- Edit form (title, H1, meta, content, FAQ, answer capsules)
- Preview (live preview in iframe or new tab)
- Performance tab (Google rank history, AI citations, views)
- Linked spokes (list of connected spoke pages)
- Audit history (who created, edited, published)

**DataTable Columns**:
| Column | Sortable | Filterable |
|--------|----------|------------|
| Title | Yes | Yes (search) |
| Type | Yes | Yes (dropdown) |
| Status | Yes | Yes (dropdown) |
| Google Rank | Yes | No |
| ChatGPT Citations | Yes | No |
| Views (30d) | Yes | No |
| Last Edited | Yes | No |
| Actions | - | - |

**Right Sidebar (HubSidebar) Widgets**:
1. **Hub Statistics Widget**:
   - Total hubs (with breakdown by type)
   - Published vs draft count
   - Average Google rank
   - Total ChatGPT citations

2. **Performance Chart Widget**:
   - Hub traffic trend (last 30 days)
   - Citation growth chart

3. **Quick Actions Widget**:
   - Create New Hub (primary button)
   - Bulk Publish Drafts
   - Export Hub Data (CSV)

4. **Top Performing Hubs Widget**:
   - List of top 5 hubs by traffic
   - Quick links to edit

#### 8.2.2 Spoke Manager

**Route**: `/admin/seo/spokes`

**Similar structure to Hub Manager**:
- List spokes with parent hub, status, performance
- Create spoke (select parent hub, template pre-fills)
- Edit spoke content
- Performance tracking

**Right Sidebar (HubSidebar) Widgets**:
1. **Spoke Statistics Widget**:
   - Total spokes
   - Spokes by parent hub (breakdown)
   - Published vs draft count

2. **Hub-Spoke Coverage Widget**:
   - Hubs with <6 spokes (flagged as incomplete)
   - Orphan spokes (no parent hub)

3. **Quick Actions Widget**:
   - Create New Spoke
   - Assign to Hub (bulk action)

4. **Recent Spokes Widget**:
   - Last 5 created/edited spokes

#### 8.2.3 Citation Tracker

**Route**: `/admin/seo/citations`

**Purpose**: Monitor ChatGPT, Perplexity, Google AI citations.

**Features**:
- List of detected citations (source, query, page cited, timestamp)
- Search by query, page, source
- Chart: Citations over time by source
- Alert settings (email when new citation detected)

**Data Source**: `seo_citation_tracking` table (from SEO solution design).

**Right Sidebar (HubSidebar) Widgets**:
1. **Citation Summary Widget**:
   - Total citations (all sources)
   - Citations by source (ChatGPT, Perplexity, Google AI)
   - Citation growth (vs last month)

2. **Citation Trend Chart Widget**:
   - Citations over time by source
   - Line chart showing growth trajectory

3. **Top Cited Pages Widget**:
   - Top 5 hubs/spokes by citation count
   - Quick links to pages

4. **Alert Configuration Widget**:
   - Enable/disable citation alerts
   - Configure notification thresholds
   - Test alert button

#### 8.2.4 SEO Configuration

**Route**: `/admin/seo/config`

**Configuration Sections**:

1. **Organization Details** (for schema markup):
   - Company name, legal name, founding date
   - Address, phone, social profiles
   - Logo, founder info

2. **SEO Settings**:
   - Default meta title template
   - Default meta description template
   - Sitemap settings (update frequency, priority)
   - Robots.txt rules

3. **AI Optimization**:
   - llms.txt content
   - Answer capsule guidelines
   - Citation tracking API keys (if using third-party services)

4. **Performance Thresholds**:
   - Alert when Google rank drops > X positions
   - Alert when citations increase > X% (positive alert)

**Form Type**: Multi-tab form with sections, save per section.

**Right Sidebar (HubSidebar) Widgets**:
1. **Configuration Status Widget**:
   - Required fields completion (%)
   - Missing required fields (list)
   - Configuration health score

2. **Schema Markup Preview Widget**:
   - Live preview of JSON-LD schema
   - Validation status (valid/invalid)
   - Test with Google Rich Results tool (link)

3. **SEO Health Checklist Widget**:
   - Organization details ✓/✗
   - Sitemap configured ✓/✗
   - llms.txt published ✓/✗
   - Schema markup valid ✓/✗

4. **Quick Links Widget**:
   - View live sitemap.xml
   - View live llms.txt
   - Test schema markup

### 8.3 Platform Management

#### 8.3.1 User Management

**Route**: `/admin/accounts/users`

**Features**:
- List all users (tutors, students, parents)
- Search by name, email, ID
- Filter by account type, status (active, suspended), admin role
- Sort by joined date, last login, total bookings
- Bulk actions: Send email, suspend, activate
- User detail view (profile, bookings, reviews, financial history)

**User Detail View** (`/admin/users/[id]`):
- Profile tab: Edit user profile, change account type, grant admin access
- Activity tab: Login history, bookings, reviews
- Financial tab: Earnings (tutors), payments (students)
- Notes tab: Admin notes (internal only, not visible to user)
- Audit tab: Admin actions on this user

**Right Sidebar (HubSidebar) Widgets**:
1. **User Statistics Widget**:
   - Total users (by account type breakdown)
   - Active users (last 30 days)
   - New signups (this month)
   - Suspended/flagged users count

2. **User Growth Chart Widget**:
   - New signups trend (last 90 days)
   - By account type (tutors vs students)

3. **Moderation Queue Widget**:
   - Pending verifications
   - Flagged profiles
   - Quick action links

4. **Quick Actions Widget**:
   - Create Admin User
   - Send Bulk Email
   - Export User Data (CSV)

#### 8.3.2 Listing Management

**Route**: `/admin/listings`

**Features**:
- List all listings (published, draft, flagged)
- Search by title, tutor name, subject
- Filter by status, moderation status, quality score
- Sort by created date, last booking, price, rating
- Bulk actions: Approve, flag, unpublish
- Listing detail view (edit listing, view stats, moderation)

**Moderation Workflow**:
1. New listing created → `moderation_status = 'pending'`
2. Admin reviews → Approve (→ published) or Flag (→ flagged + add notes) or Reject (→ rejected)
3. Flagged listings require tutor to fix issues, then resubmit
4. Automated quality checks (e.g., low-quality photos, incomplete profile) add flags

**Quality Score Calculation** (automated):
- Complete profile: 1.0
- High-quality photos (>3, >1024px): 1.0
- Detailed description (>200 chars): 1.0
- Verified credentials: 1.0
- Ratings >4.5: 1.0
- Total: 0.00 - 5.00

**Right Sidebar (HubSidebar) Widgets**:
1. **Listing Statistics Widget**:
   - Total listings (by status)
   - Pending moderation count
   - Average quality score
   - Flagged listings count

2. **Quality Distribution Chart Widget**:
   - Quality score distribution (histogram)
   - Average quality trend over time

3. **Moderation Queue Widget**:
   - Pending approvals (count + list)
   - Flagged listings (count + list)
   - Quick approve/reject buttons

4. **Quick Actions Widget**:
   - Bulk Approve Listings
   - Quality Audit Tool
   - Export Listing Data

#### 8.3.3 Booking Management

**Route**: `/admin/bookings`

**Features**:
- List all bookings (pending, confirmed, completed, cancelled)
- Search by tutor/student name, booking ID
- Filter by status, date range, subject
- Sort by booking date, amount, status
- Booking detail view (view messages, issue refund, contact support)

**Support Actions**:
- Issue full/partial refund
- Cancel booking on behalf of user
- Resolve disputes (view messages, make decision)
- Contact tutor/student (send email)

**Right Sidebar (HubSidebar) Widgets**:
1. **Booking Statistics Widget**:
   - Total bookings (by status)
   - Completed rate (%)
   - Cancellation rate (%)
   - Dispute rate (%)

2. **Revenue Chart Widget**:
   - Booking revenue trend (last 90 days)
   - Revenue by subject (pie chart)

3. **Support Queue Widget**:
   - Active disputes (count + list)
   - Pending refunds
   - Escalated issues

4. **Quick Actions Widget**:
   - Process Refund Queue
   - Contact Support
   - Export Booking Data

#### 8.3.4 Review Management

**Route**: `/admin/reviews`

**Features**:
- List all reviews (published, flagged, deleted)
- Search by tutor/student name, review text
- Filter by rating, flagged status
- Sort by date, rating, helpfulness
- Moderate reviews (approve, flag, delete)

**Moderation**:
- Automated flagging (profanity, spam patterns, fake reviews)
- Manual flag (users can report reviews)
- Admin review → Keep, Edit (remove specific content), Delete

**Right Sidebar (HubSidebar) Widgets**:
1. **Review Statistics Widget**:
   - Total reviews
   - Average rating (platform-wide)
   - Flagged reviews count
   - Deleted reviews count

2. **Rating Distribution Chart Widget**:
   - Rating distribution (1-5 stars)
   - Rating trend over time

3. **Moderation Queue Widget**:
   - Flagged reviews (count + list)
   - Auto-flagged by system
   - User-reported reviews

4. **Quick Actions Widget**:
   - Review Flagged Content
   - Bulk Delete Spam
   - Export Review Data

### 8.4 Business Analytics

#### 8.4.1 Financials

**Route**: `/admin/financials`

**Features**:
- Revenue dashboard (total, trends, breakdown by subject/tutor)
- Payout management (pending payouts, payout history)
- Transaction list (all payments, refunds, fees)
- Financial charts (revenue over time, top earning tutors, subject breakdown)

**Metrics**:
- Total revenue (lifetime, monthly, weekly)
- Platform fees collected
- Payouts processed
- Average booking value
- Refund rate

**Right Sidebar (HubSidebar) Widgets**:
1. **Financial Summary Widget**:
   - Total revenue (lifetime)
   - Revenue this month (with % change)
   - Platform fees collected
   - Pending payouts amount

2. **Revenue Trend Chart Widget**:
   - Revenue over time (line chart)
   - Monthly comparison

3. **Top Earners Widget**:
   - Top 5 tutors by revenue
   - Quick links to tutor profiles

4. **Quick Actions Widget**:
   - Process Pending Payouts
   - View Stripe Dashboard
   - Export Financial Report

#### 8.4.2 Reports

**Route**: `/admin/reports`

**Pre-built Reports**:
1. **Growth Report**: User signups, active users, retention rate
2. **Booking Report**: Total bookings, completion rate, cancellation reasons
3. **Tutor Performance**: Top tutors by bookings, revenue, ratings
4. **Subject Analysis**: Popular subjects, growth trends, pricing
5. **SEO Performance**: Hub/spoke traffic, conversions, top pages

**Report Builder** (future phase):
- Custom date ranges
- Filter by dimensions (subject, location, tutor tier)
- Export to CSV, PDF
- Schedule automated email reports

**Right Sidebar (HubSidebar) Widgets**:
1. **Report Quick Stats Widget**:
   - Total reports generated
   - Most viewed reports
   - Last generated date

2. **Report Templates Widget**:
   - Pre-built report cards
   - Click to generate instantly
   - One-click download

3. **Scheduled Reports Widget**:
   - List of scheduled reports
   - Next run times
   - Manage schedules

4. **Quick Actions Widget**:
   - Generate Custom Report
   - Schedule New Report
   - View Report History

### 8.5 System Settings

#### 8.5.1 Settings

**Route**: `/admin/settings`

**Configuration Areas**:
1. **General**: Platform name, contact email, support email
2. **Payments**: Stripe keys, platform fee percentage, payout schedule
3. **Email**: SMTP settings, email templates
4. **Notifications**: Push notification settings, email notification rules
5. **Integrations**: Third-party API keys (ChatGPT, analytics, etc.)

#### 8.5.2 Team Management

**Route**: `/admin/team`

**Features**:
- List admin users with roles and permissions
- Invite new admin (email → send invite link)
- Edit admin role and permissions
- Revoke admin access
- View admin activity (audit logs filtered by admin user)

**Admin Roles** (from 5.5):
- Super Admin (all permissions)
- SEO Manager (SEO sections only)
- Support (users, bookings, reviews moderation)
- Analyst (read-only access to analytics, reports)

#### 8.5.3 Audit Logs

**Route**: `/admin/audit-logs`

**Features**:
- List all admin actions (from `admin_audit_logs` table)
- Search by admin name, action type, resource
- Filter by date range, action type, admin user
- Sort by timestamp
- Export to CSV for compliance

**Columns**:
- Timestamp
- Admin user
- Action (e.g., "Published hub", "Suspended user")
- Resource (e.g., "Hub: Chemistry Tutors Sydney")
- Details (expandable JSON)

---

## 9. Implementation Plan

### 9.1 Phase Breakdown

#### Phase 0: Foundation (Week 1) - 40 hours

**Goal**: Set up admin dashboard shell and authentication.

**Tasks**:
1. **Database Schema** (8 hours):
   - Create `admin_audit_logs`, `admin_notifications`, `admin_saved_filters` tables
   - Add admin fields to `profiles` table
   - Create indexes and RLS policies
   - Write database functions (`capture_daily_statistics`, `log_admin_action`)

2. **Admin Layout Components** (16 hours):
   - `AdminLayout` component
   - `AdminSidebar` component with navigation
   - `AdminTopBar` component with breadcrumbs, search trigger, notifications, user menu
   - Responsive styles (desktop, tablet, mobile)
   - Sidebar collapse functionality

3. **Authentication & Middleware** (8 hours):
   - Update middleware for `/admin` route protection
   - Implement role-based permission checks
   - Create `useAdminAuth` hook for client components
   - Create initial super admin user (manual SQL insert)

4. **Admin Dashboard Home** (8 hours):
   - `/admin/page.tsx` - Dashboard overview
   - `StatsCard` component
   - Fetch and display key metrics (using `platform_statistics_daily`)
   - Basic charts (use Recharts library)

**Deliverables**:
- Admin dashboard accessible at `/admin`
- Persistent sidebar with navigation groups
- Dashboard page with key metrics
- Admin-only access enforced

#### Phase 1: SEO Management (Week 2-3) - 60 hours

**Goal**: Implement SEO Hub/Spoke management and citation tracking.

**Tasks**:

1. **Hub Manager** (24 hours):
   - `/admin/seo/hubs/page.tsx` - Hub list page
   - `DataTable` component for hub list
   - Search, filter, sort functionality
   - Bulk actions (publish, unpublish, delete)
   - `/admin/seo/hubs/[id]/page.tsx` - Hub detail/edit page
   - Hub edit form (use `FormBuilder` + `RichTextEditor`)
   - Hub preview functionality
   - Performance metrics display (rank, citations, views)

2. **Spoke Manager** (16 hours):
   - `/admin/seo/spokes/page.tsx` - Spoke list page (similar to hubs)
   - `/admin/seo/spokes/[id]/page.tsx` - Spoke detail/edit page
   - Parent hub selector

3. **Citation Tracker** (12 hours):
   - `/admin/seo/citations/page.tsx` - Citation list page
   - Citation chart (citations over time by source)
   - Search and filter citations
   - Alert configuration

4. **SEO Configuration** (8 hours):
   - `/admin/seo/config/page.tsx` - Configuration form
   - Multi-tab form (Organization, SEO Settings, AI Optimization)
   - Save configuration to `seo_config` table

**Deliverables**:
- Full SEO content management (create, edit, publish hubs/spokes)
- Citation tracking dashboard
- SEO configuration interface

#### Phase 2: Platform Management (Week 3-4) - 60 hours

**Goal**: Implement user, listing, booking, review management.

**Tasks**:

1. **User Management** (16 hours):
   - `/admin/users/page.tsx` - User list page
   - Search, filter (account type, status), sort
   - Bulk actions (send email, suspend, activate)
   - `/admin/users/[id]/page.tsx` - User detail page (tabs: Profile, Activity, Financial, Notes, Audit)
   - Edit user profile form
   - Grant/revoke admin access

2. **Listing Management** (16 hours):
   - `/admin/listings/page.tsx` - Listing list page
   - Search, filter (status, moderation status, quality score), sort
   - Bulk moderation actions
   - `/admin/listings/[id]/page.tsx` - Listing detail page
   - Moderation workflow (approve, flag, reject + notes)
   - Quality score display

3. **Booking Management** (14 hours):
   - `/admin/bookings/page.tsx` - Booking list page
   - Search, filter (status, date range), sort
   - `/admin/bookings/[id]/page.tsx` - Booking detail page
   - Support actions (issue refund, cancel booking, contact users)

4. **Review Management** (14 hours):
   - `/admin/reviews/page.tsx` - Review list page
   - Search, filter (rating, flagged), sort
   - Moderation actions (approve, flag, delete, edit)
   - Automated flagging system (profanity detection, spam patterns)

**Deliverables**:
- Complete platform moderation capabilities
- User, listing, booking, review management
- Support tools for customer service

#### Phase 3: Business Analytics & System (Week 5) - 40 hours

**Goal**: Implement financials, reports, settings, team management, audit logs.

**Tasks**:

1. **Financials** (12 hours):
   - `/admin/financials/page.tsx` - Financial dashboard
   - Revenue stats and charts
   - Payout management list
   - Transaction list (payments, refunds, fees)

2. **Reports** (12 hours):
   - `/admin/reports/page.tsx` - Reports dashboard
   - Pre-built report templates (Growth, Booking, Tutor Performance, Subject Analysis, SEO Performance)
   - Date range selector
   - Export to CSV

3. **Settings** (8 hours):
   - `/admin/settings/page.tsx` - Settings form (multi-tab)
   - Save settings to database (new `admin_settings` table or `seo_config` table)

4. **Team Management** (4 hours):
   - `/admin/team/page.tsx` - Admin user list
   - Invite admin, edit role, revoke access
   - Admin activity view

5. **Audit Logs** (4 hours):
   - `/admin/audit-logs/page.tsx` - Audit log list
   - Search, filter, export

**Deliverables**:
- Financial overview and transaction management
- Pre-built analytics reports
- System settings management
- Admin team management
- Compliance-ready audit logs

### 9.2 Implementation Details

#### Component Reuse Strategy

**From Existing Hub System** (80% reuse):
- `HubPageLayout` - Wrap admin content areas
- `HubHeader` - Page titles, filters, actions
- `HubTabs` - Tab navigation for detail views
- `HubPagination` - Paginate lists
- Filter styles - Search inputs, select dropdowns, date pickers
- Action styles - Buttons, dropdown menus

**New Admin-Specific** (20% new):
- `AdminLayout` - Persistent sidebar + top bar shell
- `AdminSidebar` - Left navigation
- `AdminTopBar` - Breadcrumbs, search, notifications
- `DataTable` - Advanced table with sorting, filtering, bulk actions
- `StatsCard` - Metric cards with trends
- `CommandPalette` - Cmd+K search
- `RichTextEditor` - Tiptap-based content editor
- `FormBuilder` - Dynamic form generation

#### API Route Pattern

**Server Actions for Mutations**:
```typescript
// /apps/web/src/app/actions/admin/hubs.ts
'use server';

export async function createHub(data: HubFormData) {
  const session = await getServerSession();

  // Check admin permissions
  if (!session?.user?.is_admin) {
    throw new Error('Unauthorized');
  }

  // Validate data
  const validated = hubSchema.parse(data);

  // Insert to database
  const { data: hub, error } = await supabase
    .from('seo_hubs')
    .insert({
      ...validated,
      created_by: session.user.id,
      status: 'draft'
    })
    .select()
    .single();

  if (error) throw error;

  // Log admin action
  await logAdminAction({
    admin_id: session.user.id,
    action: 'create',
    resource_type: 'seo_hub',
    resource_id: hub.id,
    details: { hub_title: hub.title }
  });

  revalidatePath('/admin/seo/hubs');
  return hub;
}
```

**React Query for Data Fetching**:
```typescript
// Client component
'use client';

export default function HubListPage() {
  const { data: hubs, isLoading } = useQuery({
    queryKey: ['admin-hubs', filters],
    queryFn: async () => {
      const res = await fetch('/api/admin/hubs?' + new URLSearchParams(filters));
      return res.json();
    }
  });

  const createHubMutation = useMutation({
    mutationFn: createHub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hubs'] });
      toast.success('Hub created successfully');
    }
  });

  // ...
}
```

#### Audit Logging Helper

```typescript
// /apps/web/src/lib/admin/audit.ts

export async function logAdminAction(params: {
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
}) {
  const { data, error } = await supabase
    .from('admin_audit_logs')
    .insert({
      ...params,
      ip_address: await getClientIP(),
      user_agent: headers().get('user-agent')
    });

  if (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw - logging failure shouldn't break the main action
  }

  return data;
}

// Decorator for automatic logging
export function withAuditLog(
  action: string,
  resourceType: string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      await logAdminAction({
        admin_id: this.session.user.id,
        action,
        resource_type: resourceType,
        resource_id: result?.id,
        details: { args, result }
      });

      return result;
    };

    return descriptor;
  };
}

// Usage
class HubService {
  @withAuditLog('create', 'seo_hub')
  async createHub(data: HubFormData) {
    // ... implementation
  }
}
```

### 9.3 Testing Strategy

**Unit Tests**:
- Component tests (Jest + React Testing Library)
- API route tests (Vitest)
- Database function tests (pgTAP)

**Integration Tests**:
- Admin workflow tests (create hub → edit → publish)
- Permission tests (role-based access control)
- Audit logging tests (ensure all actions logged)

**E2E Tests** (Playwright):
- Critical paths (create/edit/publish hub, moderate listing, issue refund)
- Multi-role tests (super admin vs SEO manager)

**Performance Tests**:
- Large dataset handling (10k+ hubs, 100k+ users)
- Query optimization (ensure indexes used)
- Load time targets (<2s for list pages, <1s for detail pages)

---

## 10. Cost & Timeline

### 10.1 Development Effort

| Phase | Scope | Hours | Developer Cost ($80/hr) |
|-------|-------|-------|------------------------|
| Phase 0 | Foundation | 40 | $3,200 |
| Phase 1 | SEO Management | 60 | $4,800 |
| Phase 2 | Platform Management | 60 | $4,800 |
| Phase 3 | Business & System | 40 | $3,200 |
| **Total** | **Full Admin Dashboard** | **200** | **$16,000** |

**Designer Effort** (Part-time):
- UI/UX design for admin components: 20 hours @ $100/hr = $2,000
- **Total Design Cost**: $2,000

**Total Project Cost**: $18,000

### 10.2 Timeline

**Aggressive Timeline** (1 developer, full-time):
- Week 1: Phase 0 (Foundation)
- Week 2-3: Phase 1 (SEO Management)
- Week 3-4: Phase 2 (Platform Management)
- Week 5: Phase 3 (Business & System)
- **Total: 5 weeks**

**Conservative Timeline** (1 developer, part-time 20hr/week):
- **Total: 10 weeks**

**Parallel Development** (2 developers):
- Developer 1: Phase 0 → Phase 1 (SEO)
- Developer 2: Phase 2 (Platform) → Phase 3 (Business)
- **Total: 3 weeks**

### 10.3 Ongoing Costs

**Maintenance** (after launch):
- Bug fixes and minor enhancements: 10 hours/month = $800/month
- Feature additions (new reports, integrations): As needed

**Infrastructure**:
- No additional costs (uses existing Supabase, Vercel)

---

## 11. Success Metrics

### 11.1 Launch Metrics (First 30 Days)

**Adoption**:
- 100% of admin users access dashboard (target: 5 admin users)
- Average 5+ logins per admin per week
- SEO Manager creates/edits 10+ hubs

**Performance**:
- Page load time <2s for list pages
- Page load time <1s for detail pages
- Zero critical bugs

**Usage**:
- 50+ admin actions logged (create, edit, publish, moderate)
- 100% of admin actions have audit logs

### 11.2 3-Month Metrics

**Efficiency Gains**:
- SEO content publishing time reduced from 2 hours to 30 minutes (75% reduction)
- Listing moderation time reduced from 10 min to 2 min per listing (80% reduction)
- Support response time reduced from 24 hours to 4 hours (83% reduction)

**Content Growth** (enabled by admin):
- 50+ Hub pages published
- 300+ Spoke pages published
- 10+ ChatGPT citations detected

**Platform Health**:
- 95% of listings approved within 24 hours
- 100% of flagged reviews moderated within 48 hours
- Zero compliance issues (audit logs complete)

### 11.3 6-Month Metrics

**Business Impact**:
- SEO traffic up 200% (from Hub/Spoke content)
- 5+ Page 1 Google rankings for target keywords
- 20+ ChatGPT citations for Tutorwise content
- Admin team scaled to 10+ users (SEO, Support, Analyst roles)

**ROI**:
- Engineering time savings: 20 hours/week = $6,400/month
- ROI payback period: 3 months ($18,000 / $6,400)

---

## 12. Risk Mitigation

### 12.1 Technical Risks

**Risk**: Scalability issues with large datasets (10k+ hubs, 100k+ users)

**Mitigation**:
- Implement cursor-based pagination (not offset-based)
- Add database indexes on all search/filter fields
- Use database materialized views for expensive queries
- Load test with simulated large datasets before launch

**Risk**: Security vulnerabilities (unauthorized admin access, data leaks)

**Mitigation**:
- Implement comprehensive RLS policies in Supabase
- Add middleware protection for all `/admin` routes
- Regular security audits (manual code review + automated tools)
- Principle of least privilege (granular role permissions)
- Complete audit logging for compliance

**Risk**: Performance degradation on complex admin queries

**Mitigation**:
- Use database functions for complex aggregations (not client-side)
- Implement Redis caching for frequently accessed data
- Server-side rendering for initial data load (Next.js App Router)
- Optimize SQL queries (use EXPLAIN ANALYZE in development)

### 12.2 Product Risks

**Risk**: Admin users find interface confusing or hard to use

**Mitigation**:
- User testing with 2-3 team members before launch
- Comprehensive onboarding guide and tooltips
- Video tutorials for key workflows
- Iterative feedback loop (monthly admin user interviews)

**Risk**: Feature creep delays launch

**Mitigation**:
- Strict scope adherence to Phase 0-3 (no new features until launch)
- MVP approach (80/20 rule - prioritize high-impact features)
- Post-launch roadmap for additional features (Phase 4+)

### 12.3 Operational Risks

**Risk**: Insufficient admin training leads to errors

**Mitigation**:
- Written documentation for all admin sections
- Role-based training (SEO Manager, Support, etc.)
- Sandbox environment for practice (copy of production data)
- Confirmation dialogs for destructive actions (delete, suspend)

**Risk**: Data loss or corruption from admin errors

**Mitigation**:
- Soft deletes (mark as deleted, don't remove from database)
- Audit logs enable rollback (track old/new values)
- Database backups every 6 hours
- Version history for SEO content (store edit history in JSONB field)

---

## 13. Appendices

### 13.1 Component Library

**Admin-Specific Components**:
- `AdminLayout` - Shell with sidebar and top bar
- `AdminSidebar` - Persistent left navigation
- `AdminTopBar` - Breadcrumbs, search, notifications, user menu
- `DataTable` - Advanced table with sorting, filtering, bulk actions
- `StatsCard` - Metric card with trend indicator
- `CommandPalette` - Cmd+K search
- `RichTextEditor` - Tiptap-based content editor
- `FormBuilder` - Dynamic form from schema
- `BulkActionToolbar` - Toolbar for bulk actions
- `NotificationCenter` - Notification dropdown
- `UserMenu` - User avatar, name, role, sign out

**Reused Hub Components**:
- `HubPageLayout` - Content area wrapper
- `HubHeader` - Page title, filters, actions
- `HubTabs` - Tab navigation
- `HubPagination` - Pagination controls
- `HubSidebar` - Right contextual sidebar
- `SidebarWidget` - Widget wrapper for sidebars

**Shared UI Components**:
- `Button` - Primary, secondary, danger variants
- `Input` - Text input with validation
- `Select` - Dropdown select
- `Textarea` - Multi-line text input
- `DatePicker` - Date selection
- `Modal` - Dialog modal
- `Toast` - Success/error notifications
- `Badge` - Status badges
- `Avatar` - User avatar
- `Tooltip` - Hover tooltips
- `Skeleton` - Loading placeholders

### 13.2 Database Schema Summary

**New Tables**:
- `admin_audit_logs` - All admin actions
- `admin_notifications` - In-app notifications
- `admin_saved_filters` - Saved filter configurations
- `platform_statistics_daily` - Daily platform metrics

**Extended Tables**:
- `profiles` - Add `is_admin`, `admin_role`, `admin_permissions`
- `seo_hubs` - Add creator, editor, performance metrics
- `listings_v4_1` - Add moderation fields, quality score
- (See Section 6 for full schemas)

### 13.3 API Routes Summary

**Admin API Routes** (`/api/admin/*`):
- `/api/admin/hubs` - CRUD for hubs
- `/api/admin/spokes` - CRUD for spokes
- `/api/admin/citations` - List citations
- `/api/admin/users` - User management
- `/api/admin/listings` - Listing management
- `/api/admin/bookings` - Booking management
- `/api/admin/reviews` - Review moderation
- `/api/admin/financials` - Financial data
- `/api/admin/reports` - Generate reports
- `/api/admin/audit-logs` - Fetch audit logs
- `/api/admin/notifications` - Manage notifications

**Server Actions** (`/app/actions/admin/*`):
- `createHub`, `updateHub`, `publishHub`, `deleteHub`
- `createSpoke`, `updateSpoke`, `publishSpoke`
- `moderateListing`, `updateQualityScore`
- `moderateReview`, `flagReview`
- `issueRefund`, `cancelBooking`
- `inviteAdmin`, `updateAdminRole`, `revokeAdminAccess`

### 13.4 Permission Matrix

| Action | Super Admin | SEO Manager | Support | Analyst |
|--------|-------------|-------------|---------|---------|
| View Dashboard | ✓ | ✓ | ✓ | ✓ |
| Manage SEO Hubs | ✓ | ✓ | ✗ | ✗ |
| View Citations | ✓ | ✓ | ✗ | ✓ |
| Manage Users | ✓ | ✗ | ✓ | ✗ |
| Moderate Listings | ✓ | ✗ | ✓ | ✗ |
| Manage Bookings | ✓ | ✗ | ✓ | ✗ |
| Moderate Reviews | ✓ | ✗ | ✓ | ✗ |
| View Financials | ✓ | ✗ | ✗ | ✓ |
| View Reports | ✓ | ✓ | ✓ | ✓ |
| Manage Settings | ✓ | ✗ | ✗ | ✗ |
| Manage Admin Team | ✓ | ✗ | ✗ | ✗ |
| View Audit Logs | ✓ | ✗ | ✗ | ✓ |

### 13.5 Future Enhancements (Phase 4+)

**Advanced Analytics**:
- Custom dashboard builder (drag-and-drop widgets)
- Advanced data visualization (heatmaps, cohort analysis)
- Predictive analytics (forecast revenue, churn prediction)

**Marketing Automation**:
- Email campaign builder
- A/B testing for SEO content
- Automated social media posting

**Customer Support**:
- In-app ticketing system
- Live chat integration
- Knowledge base management

**Mobile Admin App**:
- React Native app for iOS/Android
- Push notifications for urgent tasks
- Essential admin functions (approve listings, moderate reviews)

**AI Assistance**:
- AI-powered content suggestions for SEO
- Automated listing quality scoring
- Chatbot for common admin tasks

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | 2025-12-23 | Engineering Team | Initial draft - comprehensive admin dashboard design |

---

**Next Steps**:
1. Review and approve this design document
2. Prioritize phases based on business needs
3. Begin Phase 0 implementation (Foundation)
4. Set up project tracking (create tickets for all tasks)
5. Schedule weekly progress reviews

**Questions or Feedback**: Contact engineering team for clarification or adjustments to this design.
