# Signal Route Migration (Blog Orchestrator → Revenue Signal)

**Migration Date:** 2026-01-18
**Status:** ✅ Complete
**Reason:** Strategic repositioning - Signal is platform-level intelligence, not blog-specific

---

## Executive Summary

### What Changed

The Revenue Signal Analytics feature was moved from `/admin/blog/orchestrator` to top-level `/admin/signal` menu to align with the architecture specified in REVENUE-SIGNAL.md.

**Before:**
```
Admin Dashboard
└── Blog
    └── Orchestrator (blog submenu item)
```

**After:**
```
Admin Dashboard
├── Signal (top-level menu)
│   └── Analytics
└── Blog
    └── SEO Performance
```

### Why This Matters

1. **Architectural Alignment**: Signal is platform-level business intelligence that spans content, marketplace, and future experiments
2. **Future-Proof**: Makes room for Distribution, Experiments, and Attribution Models (Phases 4-7)
3. **Industry Standard**: Shopify, WordPress, HubSpot all separate analytics from content management
4. **Clarity**: "Signal" clearly indicates intelligence/analytics vs "Orchestrator" (interim name)

---

## Migration Details

### 1. Database Changes

**Migration 190:** `tools/database/migrations/190_add_signal_rbac_permissions.sql`

```sql
-- Added Signal resource permissions
INSERT INTO admin_role_permissions (role, resource, action, description)
VALUES
  ('superadmin', 'signal', '*', 'Full access to Revenue Signal platform intelligence'),
  ('admin', 'signal', 'view_analytics', 'View Revenue Signal analytics dashboard'),
  ('admin', 'signal', 'export_data', 'Export signal attribution data'),
  ('admin', 'signal', 'manage_distribution', 'Manage content distribution (future Phase 4)'),
  ('systemadmin', 'signal', 'view_analytics', 'View Revenue Signal analytics (read-only)');
```

**Key Points:**
- New `signal` resource (separate from `blog`)
- `blog:view_analytics` permissions RETAINED for SEO analytics at `/admin/blog/seo`
- Signal and Blog serve different purposes:
  - **signal:view_analytics** = Revenue attribution intelligence
  - **blog:view_analytics** = SEO performance monitoring (Google Search Console, sitemaps)

**Execution:**
```bash
# Ran on Supabase production database (lvsmtgmpoysjygdwcrir)
psql "postgresql://postgres.lvsmtgmpoysjygdwcrir:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
  -f tools/database/migrations/190_add_signal_rbac_permissions.sql
```

**Result:** ✅ 5 permissions added successfully

---

### 2. Route Changes

#### Page Routes

| Old Route | New Route | Status |
|-----------|-----------|--------|
| `/admin/blog/orchestrator` | `/admin/signal` | ✅ Moved + Redirect |

**Files Changed:**

1. **New Location:**
   - `apps/web/src/app/(admin)/admin/signal/page.tsx` (moved from orchestrator/)
   - `apps/web/src/app/(admin)/admin/signal/page.module.css` (moved from orchestrator/)

2. **Redirect (Backward Compatibility):**
   - `apps/web/src/app/(admin)/admin/blog/orchestrator/page.tsx` (now redirects)

**Redirect Implementation:**
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrchestratorRedirect() {
  const router = useRouter();

  useEffect(() => {
    console.warn('[DEPRECATED] /admin/blog/orchestrator has moved to /admin/signal');
    router.replace('/admin/signal');
  }, [router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecting to Revenue Signal Analytics...</p>
      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '1rem' }}>
        This page has moved to <a href="/admin/signal">/admin/signal</a>
      </p>
    </div>
  );
}
```

#### API Routes

| Old Route | New Route | Status |
|-----------|-----------|--------|
| `/api/admin/blog/orchestrator/stats` | `/api/admin/signal/stats` | ✅ Moved + Redirect |
| `/api/admin/blog/orchestrator/top-articles` | `/api/admin/signal/top-articles` | ✅ Moved + Redirect |
| `/api/admin/blog/orchestrator/listings` | `/api/admin/signal/listings` | ✅ Moved + Redirect |
| `/api/admin/blog/orchestrator/journey` | `/api/admin/signal/journey` | ✅ Moved + Redirect |
| `/api/admin/blog/orchestrator/attribution` | `/api/admin/signal/attribution` | ✅ Moved + Redirect |

**Files Changed:**

1. **New Locations:**
   - `apps/web/src/app/api/admin/signal/stats/route.ts`
   - `apps/web/src/app/api/admin/signal/top-articles/route.ts`
   - `apps/web/src/app/api/admin/signal/listings/route.ts`
   - `apps/web/src/app/api/admin/signal/journey/route.ts`
   - `apps/web/src/app/api/admin/signal/attribution/route.ts`

2. **Redirects (Backward Compatibility):**
   - `apps/web/src/app/api/admin/blog/orchestrator/stats/route.ts`
   - `apps/web/src/app/api/admin/blog/orchestrator/top-articles/route.ts`
   - `apps/web/src/app/api/admin/blog/orchestrator/listings/route.ts`
   - `apps/web/src/app/api/admin/blog/orchestrator/journey/route.ts`
   - `apps/web/src/app/api/admin/blog/orchestrator/attribution/route.ts`

**API Redirect Pattern:**
```typescript
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  const newUrl = `/api/admin/signal/stats${queryString ? `?${queryString}` : ''}`;

  console.warn('[DEPRECATED] /api/admin/blog/orchestrator/stats → /api/admin/signal/stats');

  return NextResponse.redirect(new URL(newUrl, request.url), {
    status: 308, // Permanent redirect
  });
}
```

**RBAC Changes in New API Routes:**

```typescript
// OLD (incorrect - bypassed RBAC)
const { data: profile } = await supabase
  .from('profiles')
  .select('roles')
  .eq('id', user.id)
  .single();

if (!profile?.roles || !profile.roles.includes('admin')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// NEW (correct - uses RBAC with signal resource)
const { data: hasPermission, error: permError } = await supabase
  .rpc('has_admin_permission', {
    p_user_id: user.id,
    p_resource: 'signal',
    p_action: 'view_analytics'
  });

if (permError) {
  console.error('[Revenue Signal] Permission check error:', permError);
  return NextResponse.json({ error: 'Permission check failed' }, { status: 500 });
}

if (!hasPermission) {
  return NextResponse.json({
    error: 'Forbidden - Requires signal:view_analytics permission'
  }, { status: 403 });
}
```

---

### 3. Navigation Changes

**File:** `apps/web/src/app/components/admin/sidebar/AdminSidebar.tsx`

**Changes Made:**

1. **Added Top-Level Signal Menu** (between Dashboard and Blog):
```typescript
{
  href: '/admin/signal',
  label: 'Signal',
  subItems: [
    { href: '/admin/signal', label: 'Analytics', indent: true },
    // Future phases:
    // { href: '/admin/signal/distribution', label: 'Distribution', indent: true },
    // { href: '/admin/signal/experiments', label: 'Experiments', indent: true },
  ],
}
```

2. **Removed Orchestrator from Blog Menu:**
```typescript
// BEFORE
{
  href: '/admin/blog',
  label: 'Blog',
  subItems: [
    { href: '/admin/blog', label: 'All Articles', indent: true },
    { href: '/admin/blog/new', label: 'New Article', indent: true },
    { href: '/admin/blog/orchestrator', label: 'Orchestrator', indent: true }, // REMOVED
    { href: '/admin/blog/seo', label: 'SEO & Analytics', indent: true },
    { href: '/admin/blog/categories', label: 'Categories', indent: true },
    { href: '/admin/blog/settings', label: 'Settings', indent: true },
  ],
}

// AFTER
{
  href: '/admin/blog',
  label: 'Blog',
  subItems: [
    { href: '/admin/blog', label: 'All Articles', indent: true },
    { href: '/admin/blog/new', label: 'New Article', indent: true },
    { href: '/admin/blog/seo', label: 'SEO Performance', indent: true }, // Renamed for clarity
    { href: '/admin/blog/categories', label: 'Categories', indent: true },
    { href: '/admin/blog/settings', label: 'Settings', indent: true },
  ],
}
```

3. **Updated Admin Dashboard Menu Order:**
```typescript
const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/signal', label: 'Signal' },       // #2 (new)
  { href: '/admin/blog', label: 'Blog' },           // #3 (moved from #11)
  { href: '/admin/dashboard', label: 'SEO & Marketplace' },
  { href: '/admin/forms', label: 'Forms' },
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/accounts', label: 'Accounts' },   // #7 (moved from #3)
  // ... rest of menu
];
```

---

### 4. Content Changes

**Dashboard Page:**
- Title: "Blog Demand Orchestrator" → "Revenue Signal Analytics"
- Subtitle: "Track how blog content drives marketplace conversions" → "Platform intelligence tracking content attribution and marketplace conversions"
- API URLs: All updated from `/api/admin/blog/orchestrator/*` to `/api/admin/signal/*`

**File Headers:**
All moved files updated with:
```typescript
/**
 * Filename: apps/web/src/app/(admin)/admin/signal/page.tsx
 * Status: ACTIVE - Revenue Signal Analytics Dashboard
 * Created: 2026-01-16
 * Moved from: /admin/blog/orchestrator (2026-01-18)
 * Reason: Signal is platform-level intelligence, not blog-specific
 */
```

---

## Backward Compatibility

### Zero-Downtime Migration

✅ All old URLs continue to work via permanent redirects (308)
✅ Event tracking continues to work (same `signal_events` table)
✅ RPCs reference existing tables (no database changes needed)
✅ RBAC migration is additive (old `blog` permissions retained for SEO)

### Redirect Behavior

**Page Redirect:**
- User visits `/admin/blog/orchestrator`
- Client-side redirect to `/admin/signal`
- Browser URL updates automatically
- User sees deprecation notice briefly

**API Redirect:**
- Client calls `/api/admin/blog/orchestrator/stats`
- Server returns 308 Permanent Redirect
- Client follows redirect to `/api/admin/signal/stats`
- Console warning logged (for developers)

**Deprecation Timeline:**
- **2026-01-18 to 2026-04-18:** Redirects active (3 months grace period)
- **2026-04-18+:** Remove redirect files (old routes return 404)

---

## Verification Steps

### 1. Test New Routes Work

```bash
# Test page loads
curl -I https://tutorwise.io/admin/signal
# Should return 200 OK

# Test API routes (with auth token)
curl -X GET "https://tutorwise.io/api/admin/signal/stats?days=30&attributionWindow=7" \
  -H "Cookie: [your-auth-cookie]"
# Should return JSON data
```

### 2. Test Old Routes Redirect

```bash
# Test page redirect
curl -I https://tutorwise.io/admin/blog/orchestrator
# Should return 308 Permanent Redirect
# Location: /admin/signal

# Test API redirect
curl -I "https://tutorwise.io/api/admin/blog/orchestrator/stats?days=30"
# Should return 308 Permanent Redirect
# Location: /api/admin/signal/stats?days=30
```

### 3. Test RBAC Permissions

```sql
-- Verify signal permissions exist
SELECT * FROM admin_role_permissions WHERE resource = 'signal';
-- Should return 5 rows

-- Test user permission
SELECT has_admin_permission(
  (SELECT id FROM profiles WHERE email = 'your@email.com'),
  'signal',
  'view_analytics'
);
-- Should return true for admin/superadmin
```

### 4. Test Navigation

1. Log into admin dashboard
2. Check sidebar shows "Signal" menu item (between Dashboard and Blog)
3. Click "Signal" → Should expand to show "Analytics" submenu
4. Click "Analytics" → Should navigate to `/admin/signal`
5. Verify "Blog" menu does NOT show "Orchestrator" anymore

---

## Related Migrations

| Migration | Purpose | Date | Status |
|-----------|---------|------|--------|
| 179 | Create signal_events table | 2026-01-14 | ✅ Complete |
| 180 | Create signal_metrics table | 2026-01-15 | ✅ Complete |
| 181 | Create signal_distributions table | 2026-01-15 | ✅ Complete |
| 182 | Add signal journey RPCs | 2026-01-16 | ✅ Complete |
| 187 | Update RPCs to use signal_events | 2026-01-17 | ✅ Complete |
| 189 | Add blog RBAC permissions | 2026-01-18 | ✅ Complete |
| **190** | **Add signal RBAC permissions** | **2026-01-18** | **✅ Complete** |

---

## Impact Analysis

### Frontend Impact

- ✅ Old bookmarks to `/admin/blog/orchestrator` still work (redirect)
- ✅ Direct navigation to `/admin/signal` works
- ✅ Sidebar menu updated (no broken links)
- ✅ API calls updated in dashboard component

### Backend Impact

- ✅ New RBAC resource (`signal`) created
- ✅ Old RBAC resource (`blog`) retained for SEO functionality
- ✅ API routes moved and redirects added
- ✅ No database schema changes (uses existing tables)

### User Impact

- ✅ No action required from users
- ✅ Bookmarks automatically redirect
- ✅ No data loss or downtime
- ⚠️ Users see brief deprecation notice when redirecting

### Developer Impact

- ✅ Update local development environment (git pull)
- ✅ Update API URLs in frontend code (if hardcoded)
- ⚠️ Review console warnings for deprecated route usage
- ⚠️ Update documentation references to new routes

---

## Rollback Plan

If the migration causes critical issues:

### 1. Immediate Rollback (Revert Git Commit)

```bash
# Revert the migration commit
git revert 5d8e7140

# Push to production
git push origin main
```

This will:
- ✅ Remove Signal menu from sidebar
- ✅ Restore Orchestrator to Blog menu
- ✅ Remove /admin/signal routes
- ✅ Remove redirect files
- ⚠️ Users will see 404 if they bookmarked /admin/signal

### 2. Database Rollback (Remove Signal Permissions)

```sql
-- Remove signal permissions
DELETE FROM admin_role_permissions WHERE resource = 'signal';
```

**Warning:** Only rollback if absolutely necessary. Prefer fixing forward.

---

## Future Phases

This migration positions Signal for future expansion:

### Phase 4: Distribution (Frozen v1)
- Menu: Signal → Distribution
- Route: `/admin/signal/distribution`
- Permission: `signal:manage_distribution`

### Phase 6: Attribution Models
- Menu: Signal → Attribution Models
- Route: `/admin/signal/attribution`
- Permission: `signal:configure_models`

### Phase 7: Experiments (A/B Testing)
- Menu: Signal → Experiments
- Route: `/admin/signal/experiments`
- Permission: `signal:manage_experiments`

---

## Lessons Learned

1. **Naming Matters**: "Orchestrator" was an interim name that caused confusion
2. **Architecture First**: Should have aligned with spec from the beginning
3. **RBAC is Critical**: Proper permission separation prevents future refactoring
4. **Redirects Enable Zero-Downtime**: 308 redirects allow safe route changes
5. **Future-Proof Early**: Top-level menu makes room for expansion

---

## Related Documentation

- [REVENUE-SIGNAL.md](./REVENUE-SIGNAL.md) - Complete specification
- [RBAC-ALIGNMENT.md](./RBAC-ALIGNMENT.md) - RBAC system overview
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [../../../.ai/3-SYSTEM-NAVIGATION.md](../../../.ai/3-SYSTEM-NAVIGATION.md) - System-wide navigation

---

## Git Commits

| Commit | Description | Date |
|--------|-------------|------|
| `ff5989f6` | Reorder admin dashboard navigation menu | 2026-01-18 |
| `5d8e7140` | Strategic migration: Blog Orchestrator → Revenue Signal | 2026-01-18 |

**Pull Request:** [Link to PR once created]

---

**Status:** ✅ Migration Complete
**Last Updated:** 2026-01-18
**Next Review:** 2026-04-18 (remove redirects)
