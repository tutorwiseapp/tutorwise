# Admin Dashboard - Testing & Deployment Guide

**Created**: 2025-12-23
**Status**: Ready for testing

---

## Pre-Deployment Checklist

### 1. Local Development Testing

#### Step 1: Run Database Migrations

```bash
# Navigate to database migrations directory
cd tools/database/migrations

# Connect to your LOCAL database
# Replace with your local connection string
export DATABASE_URL="postgresql://user:password@localhost:5432/tutorwise"

# Run migration 095 (basic admin support)
psql $DATABASE_URL -f 095_add_admin_dashboard_support.sql

# Expected output:
# CREATE TYPE
# ALTER TABLE
# CREATE TABLE
# CREATE TABLE
# CREATE FUNCTION
# CREATE POLICY
# (etc.)

# Run migration 096 (granular RBAC)
psql $DATABASE_URL -f 096_add_granular_rbac_permissions.sql

# Expected output:
# CREATE TYPE
# CREATE TABLE
# INSERT 0 XX (many permission inserts)
# CREATE TABLE
# CREATE FUNCTION
# (etc.)
```

**✅ Verification:**
```sql
-- Check admin role enum exists
SELECT enum_range(NULL::admin_role_type);

-- Check permissions table has data
SELECT COUNT(*) FROM admin_role_permissions;
-- Should return: ~60 rows

-- Check profiles table has new columns
\d profiles
-- Should show: is_admin, admin_role, admin_permissions, last_admin_access
```

#### Step 2: Seed Superadmins

```bash
cd ../scripts

# Run seed script
psql $DATABASE_URL -f seed_superadmins.sql

# Expected output:
# UPDATE 3 (if all 3 emails exist in profiles)
# Or fewer if some emails don't exist yet
```

**✅ Verification:**
```sql
-- Check superadmins were created
SELECT email, is_admin, admin_role
FROM profiles
WHERE is_admin = true;

-- Expected:
-- michaelquan@tutorwise.io | t | superadmin
-- micquan@gmail.com | t | superadmin
-- tutorwiseapp@gmail.com | t | superadmin
```

**⚠️ Important:** If you see fewer than 3 rows, it means those email addresses don't have profiles yet. You need to sign up with those emails first, then run the seed script again.

#### Step 3: Start Development Server

```bash
cd /Users/michaelquan/projects/tutorwise/apps/web

npm run dev
```

#### Step 4: Test Admin Access

1. **Open browser:** http://localhost:3000
2. **Sign in** with one of the superadmin emails:
   - michaelquan@tutorwise.io
   - micquan@gmail.com
   - tutorwiseapp@gmail.com
3. **Navigate to:** http://localhost:3000/admin

**✅ Expected:**
- ✅ You should see the Admin Dashboard
- ✅ AdminSidebar on the left with navigation
- ✅ "Admin Overview" page in the center
- ✅ 4-card sidebar on the right (Stats, Help, Tips, Video)

**❌ If you see "Unauthorized":**
- Check you're signed in with a superadmin email
- Check database: `SELECT email, is_admin FROM profiles WHERE email = 'your-email';`
- Check browser console for errors

#### Step 5: Test Permission System

Open browser console and run:

```javascript
// Test permission checking
fetch('/api/admin/users')
  .then(r => r.json())
  .then(console.log);

// Expected: Array of admin users
```

**✅ Verification:**
```javascript
// Should return array with 3 superadmins (or however many you seeded)
[
  {
    id: "...",
    email: "michaelquan@tutorwise.io",
    is_admin: true,
    admin_role: "superadmin",
    full_name: "...",
    created_at: "..."
  },
  // ... more admins
]
```

#### Step 6: Test Admin User Management

1. **Navigate to:** http://localhost:3000/admin/accounts/users/admins
2. **Click "Grant Admin Access"**
3. **Enter test email** (use your own test email)
4. **Select role:** "supportadmin"
5. **Add reason:** "Testing admin grant functionality"
6. **Click "Grant Admin Access"**

**✅ Expected:**
- ✅ Modal closes
- ✅ Success message appears
- ✅ New admin appears in the list
- ✅ Table updates immediately

**Verify in database:**
```sql
-- Check user was granted admin
SELECT email, is_admin, admin_role
FROM profiles
WHERE email = 'test-email@example.com';

-- Check audit log entry
SELECT * FROM admin_audit_logs
ORDER BY created_at DESC
LIMIT 1;

-- Check email notification queued
SELECT * FROM admin_activity_notifications
WHERE sent = false
ORDER BY created_at DESC
LIMIT 1;
```

#### Step 7: Test Role Change

1. **In admin users list**, find your test user
2. **Click "Edit"** next to the test user
3. **Select new role:** "admin"
4. **Add reason:** "Testing role change"
5. **Click "Change Role"**

**✅ Expected:**
- ✅ Modal closes
- ✅ Role updates in the table
- ✅ Badge color changes

#### Step 8: Test Revoke Admin

1. **Click "Revoke"** next to your test user
2. **Add reason:** "Testing revoke functionality"
3. **Click "Revoke Admin Access"**

**✅ Expected:**
- ✅ Modal closes
- ✅ User disappears from admin list
- ✅ Audit log created

**Verify in database:**
```sql
SELECT email, is_admin, admin_role
FROM profiles
WHERE email = 'test-email@example.com';
-- Should show: is_admin = false, admin_role = NULL
```

#### Step 9: Test Permission Gates

Create a test file to verify permission gates work:

**File: `apps/web/src/app/(admin)/admin/test-permissions/page.tsx`**

```typescript
'use client';

import PermissionGate from '@/app/components/admin/PermissionGate';
import RoleGate from '@/app/components/admin/RoleGate';
import { usePermission, useIsSuperadmin } from '@/lib/rbac';

export default function TestPermissionsPage() {
  const { hasAccess: canCreateSEO } = usePermission('seo', 'create');
  const { isSuperadmin } = useIsSuperadmin();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Permission Gate Tests</h1>

      <div style={{ marginTop: '2rem' }}>
        <h2>Direct Hook Check:</h2>
        <p>Can create SEO: {canCreateSEO ? '✅ YES' : '❌ NO'}</p>
        <p>Is Superadmin: {isSuperadmin ? '✅ YES' : '❌ NO'}</p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>PermissionGate Component:</h2>
        <PermissionGate resource="seo" action="create">
          <div style={{ background: 'green', padding: '1rem', color: 'white' }}>
            ✅ You can see this because you have seo:create permission
          </div>
        </PermissionGate>

        <PermissionGate
          resource="seo"
          action="create"
          fallback={<div style={{ background: 'red', padding: '1rem', color: 'white' }}>❌ No access</div>}
        >
          <div style={{ background: 'green', padding: '1rem', color: 'white' }}>
            ✅ Has access
          </div>
        </PermissionGate>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>RoleGate Component:</h2>
        <RoleGate role="superadmin">
          <div style={{ background: 'green', padding: '1rem', color: 'white' }}>
            ✅ You can see this because you are a superadmin
          </div>
        </RoleGate>

        <RoleGate
          role="supportadmin"
          fallback={<div style={{ background: 'orange', padding: '1rem', color: 'white' }}>⚠️ Supportadmin only</div>}
        >
          <div style={{ background: 'green', padding: '1rem', color: 'white' }}>
            ✅ Supportadmin access
          </div>
        </RoleGate>
      </div>
    </div>
  );
}
```

**Navigate to:** http://localhost:3000/admin/test-permissions

**✅ Expected for Superadmin:**
- ✅ "Can create SEO: YES"
- ✅ "Is Superadmin: YES"
- ✅ Green box for seo:create permission
- ✅ Green box for superadmin role
- ⚠️ Orange fallback for supportadmin role

#### Step 10: Test Email Notification Worker

```bash
# Set CRON_SECRET environment variable
export CRON_SECRET="test-secret-key-123"

# Manually trigger the notification processor
curl -X GET \
  -H "Authorization: Bearer test-secret-key-123" \
  http://localhost:3000/api/admin/notifications/process

# Expected response:
{
  "success": true,
  "message": "Processed X notifications",
  "successCount": X,
  "failureCount": 0
}
```

**Check logs:**
```bash
# You should see in terminal:
📧 Email would be sent: {
  to: 'test-email@example.com',
  subject: 'Admin Access Granted - Tutorwise',
  body: '...',
  metadata: { ... }
}
```

**⚠️ Note:** Emails won't actually send until you integrate with Resend/SendGrid (see SETUP.md)

---

## Production Deployment

### Step 1: Prepare Environment Variables

Add to your production environment (Vercel, Railway, etc.):

```bash
# Required
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# For email notifications (choose one)
RESEND_API_KEY=re_...        # If using Resend
SENDGRID_API_KEY=SG....      # If using SendGrid

# For cron job security
CRON_SECRET=your-random-secret-key-here
```

**Generate CRON_SECRET:**
```bash
openssl rand -base64 32
```

### Step 2: Run Migrations on Production Database

```bash
# Connect to PRODUCTION database
export DATABASE_URL="postgresql://prod-user:prod-pass@prod-host:5432/prod-db"

cd tools/database/migrations

# Run migrations
psql $DATABASE_URL -f 095_add_admin_dashboard_support.sql
psql $DATABASE_URL -f 096_add_granular_rbac_permissions.sql

# Run seed script
cd ../scripts
psql $DATABASE_URL -f seed_superadmins.sql
```

**⚠️ IMPORTANT:** Make sure the superadmin emails (michaelquan@tutorwise.io, micquan@gmail.com, tutorwiseapp@gmail.com) have already signed up in production before running the seed script!

### Step 3: Deploy Code

```bash
# Push to main branch (triggers Vercel deployment)
git push origin main

# Or manually deploy
vercel --prod
```

### Step 4: Configure Vercel Cron

Your [vercel.json](vercel.json) already has the cron job configured:

```json
{
  "crons": [{
    "path": "/api/admin/notifications/process",
    "schedule": "*/5 * * * *"
  }]
}
```

**Verify in Vercel Dashboard:**
1. Go to your project in Vercel
2. Settings → Cron Jobs
3. You should see: `/api/admin/notifications/process` running every 5 minutes

### Step 5: Integrate Email Service

Choose one:

#### Option A: Resend (Recommended)

```bash
npm install resend
```

Update [apps/web/src/app/api/admin/notifications/process/route.ts](apps/web/src/app/api/admin/notifications/process/route.ts:120-144):

```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, body, metadata }) {
  try {
    await resend.emails.send({
      from: 'Tutorwise Admin <admin@tutorwise.io>',
      to,
      subject,
      html: body,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}
```

#### Option B: SendGrid

```bash
npm install @sendgrid/mail
```

```typescript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function sendEmail({ to, subject, body, metadata }) {
  try {
    await sgMail.send({
      to,
      from: 'admin@tutorwise.io',
      subject,
      html: body,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}
```

### Step 6: Test Production Deployment

1. **Navigate to:** https://your-domain.com/admin
2. **Sign in** with superadmin email
3. **Verify admin dashboard loads**
4. **Test admin user management** (grant, change, revoke)
5. **Wait 5 minutes** and check if email notification was sent

---

## Common Issues & Troubleshooting

### Issue: "Unauthorized" when accessing /admin

**Diagnosis:**
```sql
-- Check if user is admin
SELECT email, is_admin, admin_role
FROM profiles
WHERE email = 'your-email@example.com';
```

**Solutions:**
- User not in database → Sign up first
- `is_admin = false` → Run seed script or grant manually
- `admin_role IS NULL` → Run seed script or grant manually

**Manual fix:**
```sql
UPDATE profiles
SET is_admin = true, admin_role = 'superadmin'
WHERE email = 'your-email@example.com';
```

### Issue: Permission checks always return false

**Diagnosis:**
```sql
-- Check if permissions exist
SELECT COUNT(*) FROM admin_role_permissions;
-- Should be ~60 rows

-- Check if permission functions exist
\df has_admin_permission
\df get_user_admin_permissions
```

**Solutions:**
- No permissions → Migration 096 didn't run
- No functions → Migration 096 didn't run completely
- Re-run migration 096

### Issue: Emails not sending

**Diagnosis:**
```sql
-- Check if notifications are queued
SELECT * FROM admin_activity_notifications
WHERE sent = false
ORDER BY created_at DESC;
```

**Solutions:**
- No rows → Notifications not being created (check triggers)
- Rows exist but `sent = false` → Cron job not running or email service not configured
- Check Vercel cron logs
- Check `CRON_SECRET` environment variable
- Check email service API key

### Issue: Cron job failing

**Check Vercel Logs:**
1. Vercel Dashboard → Your Project
2. Deployments → Latest
3. Functions → Look for `/api/admin/notifications/process`
4. Check error logs

**Manual test:**
```bash
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/admin/notifications/process
```

### Issue: Cannot revoke last superadmin

**This is intentional!** The system prevents you from revoking the last superadmin to avoid lockout.

**Solution:**
- Grant superadmin to another user first
- Then revoke the original superadmin

---

## Performance Monitoring

### Database Query Performance

```sql
-- Check slow queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%admin%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Notification Queue Size

```sql
-- Check pending notifications
SELECT COUNT(*) FROM admin_activity_notifications WHERE sent = false;

-- If queue is growing, increase cron frequency or batch size
```

---

## Security Checklist

- ✅ Middleware protects all `/admin` routes
- ✅ API routes check permissions before actions
- ✅ Database RLS policies enforce access control
- ✅ Audit logs track all admin actions
- ✅ Email notifications sent for all admin activities
- ✅ CRON_SECRET protects notification worker endpoint
- ✅ Role hierarchy prevents lower admins from managing higher admins
- ✅ Cannot revoke own access (prevents lockout)
- ✅ Cannot revoke last superadmin (prevents lockout)

---

## Next Steps After Testing

Once testing is complete and deployed to production:

1. **Phase 1: SEO Management** - Build SEO Hubs, Spokes, Citations pages
2. **Phase 2: Platform Management** - Build Users, Listings, Bookings pages
3. **Phase 3: Business & System** - Build Reports, Settings, Financials pages

Each page will follow the same pattern:
- HubPageLayout + HubHeader + HubTabs
- 4-card sidebar (Stats, Help, Tips, Video)
- Permission-gated actions
- Full CRUD with audit logging

---

**Testing Version**: 1.0
**Last Updated**: 2025-12-23
