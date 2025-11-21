# Settings Page Cleanup Plan

## User Requirements
1. **Delete** legacy `/settings` page
2. **Remove** Settings link from AppSideBar
3. **Update** all `/settings` references → `/account/settings`
4. **Add** redirect `/settings` → `/account/settings`
5. **Fix** delete account button: text "Delete" + teal styling
6. **Enhance** delete account to remove ALL user data from database + Stripe
7. **Test** delete account functionality

## Files to Modify

### 1. Remove Settings from AppSideBar
**File**: `apps/web/src/app/components/layout/sidebars/AppSidebar.tsx`
**Change**: Remove line 52: `{ href: '/settings', label: 'Settings' },`

### 2. Delete Legacy Settings Page
**Files to delete**:
- `apps/web/src/app/settings/page.tsx`
- `apps/web/src/app/settings/page.module.css`
- `apps/web/src/app/settings/change-password/page.tsx` (if it exists, move to `/account/settings/change-password`)
- `apps/web/src/app/settings/change-password/page.module.css`

### 3. Update References to /settings
**Files found with /settings references**:
- `apps/web/src/lib/email.ts` - Check for any email links
- `apps/web/src/middleware.ts` - May need redirect rule
- `apps/web/src/app/components/caas/CaaSGuidanceWidget.tsx`
- `apps/web/src/app/(authenticated)/dashboard/page.tsx`
- `apps/web/src/app/api/integrations/callback/[platform]/route.ts`
- `apps/web/src/app/components/account/AccountTabs.tsx` - Ensure Settings tab points to `/account/settings`

### 4. Add Middleware Redirect
**File**: `apps/web/src/middleware.ts`
**Add**: `/settings` → `/account/settings` redirect

### 5. Fix Delete Account Button
**File**: `apps/web/src/app/delete-account/page.tsx`
**Changes**:
- Line 137: Change button text from "Delete My Account Permanently" to "Delete"
- Add teal/standard button styling (remove `className={styles.dangerButton}`)

### 6. Enhance Delete Account API
**File**: `apps/web/src/app/api/user/delete/route.ts`
**Current**:
- Deletes Stripe Connect account
- Deletes Stripe Customer
- Deletes Supabase Auth user (cascades to profile)

**Missing Data Cleanup**:
- Query is using `user_profiles` table (likely should be `profiles`)
- Not explicitly deleting:
  - `profile_graph` relationships
  - `connection_groups` (organisations)
  - `group_members`
  - `chat_messages`
  - `bookings`
  - `listings`
  - `wiselists` and `wiselist_items`
  - `network_analytics`
  - `referral_links` and related tables
  - Any uploaded files/avatars

**Solution**: The API comment says "this will cascade to delete the profile" but we need to verify CASCADE rules are properly set up in Supabase, OR explicitly delete related data before deleting the auth user.

## Testing Plan
1. Navigate to `/settings` → should redirect to `/account/settings`
2. Check AppSideBar → no Settings link
3. Delete account button shows "Delete" with teal styling
4. Test delete account with test user → verify all data removed from:
   - Supabase (all tables)
   - Stripe (customer + connect account)
