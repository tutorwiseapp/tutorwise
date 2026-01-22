# Admin Dashboard - Manual Test Checklist

**Tester:** _______________
**Date:** _______________
**Environment:** [ ] Local [ ] Staging [ ] Production

---

## Pre-Flight Setup

- [ ] Database migrations run successfully
  - [ ] Migration 095 (basic admin support)
  - [ ] Migration 096 (granular RBAC)
- [ ] Superadmins seeded (3 emails)
- [ ] Dev server running on http://localhost:3000
- [ ] Signed in with superadmin email

---

## Test 1: Admin Dashboard Access

**Navigate to:** http://localhost:3000/admin

- [ ] Page loads without errors
- [ ] AdminSidebar visible on left side
- [ ] Navigation items present (Overview, SEO, Platform, Business, System)
- [ ] Admin Overview page displays in center
- [ ] 4-card sidebar on right (Stats, Help, Tips, Video)
- [ ] No console errors in browser DevTools

**Expected Result:** ✅ Full admin dashboard layout visible

---

## Test 2: Permission System (API)

**Open browser console, run:**
```javascript
fetch('/api/admin/users').then(r => r.json()).then(console.log)
```

- [ ] API returns 200 status
- [ ] Response contains array of admin users
- [ ] Response includes all 3 superadmins
- [ ] Each user has: email, is_admin, admin_role, full_name
- [ ] No errors in response

**Expected Result:** ✅ Admin users list returned successfully

---

## Test 3: Admin Users Page

**Navigate to:** http://localhost:3000/admin/accounts/users/admins

- [ ] Page loads without errors
- [ ] Tabs present: All | Superadmins | Admins | System Admins | Support Admins
- [ ] Table shows all admin users
- [ ] Each row has: Email, Name, Role, Since, Actions
- [ ] "Grant Admin Access" button visible
- [ ] Search box functional
- [ ] Sort dropdown functional
- [ ] Pagination shows if >10 users
- [ ] 4-card sidebar visible on right

**Expected Result:** ✅ Admin users management page fully functional

---

## Test 4: Grant Admin Access

**Click "Grant Admin Access" button**

- [ ] Modal opens
- [ ] Form has: Email input, Role dropdown, Reason textarea
- [ ] Role dropdown shows: Superadmin, Admin, System Admin, Support Admin
- [ ] Email validation works (try invalid email)
- [ ] Required field validation works (try submitting empty)
- [ ] Warning about email notification present

**Grant admin access:**
- Email: (your test email)
- Role: Support Admin
- Reason: "Testing admin grant functionality"

- [ ] Modal closes on success
- [ ] Success message appears (toast/alert)
- [ ] New admin appears in table immediately
- [ ] Table updates without page refresh
- [ ] Badge color matches role (Support Admin = yellow/orange)

**Verify in database:**
```sql
SELECT email, is_admin, admin_role FROM profiles WHERE email = 'test@example.com';
SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 1;
SELECT * FROM admin_activity_notifications WHERE sent = false ORDER BY created_at DESC LIMIT 1;
```

- [ ] User has is_admin = true
- [ ] User has admin_role = 'supportadmin'
- [ ] Audit log entry created
- [ ] Email notification queued

**Expected Result:** ✅ Admin access granted successfully with audit trail

---

## Test 5: Change Admin Role

**Find your test user in the list, click "Edit"**

- [ ] Change Role modal opens
- [ ] Current role displayed correctly (Support Admin)
- [ ] New role dropdown shows available roles
- [ ] Current role is disabled in dropdown
- [ ] Cannot select higher role than your level (if not superadmin)
- [ ] Reason textarea present

**Change role:**
- New Role: Admin
- Reason: "Testing role change functionality"

- [ ] Modal closes on success
- [ ] Role updates in table
- [ ] Badge color changes
- [ ] Table updates without refresh

**Verify in database:**
```sql
SELECT email, admin_role FROM profiles WHERE email = 'test@example.com';
SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 1;
```

- [ ] User role updated to 'admin'
- [ ] Audit log entry created with "change_admin_role" action

**Expected Result:** ✅ Role changed successfully with audit trail

---

## Test 6: Revoke Admin Access

**Click "Revoke" next to your test user**

- [ ] Revoke modal opens
- [ ] User info displayed (email, name, current role)
- [ ] Danger warning present
- [ ] Reason textarea present
- [ ] "Revoke Admin Access" button is red/danger style

**Revoke access:**
- Reason: "Testing revoke functionality"

- [ ] Modal closes on success
- [ ] User disappears from table
- [ ] Table updates without refresh
- [ ] Success message appears

**Verify in database:**
```sql
SELECT email, is_admin, admin_role FROM profiles WHERE email = 'test@example.com';
SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 1;
```

- [ ] User has is_admin = false
- [ ] User has admin_role = NULL
- [ ] Audit log entry created with "revoke_admin" action

**Expected Result:** ✅ Admin access revoked successfully with audit trail

---

## Test 7: Permission Gates (Client-Side)

**Create test page:** `apps/web/src/app/(admin)/admin/test-permissions/page.tsx`

(Copy content from TESTING.md)

**Navigate to:** http://localhost:3000/admin/test-permissions

**As Superadmin:**
- [ ] "Can create SEO: YES" displayed
- [ ] "Is Superadmin: YES" displayed
- [ ] Green box for seo:create permission visible
- [ ] Green box for superadmin role visible
- [ ] Orange fallback for supportadmin role visible

**Grant yourself a different role (e.g., Support Admin), refresh page:**
- [ ] "Can create SEO" changes based on role
- [ ] "Is Superadmin: NO" displayed
- [ ] Permission gates update correctly
- [ ] Role gates update correctly

**Expected Result:** ✅ Permission and role gates work correctly

---

## Test 8: Email Notification Worker

**Set CRON_SECRET:**
```bash
export CRON_SECRET="test-secret-key-123"
```

**Trigger notification processor:**
```bash
curl -X GET \
  -H "Authorization: Bearer test-secret-key-123" \
  http://localhost:3000/api/admin/notifications/process
```

- [ ] Returns 200 status
- [ ] Response shows processed count
- [ ] Response shows success/failure counts
- [ ] Terminal shows email log messages
- [ ] No errors in response

**Check database:**
```sql
SELECT * FROM admin_activity_notifications WHERE sent = true ORDER BY sent_at DESC;
```

- [ ] Notifications marked as sent = true
- [ ] sent_at timestamp populated

**Test without auth header:**
```bash
curl -X GET http://localhost:3000/api/admin/notifications/process
```

- [ ] Returns 401 Unauthorized
- [ ] Does not process notifications

**Expected Result:** ✅ Cron worker processes notifications securely

---

## Test 9: Security & Authorization

### Test: Non-admin access

**Sign out, sign in with non-admin email**

**Navigate to:** http://localhost:3000/admin

- [ ] Redirected away from /admin
- [ ] Error message shown (unauthorized)
- [ ] Cannot access admin dashboard

### Test: Cannot revoke own access

**As superadmin, try to revoke yourself:**

- [ ] "Revoke" button disabled or hidden for own account
- [ ] OR error message if attempted

### Test: Cannot revoke last superadmin

**If only 1 superadmin remains:**

- [ ] Cannot revoke last superadmin
- [ ] Error message explains why

### Test: Role hierarchy

**As Support Admin:**
- [ ] Cannot see "Grant Admin Access" button (or only supportadmin available)
- [ ] Cannot change higher-level admins
- [ ] Cannot revoke higher-level admins

**Expected Result:** ✅ All security restrictions working

---

## Test 10: Audit Logs

**Check audit logs table:**
```sql
SELECT
  action,
  actor_email,
  target_email,
  details,
  created_at
FROM admin_audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

- [ ] Grant admin action logged
- [ ] Change role action logged
- [ ] Revoke admin action logged
- [ ] All logs have actor_email (who did it)
- [ ] All logs have target_email (who was affected)
- [ ] All logs have details JSON with reason

**Expected Result:** ✅ Complete audit trail maintained

---

## Test 11: Database Functions

**Test permission checking function:**
```sql
-- Replace with your user ID
SELECT has_admin_permission('your-user-id-uuid', 'seo', 'create');
-- Should return: true (for superadmin)

SELECT has_admin_permission('your-user-id-uuid', 'nonexistent', 'action');
-- Should return: false
```

**Test get permissions function:**
```sql
SELECT get_user_admin_permissions('your-user-id-uuid');
-- Should return: JSONB array of permissions
```

- [ ] Functions exist and execute
- [ ] Superadmin returns true for all permissions
- [ ] Other roles return correct permissions
- [ ] Invalid permissions return false

**Expected Result:** ✅ Database permission functions working correctly

---

## Test 12: Middleware Protection

**Test protected routes:**

**As admin user, navigate to:**
- [ ] /admin → ✅ Allowed
- [ ] /admin/accounts/admins → ✅ Allowed
- [ ] /admin/seo/hubs → ✅ Allowed (even if page doesn't exist yet)

**Sign out, navigate to:**
- [ ] /admin → ❌ Redirected to /dashboard?error=unauthorized
- [ ] /admin/accounts/admins → ❌ Redirected

**As non-admin user, navigate to:**
- [ ] /admin → ❌ Redirected to /dashboard?error=unauthorized

**Expected Result:** ✅ All /admin routes protected

---

## Test 13: UI/UX Polish

### AdminSidebar
- [ ] Navigation items properly styled
- [ ] Active route highlighted
- [ ] Expandable sections work (chevron rotates)
- [ ] Text-only design (no icons)
- [ ] Matches AppSidebar style

### Admin Users Table
- [ ] Proper spacing and alignment
- [ ] Role badges color-coded correctly:
  - Superadmin: Purple
  - Admin: Blue
  - System Admin: Green
  - Support Admin: Orange
- [ ] Hover states on rows
- [ ] Button hover states
- [ ] Responsive design works

### Modals
- [ ] Backdrop dims background
- [ ] Click outside closes modal
- [ ] ESC key closes modal
- [ ] Proper padding and spacing
- [ ] Buttons properly styled
- [ ] Form validation errors shown inline

**Expected Result:** ✅ Professional, polished UI

---

## Test 14: Performance

**Navigate to admin pages, check DevTools:**

- [ ] Page load time < 2 seconds
- [ ] No unnecessary re-renders (React DevTools)
- [ ] API responses < 500ms
- [ ] No memory leaks (check Performance tab)
- [ ] Smooth animations and transitions

**Check database query performance:**
```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%admin%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

- [ ] No slow queries (>1 second avg)
- [ ] Permission checks are fast (<100ms)

**Expected Result:** ✅ Good performance throughout

---

## Final Checklist

- [ ] All tests passed
- [ ] No console errors
- [ ] No database errors
- [ ] Audit logs complete
- [ ] Email notifications queued
- [ ] Security restrictions working
- [ ] UI/UX polished
- [ ] Performance acceptable

---

## Issues Found

| # | Issue Description | Severity | Status |
|---|------------------|----------|--------|
| 1 |                  | [ ] High [ ] Medium [ ] Low | [ ] Fixed [ ] Open |
| 2 |                  | [ ] High [ ] Medium [ ] Low | [ ] Fixed [ ] Open |
| 3 |                  | [ ] High [ ] Medium [ ] Low | [ ] Fixed [ ] Open |

---

## Sign-Off

**All critical tests passed:** [ ] Yes [ ] No

**Ready for production:** [ ] Yes [ ] No

**Tester Signature:** _______________

**Date:** _______________

---

**Testing Checklist Version**: 1.0
**Last Updated**: 2025-12-23
