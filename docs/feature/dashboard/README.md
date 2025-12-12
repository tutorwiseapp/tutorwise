# Dashboard

**Status**: Active
**Last Code Update**: 2025-12-08 (Analytics Tab)
**Last Doc Update**: 2025-12-12
**Priority**: Critical (Tier 1 - Hub Architecture)
**Architecture**: Hub Layout with Role-Based KPIs

## Quick Links
- [Solution Design](./dashboard-solution-design.md) - Complete architecture
- [Implementation Guide](./dashboard-implementation.md) - Developer guide
- [AI Prompt](./dashboard-prompt.md) - AI assistant context

## Overview

The Dashboard is Tutorwise's central command center, providing role-specific metrics, charts, and actionable widgets. Built with the Hub Layout architecture, it features real-time KPIs, earnings trends, booking heatmaps, analytics tracking, and role-aware content that adapts to client, tutor, or agent contexts.

## Key Features

- **Role-Specific KPIs**: Different metrics for clients, tutors, and agents (6 cards each)
- **Earnings Trend Chart**: 6-week revenue visualization (Recharts)
- **Booking Calendar Heatmap**: 14-day booking density visualization
- **Student Type Breakdown**: New vs returning students (pie/bar chart)
- **Analytics Tab**: Profile views tracking + referrer sources breakdown
- **Pending Actions Widget**: Unread messages, pending bookings, verification alerts
- **Messages Widget**: Unread count + recent conversations preview
- **Payout Widget**: Next payout date, pending balance
- **Help & Tips Cards**: Role-specific guidance and action steps
- **Responsive Design**: Mobile-first with grid-to-stack responsive behavior

## Component Architecture

### Main Pages
- [dashboard/page.tsx](../../../apps/web/src/app/(authenticated)/dashboard/page.tsx) - Main hub (Client Component with React Query)

### Widgets (11 total)
- **KPIGrid.tsx** - 6 KPI cards (role-specific)
- **EarningsTrendChart.tsx** - Weekly revenue line chart
- **BookingCalendarHeatmap.tsx** - 14-day booking density
- **StudentTypeBreakdown.tsx** - New vs returning pie/bar chart
- **ProfileViewsTrendChart.tsx** - 30-day profile views (Analytics tab)
- **ReferrerSourcesChart.tsx** - Traffic sources breakdown (Analytics tab)
- **PendingLogsWidget.tsx** - Action items (messages, bookings, verifications)
- **MessagesWidget.tsx** - Unread messages preview
- **PayoutWidget.tsx** - Next payout info (tutors/agents only)
- **HelpCard.tsx** - Role-specific next steps
- **TipsCard.tsx** - Actionable tips

## Routes

### Pages
- `/dashboard` - Main dashboard hub (authenticated, onboarding-gated)

### API Endpoints
1. `GET /api/dashboard/kpis` - Fetch KPI data (parallel queries)
2. `GET /api/dashboard/earnings-trend?weeks=6` - 6-week revenue data
3. `GET /api/dashboard/booking-heatmap?days=14` - 14-day booking density
4. `GET /api/dashboard/student-breakdown` - New vs returning students
5. `GET /api/dashboard/profile-views-trend?days=30` - Profile views
6. `GET /api/dashboard/referrer-sources` - Traffic sources

## Database Tables

### Primary Queries
- **bookings**: Session counts, earnings, upcoming sessions
- **reviews**: Average rating, review counts
- **caas_scores**: Credibility score
- **transactions**: Earnings/spending calculations
- **profile_views** (future): View tracking
- **referrals**: Traffic source attribution

## KPI Breakdown by Role

### Tutor/Agent KPIs (6 cards)
1. **Total Earnings** - Monthly revenue (£X,XXX)
2. **Upcoming Sessions** - Next 7 days count + hours
3. **Completed Sessions** - This month count
4. **Average Rating** - Star rating from reviews
5. **Repeat Students** - Percentage (X% of Y students)
6. **CaaS Score** - Credibility score (0-100)

### Client KPIs (6 cards)
1. **Active Bookings** - Current bookings count
2. **Total Spent** - All-time spending
3. **Favorite Tutors** - Saved tutors count
4. **Total Hours Learned** - All-time hours
5. **Average Rating Given** - Reviews given
6. **CaaS Score** - Client credibility

## Dashboard Tabs

### Overview Tab
- KPI Grid (6 cards)
- Earnings Trend Chart (6 weeks)
- Booking Calendar Heatmap (14 days)
- Student Type Breakdown (pie chart)
- Pending Actions Widget
- Messages Widget
- Payout Widget (tutors/agents only)

### Analytics Tab (Added: C014 - 2025-12-08)
- Profile Views Trend Chart (30 days)
- Referrer Sources Chart (pie/bar chart)

## Charts & Visualizations

### Earnings Trend Chart
- **Library**: Recharts
- **Type**: Line chart
- **Data**: 6 weeks of earnings
- **Features**: Comparison toggle, tooltips, responsive

### Booking Calendar Heatmap
- **Type**: Calendar grid with color intensity
- **Data**: 14 days of booking density
- **Colors**: Green gradient (light → dark = 0 → 5+ bookings)
- **Features**: Hover tooltips, day-of-week labels

### Student Type Breakdown
- **Type**: Pie chart (toggle to bar chart)
- **Data**: New vs returning students
- **Colors**: Primary (#006c67) and secondary (#f59e0b)

### Profile Views Trend
- **Library**: Recharts
- **Type**: Area chart
- **Data**: 30 days of profile views
- **Features**: Smooth curves, tooltips

### Referrer Sources
- **Type**: Pie chart (toggle to bar chart)
- **Data**: Traffic sources (Direct, Search, Social, Referral)
- **Colors**: Multi-color palette

## State Management

### React Query
```typescript
queryKey: ['dashboard', 'kpis', profileId]
queryKey: ['dashboard', 'earnings-trend', profileId]
queryKey: ['dashboard', 'booking-heatmap', profileId]
queryKey: ['dashboard', 'student-breakdown', profileId]
queryKey: ['dashboard', 'profile-views-trend', profileId]
queryKey: ['dashboard', 'referrer-sources', profileId]
```

**Stale Times**:
- KPIs: 2 minutes
- Earnings Trend: 3 minutes
- Booking Heatmap: 2 minutes
- Student Breakdown: 3 minutes
- Profile Views: 5 minutes
- Referrer Sources: 5 minutes

## Error Handling

- **ErrorBoundary**: Wraps each chart component
- **Fallback UI**: "Unable to load [component]" message
- **Loading States**: Skeleton components (KPISkeleton, ChartSkeleton, WidgetSkeleton)
- **Auth Check**: Redirect to `/login` if not authenticated
- **Onboarding Gate**: Redirect to `/onboarding` if not completed

## Responsive Design

### Breakpoints
- Mobile: < 768px (single column, stacked widgets)
- Tablet: 768px - 1024px (2-column grid)
- Desktop: > 1024px (3-column grid for KPIs)

### Grid Layouts
```css
.kpiGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.chartsSection {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 1024px) {
  .chartsSection {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

## Hub Layout Integration

- **HubPageLayout**: Main container with sidebar
- **HubHeader**: Title ("My Learning Hub" / "My Teaching Studio" / "My Tutoring Agency")
- **HubTabs**: Overview | Analytics
- **HubSidebar**: HelpCard + TipsCard

## Role-Specific Content

### Client Dashboard Title
- "My Learning Hub"
- Primary Action: "Find Tutors" → `/marketplace`

### Tutor Dashboard Title
- "My Teaching Studio"
- Primary Action: "Create Listing" → `/create-listing`

### Agent Dashboard Title
- "My Tutoring Agency"
- Primary Action: "Create Listing" → `/create-listing`

## Performance Optimizations

1. **Parallel API Calls**: All KPI queries run via `Promise.all()`
2. **React Query Caching**: 2-5 minute stale times
3. **Conditional Fetching**: Analytics tab data only fetched when tab active
4. **Lazy Loading**: Charts render only when data available
5. **Error Boundaries**: Isolated failures (one chart error doesn't crash page)

## Testing Checklist

- [ ] KPI data loads correctly for each role
- [ ] Charts render with valid data
- [ ] Empty states display when no data
- [ ] Loading skeletons show during fetch
- [ ] Error boundaries catch chart failures
- [ ] Tab switching works (Overview ↔ Analytics)
- [ ] Role switcher updates KPIs
- [ ] Responsive layout adapts to mobile/tablet/desktop
- [ ] Auth redirect works for unauthenticated users
- [ ] Onboarding gate blocks incomplete users

## Integration Points

- **UserProfileContext**: Current user, role, onboarding status
- **React Query**: Data fetching, caching, background refetch
- **Supabase**: Database queries (bookings, reviews, caas_scores)
- **Hub Layout**: Shared header, tabs, sidebar components
- **Recharts**: Chart library for visualizations
- **ErrorBoundary**: Component-level error handling

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-08 | C014 | Added Analytics tab with Profile Views + Referrer Sources |
| 2025-12-03 | C013 | Migrated to Hub Layout Architecture |
| 2025-11-08 | C011 | Transformed into unified hub with aggregated stats |
| 2025-09-01 | C010 | Replaced Kinde with useUserProfile hook |
| 2025-08-26 | C009 | Converted to Client Component |

---

**Last Updated**: 2025-12-12
**Version**: C014 (Analytics Tab)
**Status**: Active - Core Platform Hub
**Architecture**: Hub Layout + React Query + Recharts
