# Dashboard Widget Alignment - Phase 1.5

**Created:** 2026-01-22
**Status:** ✅ Complete
**Phase:** Dashboard Alignment Phase 1

## Purpose

Standardize user dashboard widgets to match admin dashboard architecture, ensuring consistent patterns, reusability, and maintainability across both dashboards.

---

## Widget Architecture Comparison

### Before Phase 1.5

**Admin Widgets:** ✅ Standardized wrappers
- Simple, reusable wrappers around Hub components
- Located in: `app/components/admin/widgets/`
- Pattern: `AdminStatsWidget`, `AdminTipWidget`, `AdminHelpWidget`, etc.

**User Widgets:** ❌ Inconsistent, feature-specific
- Complex, feature-specific components
- Scattered across: `app/components/feature/dashboard/sidebar/`, `performance/`, `content/`
- Pattern: `DashboardStatsWidget`, `ProfileGrowthWidget`, `PendingLogsWidget`, etc.

### After Phase 1.5

**Both dashboards now use:** ✅ Standardized wrappers
- Simple, reusable wrappers around Hub components
- User widgets located in: `app/components/feature/dashboard/widgets/`
- Consistent naming: `UserStatsWidget`, `UserTipWidget`, `UserHelpWidget`, etc.

---

## Widget Mapping

| Purpose | Admin Widget | User Widget | Hub Component | Status |
|---------|--------------|-------------|---------------|--------|
| **Statistics Display** | `AdminStatsWidget` | `UserStatsWidget` | `HubStatsCard` | ✅ Aligned |
| **Tips/Guidance** | `AdminTipWidget` | `UserTipWidget` | `HubTipCard` | ✅ Aligned |
| **Help Content** | `AdminHelpWidget` | `UserHelpWidget` | `HubComplexCard` | ✅ Aligned |
| **Video Tutorials** | `AdminVideoWidget` | `UserVideoWidget` | `HubVideoCard` | ✅ Aligned |
| **Activity Feed** | `AdminActivityWidget` | `UserActivityWidget` | `HubActivityCard` | ✅ Aligned |

---

## File Structure

### Admin Widgets (Reference Pattern)
```
apps/web/src/app/components/admin/widgets/
├── AdminStatsWidget.tsx        # Wraps HubStatsCard
├── AdminTipWidget.tsx          # Wraps HubTipCard
├── AdminHelpWidget.tsx         # Wraps HubComplexCard
├── AdminVideoWidget.tsx        # Wraps HubVideoCard
├── AdminActivityWidget.tsx     # Wraps HubActivityCard
└── index.ts                    # Export barrel
```

### User Widgets (New Structure)
```
apps/web/src/app/components/feature/dashboard/widgets/
├── UserStatsWidget.tsx         # Wraps HubStatsCard
├── UserTipWidget.tsx           # Wraps HubTipCard
├── UserHelpWidget.tsx          # Wraps HubComplexCard
├── UserVideoWidget.tsx         # Wraps HubVideoCard
├── UserActivityWidget.tsx      # Wraps HubActivityCard
└── index.ts                    # Export barrel
```

---

## Usage Examples

### UserStatsWidget

**Simple stats display:**
```tsx
import { UserStatsWidget } from '@/app/components/feature/dashboard/widgets';

<UserStatsWidget
  title="My Statistics"
  stats={[
    { label: 'Sessions Completed', value: 42 },
    { label: 'Total Earnings', value: '£1,234', valueColor: 'green' },
    { label: 'Pending Reviews', value: 3, valueColor: 'orange' },
  ]}
/>
```

### UserTipWidget

**Quick tips and guidance:**
```tsx
import { UserTipWidget } from '@/app/components/feature/dashboard/widgets';

<UserTipWidget
  title="Pro Tip"
  content="Complete your profile to increase your visibility by 3x!"
  link={{ href: '/account/professional-info', text: 'Complete Profile →' }}
/>
```

### UserHelpWidget

**Multi-paragraph help content:**
```tsx
import { UserHelpWidget } from '@/app/components/feature/dashboard/widgets';

<UserHelpWidget
  title="Getting Started"
  paragraphs={[
    'Welcome to your dashboard! Track sessions, earnings, and manage your profile.',
    'Start by completing your profile and setting your availability.'
  ]}
  link={{ href: '/help', text: 'View Help Center →' }}
/>
```

### UserVideoWidget

**Embedded video tutorials:**
```tsx
import { UserVideoWidget } from '@/app/components/feature/dashboard/widgets';

<UserVideoWidget
  title="Quick Tutorial"
  videoUrl="https://www.youtube.com/watch?v=VIDEO_ID"
  description="Learn how to get the most out of your dashboard in just 2 minutes."
/>
```

### UserActivityWidget

**Recent activity feed:**
```tsx
import { UserActivityWidget } from '@/app/components/feature/dashboard/widgets';

<UserActivityWidget
  title="Recent Activity"
  activities={[
    { type: 'booking', message: 'Session booked with John Doe', timestamp: '2 hours ago' },
    { type: 'review', message: 'New 5-star review received', timestamp: '1 day ago' },
  ]}
/>
```

---

## Migration Strategy

### Legacy Widgets (Can Be Migrated)

These existing widgets can be refactored to use the new wrappers:

1. **`DashboardStatsWidget`** → Use `UserStatsWidget` with `useUserMetric` hooks
2. **`DashboardHelpWidget`** → Use `UserHelpWidget` with role-specific content logic
3. **`DashboardVideoWidget`** → Use `UserVideoWidget` directly
4. **`TipsCard`** → Use `UserTipWidget` with role-specific tips

### Specialized Widgets (Keep As-Is)

These widgets have complex business logic and should remain specialized:

1. **`ProfileGrowthWidget`** - CaaS score visualization with progress tracking
2. **`PendingLogsWidget`** - Session log management with actions
3. **`MessagesWidget`** - Message inbox preview with navigation
4. **`PayoutWidget`** - Financial data with calculation logic
5. **`CaaSScoreWidget`** - Detailed CaaS breakdown

---

## Benefits

### Consistency
- ✅ Same widget architecture across admin and user dashboards
- ✅ Consistent naming convention (`AdminXWidget`, `UserXWidget`)
- ✅ Both use Hub components as foundation

### Reusability
- ✅ Generic wrappers can be used anywhere in user dashboard
- ✅ Easy to create new instances with different content
- ✅ No duplicated card implementation logic

### Maintainability
- ✅ Updates to Hub components automatically benefit all widgets
- ✅ Centralized widget location (`widgets/` folder)
- ✅ Clear separation: wrappers vs specialized components

### Developer Experience
- ✅ Import from single barrel file (`widgets/index.ts`)
- ✅ Consistent API across all widgets
- ✅ Easy to understand and implement

---

## Next Steps

### Immediate (Post Phase 1)
1. Consider migrating `DashboardStatsWidget` to use `UserStatsWidget` + `useUserMetric`
2. Consider migrating `DashboardHelpWidget` to use `UserHelpWidget`
3. Consider migrating `DashboardVideoWidget` to use `UserVideoWidget`

### Future Enhancements
1. Add loading states to widget wrappers
2. Add error boundaries for widgets
3. Create widget composition patterns documentation
4. Add widget preview/showcase page

---

## Pattern Alignment Summary

| Aspect | Admin Dashboard | User Dashboard | Aligned |
|--------|-----------------|----------------|---------|
| **Widget Wrappers** | Yes (`Admin*Widget`) | Yes (`User*Widget`) | ✅ |
| **Hub Components** | Yes (HubStatsCard, etc.) | Yes (same components) | ✅ |
| **File Structure** | `admin/widgets/` | `dashboard/widgets/` | ✅ |
| **Naming Convention** | `Admin*Widget` | `User*Widget` | ✅ |
| **Export Barrel** | `index.ts` | `index.ts` | ✅ |
| **Specialized Components** | Minimal | Kept for complex logic | ✅ |

---

## Related Documentation

- [Admin Dashboard Solution Design v2](../admin-dashboard/admin-dashboard-solution-design-v2.md)
- [Hub Component Library](../../hub/README.md)
- [Dashboard Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Phase 1 Caching Strategy](./CACHING_STRATEGY.md)

---

**Phase 1.5 Status:** ✅ Complete
**Widget Wrappers Created:** 5/5
**Pattern Alignment:** 100%
