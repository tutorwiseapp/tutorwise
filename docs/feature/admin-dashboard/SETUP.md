# Admin Dashboard - Setup Instructions

**Created**: 2025-12-23
**Status**: Complete - Option B (Full RBAC with granular permissions)

## Overview

The Tutorwise Admin Dashboard is a comprehensive admin interface with:
- ✅ Granular RBAC (Role-Based Access Control) system
- ✅ 4 admin roles: superadmin, admin, systemadmin, supportadmin
- ✅ Permission checking at database level
- ✅ Full admin user management UI (grant/revoke/change roles)
- ✅ Audit logging for all admin actions
- ✅ Email notifications for admin activities
- ✅ Permission-gated UI components

---

## Quick Start

### 1. Run Database Migrations

```bash
# Navigate to database migrations directory
cd tools/database/migrations

# Run migration 095 (basic admin support)
psql <your-connection-string> -f 095_add_admin_dashboard_support.sql

# Run migration 096 (granular RBAC)
psql <your-connection-string> -f 096_add_granular_rbac_permissions.sql
```

### 2. Seed Initial Superadmins

```bash
# Grant superadmin access to founding team
cd ../scripts
psql <your-connection-string> -f seed_superadmins.sql
```

**This will grant superadmin access to**:
- michaelquan@tutorwise.io
- micquan@gmail.com
- tutorwiseapp@gmail.com

### 3. Access the Admin Dashboard

```bash
# Start your development server
npm run dev

# Navigate to admin dashboard
open http://localhost:3000/admin
```

**You should now be able to access the admin dashboard!**

---

## Admin Roles & Permissions

### Role Hierarchy

```
Level 4: Superadmin (Full platform control)
Level 3: Admin (SEO & content management)
Level 2: Systemadmin (Platform configuration & monitoring)
Level 1: Supportadmin (User support & moderation)
```

### Permissions by Role

**Superadmin** (Level 4):
- Full access to everything (wildcard permissions)
- Can grant/revoke any admin role
- Can manage other superadmins
- Access to all admin sections

**Admin** (Level 3):
- SEO content management (create, update, delete, publish)
- Listing moderation
- View users and reports
- Can grant/revoke systemadmin and supportadmin roles

**Systemadmin** (Level 2):
- Platform settings (view, update)
- Integrations management
- Reports (view, create custom)
- Audit log viewing
- Can grant/revoke supportadmin roles

**Supportadmin** (Level 1):
- User management (view, suspend)
- Booking management (view, cancel, refund)
- Dispute resolution
- Review moderation
- Message viewing (for support)

---

## Admin User Management

### Grant Admin Access

1. Navigate to `/admin/users/admins`
2. Click "Grant Admin Access"
3. Enter user email
4. Select role (you can only grant roles at or below your level)
5. Optionally add a reason
6. Click "Grant Admin Access"

**The user will**:
- Receive an email notification
- Immediately gain access to `/admin`
- See permissions based on their role

### Change Admin Role

1. In the admin users list, click "Edit" next to a user
2. Select new role from dropdown
3. Optionally add a reason
4. Click "Change Role"

**Restrictions**:
- Cannot change your own role
- Can only grant roles at or below your level
- Superadmins can change anyone's role (including other superadmins)

### Revoke Admin Access

1. In the admin users list, click "Revoke" next to a user
2. Optionally add a reason for revocation
3. Click "Revoke Admin Access"

**Restrictions**:
- Cannot revoke your own access (prevents lockout)
- Cannot revoke the last superadmin (prevents lockout)
- Can only revoke users at or below your level

---

## Permission Checking in Code

### Client-Side (React Components)

```typescript
import { usePermission, useAdminProfile, useIsSuperadmin } from '@/lib/rbac';

function MyComponent() {
  // Check specific permission
  const { hasAccess, isLoading } = usePermission('seo', 'create');

  // Get admin profile
  const { profile } = useAdminProfile();

  // Check if superadmin
  const { isSuperadmin } = useIsSuperadmin();

  if (!hasAccess) return <p>No access</p>;

  return <CreateHubButton />;
}
```

### Server-Side (API Routes, Server Components)

```typescript
import { hasPermissionServer, getAdminProfile } from '@/lib/rbac';

export async function POST(request: NextRequest) {
  // Check permission
  const canCreate = await hasPermissionServer('seo', 'create');

  if (!canCreate) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with action...
}
```

### Permission-Gated UI Components

```typescript
import PermissionGate from '@/app/components/admin/PermissionGate';
import RoleGate from '@/app/components/admin/RoleGate';

// Show UI only if user has permission
<PermissionGate resource="seo" action="create">
  <Button>Create Hub</Button>
</PermissionGate>

// Show UI only for specific roles
<RoleGate role="superadmin">
  <DangerousButton>Delete Everything</DangerousButton>
</RoleGate>

// Multiple roles
<RoleGate roles={['superadmin', 'admin']}>
  <SEOManagementPanel />
</RoleGate>
```

---

## Email Notifications

### Setup Email Service

The admin dashboard queues email notifications in the database. You need to integrate with an email service to actually send them.

**Option 1: Resend (Recommended)**

```bash
npm install resend
```

Edit `/apps/web/src/app/api/admin/notifications/process/route.ts`:

```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, body }) {
  await resend.emails.send({
    from: 'Tutorwise Admin <admin@tutorwise.io>',
    to,
    subject,
    html: body,
  });
  return true;
}
```

**Option 2: SendGrid**

```bash
npm install @sendgrid/mail
```

```typescript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail({ to, subject, body }) {
  await sgMail.send({
    to,
    from: 'admin@tutorwise.io',
    subject,
    html: body,
  });
  return true;
}
```

### Setup Cron Job

**Option 1: Vercel Cron (If deploying to Vercel)**

Create `vercel.json` in project root:

```json
{
  "crons": [{
    "path": "/api/admin/notifications/process",
    "schedule": "*/5 * * * *"
  }]
}
```

Add `CRON_SECRET` to Vercel environment variables.

**Option 2: GitHub Actions (Free alternative)**

Create `.github/workflows/process-notifications.yml`:

```yaml
name: Process Admin Notifications
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Call notification processor
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/admin/notifications/process
```

**Option 3: External Cron Service (Cron-job.org, EasyCron, etc.)**

Set up a cron job to hit:
```
GET https://your-domain.com/api/admin/notifications/process
Headers: Authorization: Bearer your-cron-secret
```

---

## File Structure

```
apps/web/src/
├── app/
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx                      # Admin route group layout
│   │       ├── page.tsx                        # Overview page
│   │       └── users/
│   │           └── admins/
│   │               ├── page.tsx                # Admin users management
│   │               └── page.module.css
│   ├── api/
│   │   └── admin/
│   │       ├── users/
│   │       │   ├── route.ts                    # List admins
│   │       │   └── manage/
│   │       │       └── route.ts                # Grant/revoke/change
│   │       └── notifications/
│   │           └── process/
│   │               └── route.ts                # Email worker
│   └── components/
│       └── admin/
│           ├── layout/
│           │   ├── AdminLayout.tsx
│           │   └── AdminLayout.module.css
│           ├── sidebar/
│           │   ├── AdminSidebar.tsx
│           │   └── AdminSidebar.module.css
│           ├── widgets/
│           │   ├── AdminStatsWidget.tsx
│           │   ├── AdminHelpWidget.tsx
│           │   ├── AdminTipWidget.tsx
│           │   ├── AdminVideoWidget.tsx
│           │   └── index.ts
│           ├── modals/
│           │   ├── GrantAdminModal.tsx
│           │   ├── RevokeAdminModal.tsx
│           │   ├── ChangeRoleModal.tsx
│           │   ├── GrantAdminModal.module.css
│           │   └── index.ts
│           ├── PermissionGate.tsx
│           └── RoleGate.tsx
├── lib/
│   └── rbac/
│       ├── types.ts                            # TypeScript types
│       ├── permissions.ts                      # Permission functions
│       ├── hooks.ts                            # React hooks
│       └── index.ts
└── middleware.ts                               # Updated with admin checks

tools/database/
├── migrations/
│   ├── 095_add_admin_dashboard_support.sql
│   └── 096_add_granular_rbac_permissions.sql
└── scripts/
    └── seed_superadmins.sql
```

---

## Testing

### 1. Test Admin Access

```bash
# Login as one of the superadmin emails
# Navigate to http://localhost:3000/admin

# You should see:
# - AdminSidebar on the left
# - Admin Overview page in the center
# - Stats widget on the right
```

### 2. Test Admin User Management

```bash
# Go to /admin/users/admins
# Click "Grant Admin Access"
# Enter a test user email
# Select "supportadmin" role
# Grant access

# Verify:
# - User appears in the admin users table
# - Email notification is queued (check admin_activity_notifications table)
# - Audit log entry created (check admin_audit_logs table)
```

### 3. Test Permission Checking

```typescript
// In browser console
const hasAccess = await fetch('/api/admin/users').then(r => r.json());
console.log(hasAccess);
```

### 4. Test Email Notifications

```bash
# Manually trigger the notification processor
curl -X GET \
  -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/admin/notifications/process

# Check response:
# Should show successCount and processed notifications
```

---

## Troubleshooting

### "Unauthorized" when accessing /admin

**Check**:
1. Did you run the migrations?
2. Did you run the seed_superadmins.sql script?
3. Are you logged in with one of the superadmin emails?

```sql
-- Verify admin access
SELECT email, is_admin, admin_role FROM profiles WHERE is_admin = true;
```

### Permission checks always return false

**Check**:
1. Are the database functions created? (has_admin_permission, get_user_admin_permissions)
2. Are permissions seeded in admin_role_permissions table?

```sql
-- Verify permissions exist
SELECT * FROM admin_role_permissions WHERE role = 'superadmin';
```

### Emails not sending

**Check**:
1. Is your email service API key configured?
2. Is the cron job running?
3. Are notifications queued?

```sql
-- Check pending notifications
SELECT * FROM admin_activity_notifications WHERE sent = false;
```

---

## Next Steps

Now that the admin dashboard is set up, you can:

1. **Phase 1: SEO Management** - Build SEO Hubs, Spokes, Citations pages
2. **Phase 2: Platform Management** - Build Users, Listings, Bookings, Reviews pages
3. **Phase 3: Business & System** - Build Reports, Settings, Financials pages

Each page will follow the same pattern as the Admin Users page:
- HubPageLayout + HubHeader + HubTabs
- 4-card sidebar (Stats, Help, Tips, Video)
- Permission-gated actions
- Full CRUD with audit logging

---

## Support

For questions or issues:
1. Check the audit logs: `/admin/audit-logs` (coming in Phase 2)
2. Review the database functions and permissions
3. Check browser console for permission errors
4. Verify middleware is correctly protecting routes

---

**Documentation Version**: 1.0
**Last Updated**: 2025-12-23
