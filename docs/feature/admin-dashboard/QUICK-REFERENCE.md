# Admin Dashboard - Quick Reference Guide

**Quick lookup for common admin dashboard tasks**

---

## Quick Start (30 seconds)

```bash
# Set your database URL
export DATABASE_URL="postgresql://user:password@localhost:5432/tutorwise"

# Run the setup script
cd tools/database/scripts
./test-admin-setup.sh

# Start dev server
cd ../../../apps/web
npm run dev

# Open admin dashboard
# http://localhost:3000/admin
```

---

## Database Quick Commands

### Check Admin Users
```sql
SELECT email, is_admin, admin_role, last_admin_access
FROM profiles
WHERE is_admin = true
ORDER BY admin_role, email;
```

### Grant Superadmin (Manual)
```sql
UPDATE profiles
SET is_admin = true, admin_role = 'superadmin'
WHERE email = 'your-email@example.com';
```

### Revoke Admin (Manual)
```sql
UPDATE profiles
SET is_admin = false, admin_role = NULL
WHERE email = 'user@example.com';
```

### Check Permissions Count
```sql
SELECT role, COUNT(*) as permission_count
FROM admin_role_permissions
GROUP BY role
ORDER BY role;
```

### View Recent Audit Logs
```sql
SELECT
  action,
  actor_email,
  target_email,
  details->>'reason' as reason,
  created_at
FROM admin_audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Check Pending Email Notifications
```sql
SELECT
  recipient_email,
  subject,
  notification_type,
  created_at
FROM admin_activity_notifications
WHERE sent = false
ORDER BY created_at;
```

### Clear Old Audit Logs (>90 days)
```sql
DELETE FROM admin_audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## API Endpoints

### List Admin Users
```bash
curl http://localhost:3000/api/admin/users
```

### Grant Admin Access
```bash
curl -X POST http://localhost:3000/api/admin/users/manage \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@example.com",
    "role": "supportadmin",
    "reason": "Onboarding new support team member"
  }'
```

### Change Admin Role
```bash
curl -X PATCH http://localhost:3000/api/admin/users/manage \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "newRole": "admin",
    "reason": "Promotion to admin"
  }'
```

### Revoke Admin Access
```bash
curl -X DELETE http://localhost:3000/api/admin/users/manage \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "reason": "Team member departure"
  }'
```

### Process Email Notifications (Cron)
```bash
curl -X GET http://localhost:3000/api/admin/notifications/process \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Permission Checking (Code)

### Client-Side Hook
```typescript
import { usePermission } from '@/lib/rbac';

function MyComponent() {
  const { hasAccess, isLoading } = usePermission('seo', 'create');

  if (!hasAccess) return null;
  return <CreateButton />;
}
```

### Server-Side Function
```typescript
import { hasPermissionServer } from '@/lib/rbac';

export async function POST(request: NextRequest) {
  const canCreate = await hasPermissionServer('seo', 'create');
  if (!canCreate) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ... proceed
}
```

### Permission Gate Component
```typescript
import PermissionGate from '@/app/components/admin/PermissionGate';

<PermissionGate resource="seo" action="create">
  <Button>Create Hub</Button>
</PermissionGate>
```

### Role Gate Component
```typescript
import RoleGate from '@/app/components/admin/RoleGate';

<RoleGate role="superadmin">
  <DangerousButton>Delete All</DangerousButton>
</RoleGate>
```

---

## Admin Roles

| Role | Level | Can Manage | Key Permissions |
|------|-------|-----------|----------------|
| **Superadmin** | 4 | All roles | Everything (*:*) |
| **Admin** | 3 | System, Support | SEO, Listings, Users (view) |
| **System Admin** | 2 | Support | Settings, Integrations, Reports |
| **Support Admin** | 1 | None | Users (view/suspend), Bookings, Disputes |

---

## Common Resources & Actions

### Resources
- `seo` - SEO content (hubs, spokes, citations)
- `users` - User management
- `listings` - Tutor listings
- `bookings` - Booking management
- `reviews` - Review moderation
- `financials` - Financial data
- `disputes` - Dispute resolution
- `reports` - Analytics reports
- `settings` - Platform settings
- `integrations` - Third-party integrations
- `audit_logs` - Audit log viewing
- `messages` - Message viewing (support)
- `admins` - Admin user management
- `*` - Wildcard (all resources)

### Actions
- `view` - View resource
- `create` - Create new items
- `update` - Edit existing items
- `delete` - Delete items
- `moderate` - Moderate content
- `approve` - Approve items
- `manage` - Full management
- `publish` - Publish content
- `suspend` - Suspend users/items
- `manage_lower` - Manage lower-level admins
- `*` - Wildcard (all actions)

---

## File Locations

### Database
- Migrations: `tools/database/migrations/095*.sql`, `096*.sql`
- Seed script: `tools/database/scripts/seed_superadmins.sql`
- Setup script: `tools/database/scripts/test-admin-setup.sh`

### RBAC Library
- Types: `apps/web/src/lib/rbac/types.ts`
- Permissions: `apps/web/src/lib/rbac/permissions.ts`
- Hooks: `apps/web/src/lib/rbac/hooks.ts`

### Components
- Sidebar: `apps/web/src/app/components/admin/sidebar/AdminSidebar.tsx`
- Layout: `apps/web/src/app/components/admin/layout/AdminLayout.tsx`
- Widgets: `apps/web/src/app/components/admin/widgets/`
- Modals: `apps/web/src/app/components/admin/modals/`
- Gates: `apps/web/src/app/components/admin/PermissionGate.tsx`, `RoleGate.tsx`

### Pages
- Overview: `apps/web/src/app/(admin)/admin/page.tsx`
- Admin Users: `apps/web/src/app/(admin)/admin/users/admins/page.tsx`

### API Routes
- List admins: `apps/web/src/app/api/admin/users/route.ts`
- Manage admins: `apps/web/src/app/api/admin/users/manage/route.ts`
- Email worker: `apps/web/src/app/api/admin/notifications/process/route.ts`

### Documentation
- Setup: `docs/feature/admin-dashboard/SETUP.md`
- Testing: `docs/feature/admin-dashboard/TESTING.md`
- Checklist: `docs/feature/admin-dashboard/TEST-CHECKLIST.md`
- This guide: `docs/feature/admin-dashboard/QUICK-REFERENCE.md`

---

## Troubleshooting Commands

### Check if migrations ran
```sql
-- Check if admin_role_type enum exists
\dT+ admin_role_type

-- Check if tables exist
\dt admin_*

-- Check if functions exist
\df has_admin_permission
\df get_user_admin_permissions
```

### Reset a user's admin access
```sql
-- If a user is stuck or has wrong permissions
UPDATE profiles
SET is_admin = false, admin_role = NULL, admin_permissions = NULL
WHERE email = 'user@example.com';

-- Then re-grant
UPDATE profiles
SET is_admin = true, admin_role = 'supportadmin'
WHERE email = 'user@example.com';
```

### Re-seed permissions
```sql
-- Delete existing permissions
DELETE FROM admin_role_permissions;

-- Re-run migration 096
\i tools/database/migrations/096_add_granular_rbac_permissions.sql
```

### Check middleware logs
```bash
# Start dev server with debug logging
DEBUG=* npm run dev

# Check for admin access logs in terminal
```

### Clear notification queue
```sql
-- Delete old sent notifications
DELETE FROM admin_activity_notifications
WHERE sent = true AND sent_at < NOW() - INTERVAL '30 days';

-- Delete failed notifications (if you want to retry)
UPDATE admin_activity_notifications
SET sent = false
WHERE sent = true AND sent_at IS NULL;
```

---

## Environment Variables

### Required
```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

### Optional (Email)
```bash
RESEND_API_KEY="re_..."          # If using Resend
SENDGRID_API_KEY="SG...."        # If using SendGrid
```

### Optional (Cron)
```bash
CRON_SECRET="your-secret-key"    # For notification worker
```

---

## Testing Shortcuts

### Quick Permission Test
```javascript
// In browser console on /admin page
fetch('/api/admin/users').then(r => r.json()).then(console.log);
```

### Quick Notification Test
```bash
export CRON_SECRET="test-123"
curl -H "Authorization: Bearer test-123" \
  http://localhost:3000/api/admin/notifications/process
```

### Quick Database Check
```bash
psql $DATABASE_URL -c "SELECT email, admin_role FROM profiles WHERE is_admin = true;"
```

---

## Common Tasks

### Add a new permission
```sql
INSERT INTO admin_role_permissions (role, resource, action, description)
VALUES
  ('admin', 'new_resource', 'view', 'View new resource'),
  ('admin', 'new_resource', 'create', 'Create new resource');
```

### Grant custom permission to specific user
```sql
INSERT INTO admin_user_permission_overrides (user_id, resource, action, granted, reason)
VALUES
  ('user-uuid', 'special_feature', 'access', true, 'Special access for testing');
```

### Change role hierarchy
Edit [apps/web/src/lib/rbac/types.ts](apps/web/src/lib/rbac/types.ts:14-36) and update `ROLE_HIERARCHY`.

### Add new admin role
1. Add to enum in migration 096
2. Add to `AdminRole` type in `types.ts`
3. Add to `ROLE_HIERARCHY` in `types.ts`
4. Seed permissions in migration 096
5. Update seed script if needed

---

## Performance Tips

### Index audit logs (if growing large)
```sql
CREATE INDEX idx_audit_logs_created ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_actor ON admin_audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON admin_audit_logs(action);
```

### Index notifications
```sql
CREATE INDEX idx_notifications_sent ON admin_activity_notifications(sent, created_at);
CREATE INDEX idx_notifications_recipient ON admin_activity_notifications(recipient_id);
```

### Clear old data
```bash
# Add this to a monthly cron job
psql $DATABASE_URL <<SQL
DELETE FROM admin_audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
DELETE FROM admin_activity_notifications WHERE sent = true AND sent_at < NOW() - INTERVAL '30 days';
SQL
```

---

## Getting Help

1. **Check logs**: Browser console + server terminal
2. **Check database**: Run verification queries above
3. **Check docs**: [SETUP.md](SETUP.md) | [TESTING.md](TESTING.md)
4. **Check audit logs**: See who did what and when
5. **Ask for help**: Include error messages and context

---

**Quick Reference Version**: 1.0
**Last Updated**: 2025-12-23
