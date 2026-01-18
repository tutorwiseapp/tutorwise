# Blog Orchestrator RBAC Alignment

## Critical Fix: 2026-01-18

### Problem

The Blog Demand Orchestrator was initially implemented with **incorrect** authentication checks that bypassed the platform's Role-Based Access Control (RBAC) system.

**What was wrong:**
```typescript
// WRONG - Used simple roles array check
const { data: profile } = await supabase
  .from('profiles')
  .select('roles')
  .eq('id', user.id)
  .single();

if (!profile?.roles || !profile.roles.includes('admin')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

This approach:
- ❌ Bypassed the RBAC permission system
- ❌ Ignored role hierarchy and permission granularity
- ❌ Skipped audit logging
- ❌ Created architectural inconsistency with other admin features

### Solution

All 5 Blog Orchestrator API routes were updated to use the proper RBAC system:

**Correct implementation:**
```typescript
// RIGHT - Uses RBAC permission check
const { data: hasPermission, error: permError } = await supabase
  .rpc('has_admin_permission', {
    p_user_id: user.id,
    p_resource: 'blog',
    p_action: 'view_analytics'
  });

if (permError) {
  console.error('[Blog Orchestrator] Permission check error:', permError);
  return NextResponse.json({ error: 'Permission check failed' }, { status: 500 });
}

if (!hasPermission) {
  return NextResponse.json({
    error: 'Forbidden - Requires blog:view_analytics permission'
  }, { status: 403 });
}
```

## Migration 189: Blog Permissions

### Permissions Added

```sql
INSERT INTO admin_role_permissions (role, resource, action, description)
VALUES
  -- Superadmin: Full blog access
  ('superadmin', 'blog', '*', 'Full access to blog management and analytics'),

  -- Admin: View and manage blog analytics
  ('admin', 'blog', 'view_analytics', 'View Blog Demand Orchestrator analytics'),
  ('admin', 'blog', 'export_data', 'Export blog attribution data'),
  ('admin', 'blog', 'manage_content', 'Manage blog articles and categories'),

  -- System Admin: View-only analytics
  ('systemadmin', 'blog', 'view_analytics', 'View Blog Demand Orchestrator analytics (read-only)');
```

### Permission Matrix

| Role | Resource | Actions | Description |
|------|----------|---------|-------------|
| `superadmin` | `blog` | `*` (all) | Full access to blog management and analytics |
| `admin` | `blog` | `view_analytics` | View Blog Demand Orchestrator analytics |
| `admin` | `blog` | `export_data` | Export blog attribution data |
| `admin` | `blog` | `manage_content` | Manage blog articles and categories |
| `systemadmin` | `blog` | `view_analytics` | View-only (read-only analytics) |
| `supportadmin` | `blog` | ❌ None | No blog access |

## Affected Files

### API Routes (All Fixed)

1. `apps/web/src/app/api/admin/blog/orchestrator/stats/route.ts`
   - Permission: `blog:view_analytics`
   - Returns: Overview stats (performance + funnel)

2. `apps/web/src/app/api/admin/blog/orchestrator/top-articles/route.ts`
   - Permission: `blog:view_analytics`
   - Returns: Top-performing articles sorted by revenue

3. `apps/web/src/app/api/admin/blog/orchestrator/listings/route.ts`
   - Permission: `blog:view_analytics`
   - Returns: Blog-assisted listings with visibility signals

4. `apps/web/src/app/api/admin/blog/orchestrator/journey/route.ts`
   - Permission: `blog:view_analytics`
   - Returns: Signal journey for multi-touch attribution

5. `apps/web/src/app/api/admin/blog/orchestrator/attribution/route.ts`
   - Permission: `blog:view_analytics`
   - Returns: Attribution model comparison (First/Last/Linear)

### Database

- **Migration:** `tools/database/migrations/189_add_blog_orchestrator_permissions.sql`
- **Table:** `admin_role_permissions`
- **Function:** `has_admin_permission(p_user_id, p_resource, p_action)`

## RBAC System Overview

### Architecture

The TutorWise platform uses a comprehensive RBAC system:

**Database Schema:**
- `profiles.is_admin` - Boolean flag (primary admin indicator)
- `profiles.admin_role` - Role: `superadmin`, `admin`, `systemadmin`, `supportadmin`
- `profiles.admin_role_level` - Hierarchy: 1-4 (4 = highest)
- `admin_role_permissions` - Role-based permissions (resource + action)
- `admin_user_permission_overrides` - User-specific permission overrides
- `admin_audit_logs` - Audit trail for all admin actions

**Permission Check Order:**
1. User-specific overrides (highest priority)
2. Role-based permissions
3. Wildcard permissions (`*`, `*`)

### Role Hierarchy

```
Level 4: Superadmin    - Full platform access, can manage all admins
Level 3: Admin         - SEO & content management, can manage lower admins
Level 2: System Admin  - Platform config & monitoring, can manage support admins
Level 1: Support Admin - User support & moderation
```

### Usage Pattern

**Correct API route pattern:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 1. Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. RBAC permission check
  const { data: hasPermission, error: permError } = await supabase
    .rpc('has_admin_permission', {
      p_user_id: user.id,
      p_resource: 'blog',  // Resource being accessed
      p_action: 'view_analytics'  // Action being performed
    });

  if (permError) {
    console.error('Permission check error:', permError);
    return NextResponse.json({ error: 'Permission check failed' }, { status: 500 });
  }

  if (!hasPermission) {
    return NextResponse.json({
      error: 'Forbidden - Requires blog:view_analytics permission'
    }, { status: 403 });
  }

  // 3. Perform authorized action
  // ...
}
```

## Benefits of RBAC Alignment

1. **Security**: Consistent permission checks across all admin features
2. **Auditability**: All admin actions logged in `admin_audit_logs`
3. **Flexibility**: Can grant/revoke specific permissions without role changes
4. **Hierarchy**: Respects role levels (superadmin > admin > systemadmin > supportadmin)
5. **Maintainability**: Single source of truth for permissions
6. **Scalability**: Easy to add new resources and actions

## Future Permissions (Frozen - Phase 4+)

If Blog Distribution is implemented in the future:

```sql
-- Phase 4: Blog Distribution
INSERT INTO admin_role_permissions (role, resource, action, description)
VALUES
  ('admin', 'blog', 'publish', 'Publish blog articles'),
  ('admin', 'blog', 'schedule', 'Schedule blog distribution'),
  ('admin', 'blog', 'manage_distribution', 'Manage blog distribution settings');
```

## Related Documentation

- [Admin Dashboard Setup](../../admin-dashboard/SETUP.md)
- [RBAC System Design](../../rbac-design.md) (if exists)
- [Seed Scripts README](../../../tools/database/seeds/README.md)
- [Migration 135-136](../../../tools/database/migrations/) - Original RBAC implementation
- [Migration 189](../../../tools/database/migrations/189_add_blog_orchestrator_permissions.sql) - Blog permissions

## Rollback

If the RBAC alignment causes issues:

```sql
-- Remove blog permissions
DELETE FROM admin_role_permissions WHERE resource = 'blog';

-- Revert API routes to simple roles check (NOT RECOMMENDED)
```

**Warning:** Rolling back is NOT recommended. Fix permissions instead.

## Verification

Check your permissions:

```sql
-- View all blog permissions
SELECT * FROM admin_role_permissions WHERE resource = 'blog';

-- Check if user has permission
SELECT has_admin_permission(
  (SELECT id FROM profiles WHERE email = 'your@email.com'),
  'blog',
  'view_analytics'
);

-- View user's admin role
SELECT id, email, is_admin, admin_role, admin_role_level
FROM profiles
WHERE email = 'your@email.com';
```

## Lessons Learned

1. **Always check existing patterns** before implementing new features
2. **RBAC is non-negotiable** for admin features - shortcuts create security debt
3. **Architectural consistency** prevents fragmentation and maintenance nightmares
4. **Test admin access** during implementation, not after deployment

---

**Status:** ✅ Fixed 2026-01-18
**Migration:** 189 ✅ **RUN ON DATABASE** (2026-01-18)
**Files Updated:** 5 API routes + 1 migration
**Impact:** All Blog Orchestrator features now properly secured with RBAC

## Migration Execution Log

**Date Executed:** 2026-01-18
**Database:** Supabase Production (lvsmtgmpoysjygdwcrir)
**Executed By:** Migration script via psql

**Verification:**
- ✅ 5 blog permissions added to `admin_role_permissions`
- ✅ `has_admin_permission()` RPC verified working
- ✅ Superadmin user (micquan@gmail.com) has blog access
- ✅ All 5 Blog Orchestrator API routes now use RBAC

---

## Migration 190: Signal Resource Migration (2026-01-18)

### Strategic Context

After implementing Migration 189 (Blog Orchestrator RBAC), we discovered an architectural misalignment:

**The Problem:**
- Blog Orchestrator was positioned as a blog feature (under `/admin/blog` menu)
- But the REVENUE-SIGNAL.md spec defines Signal as **platform-level intelligence**
- Signal spans content, marketplace, experiments, and future phases
- Treating Signal as a blog sub-feature limited future expansion

**The Solution:**
- Separate `signal` resource from `blog` resource in RBAC
- Move Signal to top-level menu (`/admin/signal`)
- Keep blog permissions for blog-specific SEO analytics
- Position Signal for future phases (Distribution, Experiments, Attribution Models)

### Migration 190 Details

**File:** `tools/database/migrations/190_add_signal_rbac_permissions.sql`

**Permissions Added:**

```sql
INSERT INTO admin_role_permissions (role, resource, action, description)
VALUES
  -- Superadmin: Full Signal access
  ('superadmin', 'signal', '*', 'Full access to Revenue Signal platform intelligence'),

  -- Admin: View and manage Signal analytics
  ('admin', 'signal', 'view_analytics', 'View Revenue Signal analytics dashboard'),
  ('admin', 'signal', 'export_data', 'Export signal attribution data'),
  ('admin', 'signal', 'manage_distribution', 'Manage content distribution (future Phase 4)'),

  -- System Admin: View-only Signal analytics
  ('systemadmin', 'signal', 'view_analytics', 'View Revenue Signal analytics (read-only)')

ON CONFLICT (role, resource, action) DO NOTHING;
```

### Permission Matrix: Signal vs Blog

| Role | Signal Resource | Blog Resource |
|------|----------------|---------------|
| `superadmin` | `*` (all) - Platform intelligence | `*` (all) - Content management |
| `admin` | `view_analytics`, `export_data`, `manage_distribution` | `view_analytics`, `export_data`, `manage_content` |
| `systemadmin` | `view_analytics` (read-only) | `view_analytics` (read-only) |
| `supportadmin` | ❌ None | ❌ None |

**Key Distinction:**
- **signal:view_analytics** = Revenue attribution intelligence at `/admin/signal`
- **blog:view_analytics** = SEO performance monitoring at `/admin/blog/seo`

Both resources coexist because they serve different purposes:
- Signal = Business intelligence (attribution, experiments, distribution)
- Blog = Content management (articles, SEO, categories)

### Routes Migrated

**Before Migration 190:**
```
/admin/blog/orchestrator                     (Signal analytics under Blog menu)
/api/admin/blog/orchestrator/stats           (Used blog:view_analytics)
/api/admin/blog/orchestrator/top-articles    (Used blog:view_analytics)
/api/admin/blog/orchestrator/listings        (Used blog:view_analytics)
/api/admin/blog/orchestrator/journey         (Used blog:view_analytics)
/api/admin/blog/orchestrator/attribution     (Used blog:view_analytics)
```

**After Migration 190:**
```
/admin/signal                                (Signal analytics - top-level menu)
/api/admin/signal/stats                      (Uses signal:view_analytics)
/api/admin/signal/top-articles               (Uses signal:view_analytics)
/api/admin/signal/listings                   (Uses signal:view_analytics)
/api/admin/signal/journey                    (Uses signal:view_analytics)
/api/admin/signal/attribution                (Uses signal:view_analytics)

/admin/blog/orchestrator                     (Permanent redirect to /admin/signal)
/api/admin/blog/orchestrator/*               (Permanent redirects - backward compatibility)
```

### Code Changes

**API Route RBAC Update:**

```typescript
// BEFORE (Migration 189 - blog resource)
const { data: hasPermission, error: permError } = await supabase
  .rpc('has_admin_permission', {
    p_user_id: user.id,
    p_resource: 'blog',
    p_action: 'view_analytics'
  });

if (!hasPermission) {
  return NextResponse.json({
    error: 'Forbidden - Requires blog:view_analytics permission'
  }, { status: 403 });
}

// AFTER (Migration 190 - signal resource)
const { data: hasPermission, error: permError } = await supabase
  .rpc('has_admin_permission', {
    p_user_id: user.id,
    p_resource: 'signal',
    p_action: 'view_analytics'
  });

if (!hasPermission) {
  return NextResponse.json({
    error: 'Forbidden - Requires signal:view_analytics permission'
  }, { status: 403 });
}
```

**Files Updated:**
- `apps/web/src/app/api/admin/signal/stats/route.ts` (new location)
- `apps/web/src/app/api/admin/signal/top-articles/route.ts` (new location)
- `apps/web/src/app/api/admin/signal/listings/route.ts` (new location)
- `apps/web/src/app/api/admin/signal/journey/route.ts` (new location)
- `apps/web/src/app/api/admin/signal/attribution/route.ts` (new location)

**Backward Compatibility:**
- Old routes redirect with 308 Permanent Redirect
- Console warnings logged for deprecated route usage
- 3-month grace period (2026-01-18 to 2026-04-18)

### Execution

```bash
# Ran on Supabase Production
psql "postgresql://postgres.lvsmtgmpoysjygdwcrir:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
  -f tools/database/migrations/190_add_signal_rbac_permissions.sql
```

**Result:**
```
INSERT 0 5
```

**Verification:**
```sql
SELECT * FROM admin_role_permissions WHERE resource = 'signal';
```

Returns 5 rows:
- `superadmin`, `signal`, `*`
- `admin`, `signal`, `view_analytics`
- `admin`, `signal`, `export_data`
- `admin`, `signal`, `manage_distribution`
- `systemadmin`, `signal`, `view_analytics`

### Benefits of Separation

1. **Architectural Clarity**: Signal is platform intelligence, Blog is content management
2. **Future-Proof**: Signal can expand to Distribution, Experiments, Attribution Models (Phases 4-7)
3. **Permission Granularity**: Can grant Signal analytics access without blog content access
4. **Menu Organization**: Top-level Signal menu clearly separates intelligence from content
5. **Industry Standard**: Matches patterns in Shopify, WordPress, HubSpot (analytics separate from content)

### Testing

**Test Signal Permissions:**
```sql
-- Admin should have signal:view_analytics
SELECT has_admin_permission(
  (SELECT id FROM profiles WHERE admin_role = 'admin' LIMIT 1),
  'signal',
  'view_analytics'
);
-- Should return: true

-- System Admin should have signal:view_analytics (read-only)
SELECT has_admin_permission(
  (SELECT id FROM profiles WHERE admin_role = 'systemadmin' LIMIT 1),
  'signal',
  'view_analytics'
);
-- Should return: true

-- System Admin should NOT have signal:manage_distribution
SELECT has_admin_permission(
  (SELECT id FROM profiles WHERE admin_role = 'systemadmin' LIMIT 1),
  'signal',
  'manage_distribution'
);
-- Should return: false
```

**Test Blog Permissions Still Work:**
```sql
-- Admin should still have blog:view_analytics for SEO
SELECT has_admin_permission(
  (SELECT id FROM profiles WHERE admin_role = 'admin' LIMIT 1),
  'blog',
  'view_analytics'
);
-- Should return: true
```

### Related Documentation

- [SIGNAL-ROUTE-MIGRATION.md](./SIGNAL-ROUTE-MIGRATION.md) - Complete migration details
- [REVENUE-SIGNAL.md](./REVENUE-SIGNAL.md) - Signal specification (lines 135-143)
- Migration 189 - Blog Orchestrator RBAC (initial implementation)
- Migration 190 - Signal RBAC (strategic separation)

---

**Migration 189 Status:** ✅ Complete (2026-01-18) - Blog permissions
**Migration 190 Status:** ✅ Complete (2026-01-18) - Signal permissions
**Impact:** All Signal routes now properly secured with dedicated RBAC resource
