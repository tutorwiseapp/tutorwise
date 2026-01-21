# Migration Consolidation & React Query Migration Summary

**Date:** 2025-11-13
**Purpose:** Consolidate all database migrations into `apps/api/migrations` and migrate Payments/Financials to React Query

---

## ✅ Completed Tasks

### 1. **React Query Migration**

Both Payments and Financials pages have been migrated to React Query for robustness and consistency with Listings, Bookings, My Students, and Reviews.

#### **Payments Page** ([payments/page.tsx](apps/web/src/app/(authenticated)/payments/page.tsx))

**New Features:**
- ✅ `useQuery` for fetching payment data (Stripe account + saved cards)
- ✅ `useMutation` for setting default card (with optimistic updates)
- ✅ `useMutation` for removing cards (with optimistic updates)
- ✅ `useMutation` for disconnecting Stripe account
- ✅ Automatic caching (30s stale time, 5min garbage collection)
- ✅ Automatic retry logic (2 retries)
- ✅ Enhanced verification polling for new cards

**API Layer:** [lib/api/payments.ts](apps/web/src/lib/api/payments.ts)

#### **Financials Page** ([financials/page.tsx](apps/web/src/app/(authenticated)/financials/page.tsx))

**New Features:**
- ✅ `useQuery` for fetching transactions and balances
- ✅ Automatic caching (30s stale time, 5min garbage collection)
- ✅ Auto-refresh every 60 seconds for real-time balance updates
- ✅ Automatic retry logic (2 retries)
- ✅ Client-side filtering with `useMemo` for performance

**API Layer:** [lib/api/financials.ts](apps/web/src/lib/api/financials.ts)

---

### 2. **Migration File Consolidation**

All database migrations now reside in a single directory: **`apps/api/migrations/`**

**Migrations Moved:**
- `002_add_profile_graph_v4_6.sql` → `061_add_profile_graph_v4_6.sql`
- `003_migrate_connections_to_profile_graph.sql` → `062_migrate_connections_to_profile_graph.sql`
- `048_add_student_role_and_bookings_link.sql` → `063_add_student_role_and_bookings_link.sql`
- `049_create_integration_links_table.sql` → `064_create_integration_links_table.sql`

**Rollback files also moved:**
- `061_add_profile_graph_v4_6_rollback.sql`
- `062_migrate_connections_to_profile_graph_rollback.sql`
- `063_add_student_role_and_bookings_link_rollback.sql`
- `064_create_integration_links_table_rollback.sql`

**Migration Sequence:**
```
060 (last existing migration)
↓
061 - Add profile_graph table (v4.6)
↓
062 - Migrate connections to profile_graph
↓
063 - Add Student role and bookings link (v5.0)
↓
064 - Create integration links table (v5.0)
```

---

### 3. **Migration Runner Script Updated**

**Location:** [tools/database/run-pending-migrations.sh](tools/database/run-pending-migrations.sh)

**Changes:**
- Updated to reference `apps/api/migrations/` directory
- Updated migration numbers (061-064)
- Added proper error handling and validation
- Includes step-by-step progress indicators

**Usage:**
```bash
# Make sure POSTGRES_URL_NON_POOLING is set in .env.local
./tools/database/run-pending-migrations.sh
```

---

### 4. **Cleanup Completed**

**Removed duplicate files from** `tools/database/migrations/`:
- ✅ 002_add_profile_graph_v4_6.sql (and rollback)
- ✅ 003_migrate_connections_to_profile_graph.sql (and rollback)
- ✅ 048_add_student_role_and_bookings_link.sql (and rollback)
- ✅ 049_create_integration_links_table.sql (and rollback)

All migrations now have a single source of truth in `apps/api/migrations/`.

---

## 🎯 Benefits

### React Query Benefits
1. **Automatic Caching** - Faster page loads with intelligent cache management
2. **Optimistic Updates** - UI responds instantly to user actions
3. **Auto-refresh** - Financials page updates balances every minute
4. **Request Deduplication** - Multiple components can request same data without duplicate API calls
5. **Better Error Handling** - Consistent error states and retry logic
6. **Consistency** - All major pages now use the same data fetching pattern

### Migration Consolidation Benefits
1. **Single Source of Truth** - All migrations in one location
2. **Sequential Numbering** - Clear migration order (061 → 062 → 063 → 064)
3. **Easier Maintenance** - No duplicate files to keep in sync
4. **Better Documentation** - All migrations follow consistent naming and numbering

---

## 📋 Next Steps

### To Fix the "profile_graph table not found" Error:

**Option 1: Using the Migration Script**
```bash
cd /Users/michaelquan/projects/tutorwise
./tools/database/run-pending-migrations.sh
```

**Option 2: Using Supabase SQL Editor**
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste each migration file content in order:
   - `apps/api/migrations/061_add_profile_graph_v4_6.sql`
   - `apps/api/migrations/062_migrate_connections_to_profile_graph.sql`
   - `apps/api/migrations/063_add_student_role_and_bookings_link.sql`
   - `apps/api/migrations/064_create_integration_links_table.sql`
3. Run each migration in order

**Option 3: Using psql (if installed)**
```bash
psql "$POSTGRES_URL_NON_POOLING" -f apps/api/migrations/061_add_profile_graph_v4_6.sql
psql "$POSTGRES_URL_NON_POOLING" -f apps/api/migrations/062_migrate_connections_to_profile_graph.sql
psql "$POSTGRES_URL_NON_POOLING" -f apps/api/migrations/063_add_student_role_and_bookings_link.sql
psql "$POSTGRES_URL_NON_POOLING" -f apps/api/migrations/064_create_integration_links_table.sql
```

---

## 🧪 Testing

After running migrations, verify:
1. ✅ My Students page loads without "profile_graph" error
2. ✅ Payments page with instant optimistic updates
3. ✅ Financials page with auto-refreshing balances
4. ✅ Student role assignment works
5. ✅ Integration links (Google Classroom) can be connected

---

## 📚 Files Modified

**New Files:**
- `apps/web/src/lib/api/payments.ts`
- `apps/web/src/lib/api/financials.ts`
- `apps/api/migrations/061_add_profile_graph_v4_6.sql`
- `apps/api/migrations/061_add_profile_graph_v4_6_rollback.sql`
- `apps/api/migrations/062_migrate_connections_to_profile_graph.sql`
- `apps/api/migrations/062_migrate_connections_to_profile_graph_rollback.sql`
- `apps/api/migrations/063_add_student_role_and_bookings_link.sql`
- `apps/api/migrations/063_add_student_role_and_bookings_link_rollback.sql`
- `apps/api/migrations/064_create_integration_links_table.sql`
- `apps/api/migrations/064_create_integration_links_table_rollback.sql`

**Modified Files:**
- `apps/web/src/app/(authenticated)/payments/page.tsx` - Migrated to React Query
- `apps/web/src/app/(authenticated)/financials/page.tsx` - Migrated to React Query
- `tools/database/run-pending-migrations.sh` - Updated paths to apps/api/migrations

**Deleted Files:**
- `tools/database/migrations/002_*.sql` (moved)
- `tools/database/migrations/003_*.sql` (moved)
- `tools/database/migrations/048_*.sql` (moved)
- `tools/database/migrations/049_*.sql` (moved)

---

## 🔗 Related Documentation

- **Student Onboarding Design:** `docs/student-onboarding-solution-design-v5.0.md`
- **Profile Graph Design:** `docs/profile-graph-v4.6-design.md`
- **Reviews Design:** `docs/reviews-solution-design-v4.5.md`
- **Financials Design:** `docs/financials-v4.9-design.md`
