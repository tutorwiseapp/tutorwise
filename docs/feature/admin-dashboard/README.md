# Tutorwise Admin Dashboard

**Version**: 1.0
**Status**: ✅ Foundation Complete
**Created**: 2025-12-23

---

## What's This?

A comprehensive admin dashboard for Tutorwise with:

- ✅ **Granular RBAC** - 4 admin roles with fine-grained permissions
- ✅ **Full Admin UI** - Grant/revoke access, change roles, manage admins
- ✅ **Audit Logging** - Track every admin action automatically
- ✅ **Email Notifications** - Alert users about admin activities
- ✅ **Permission Gates** - Show/hide UI based on permissions
- ✅ **Database-Level Security** - Permission checking in PostgreSQL
- ✅ **Middleware Protection** - All /admin routes secured

---

## Quick Start

```bash
# 1. Set your database URL
export DATABASE_URL="postgresql://user:password@localhost:5432/tutorwise"

# 2. Run the setup script
cd tools/database/scripts
./test-admin-setup.sh

# 3. Start dev server
cd ../../../apps/web
npm run dev

# 4. Visit http://localhost:3000/admin
```

**Default superadmins:**
- michaelquan@tutorwise.io
- micquan@gmail.com
- tutorwiseapp@gmail.com

---

## Documentation

| Document | Purpose | Read This If... |
|----------|---------|----------------|
| **[SETUP.md](SETUP.md)** | Complete setup guide | You're setting up for the first time |
| **[TESTING.md](TESTING.md)** | Testing & deployment guide | You want to test or deploy |
| **[TEST-CHECKLIST.md](TEST-CHECKLIST.md)** | Manual testing checklist | You're doing QA testing |
| **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** | Quick lookup reference | You need a quick command/query |

---

## What's Built

### Phase 0: Foundation ✅ 100% Complete

- ✅ AdminSidebar component
- ✅ AdminLayout wrapper
- ✅ 4-card sidebar widgets (Stats, Help, Tips, Video)
- ✅ Database migrations (095, 096)
- ✅ RBAC library (types, permissions, hooks)
- ✅ Admin API routes (list, grant, revoke, change)
- ✅ Admin Users management page
- ✅ Grant/Revoke/Change Role modals
- ✅ Permission-gated components (PermissionGate, RoleGate)
- ✅ Email notification system
- ✅ Middleware protection
- ✅ Audit logging
- ✅ Seed scripts
- ✅ Complete documentation

**Total Files Created**: 30+
**Total Time**: ~9 hours

---

## Admin Roles

| Role | Level | Description | Can Manage |
|------|-------|-------------|-----------|
| **Superadmin** | 4 | Full platform control | All roles |
| **Admin** | 3 | SEO & content management | System, Support |
| **System Admin** | 2 | Platform config & monitoring | Support |
| **Support Admin** | 1 | User support & moderation | None |

---

## Key Features

### 1. Granular RBAC System
- Resource + action based permissions (e.g., `seo:create`, `users:view`)
- 60+ default permissions across 13 resources
- User-specific permission overrides
- Database-level permission checking functions

### 2. Admin User Management
- Grant admin access with role selection
- Change roles with hierarchy enforcement
- Revoke access with safeguards (no self-revoke, no last superadmin)
- All actions logged and notify via email

### 3. Audit Trail
- Every admin action logged automatically via database triggers
- Tracks: who, what, when, why (reason field)
- Immutable audit log (no updates/deletes allowed)

### 4. Email Notifications
- Queue-based system (database table)
- Cron job processes queue every 5 minutes
- Ready for Resend/SendGrid integration
- Notifies users of: admin granted, role changed, access revoked

### 5. Permission-Gated UI
```typescript
// Hide UI based on permissions
<PermissionGate resource="seo" action="create">
  <CreateButton />
</PermissionGate>

// Hide UI based on roles
<RoleGate role="superadmin">
  <DangerButton />
</RoleGate>
```

### 6. Secure by Default
- Middleware protects all /admin routes
- API routes check permissions before actions
- Database RLS policies enforce access control
- Role hierarchy prevents privilege escalation

---

## File Structure

```
tutorwise/
├── apps/web/src/
│   ├── app/
│   │   ├── (admin)/admin/                  # Admin pages
│   │   ├── api/admin/                      # Admin API routes
│   │   └── components/admin/               # Admin components
│   ├── lib/rbac/                           # RBAC library
│   └── middleware.ts                       # Updated
├── tools/database/
│   ├── migrations/
│   │   ├── 095_add_admin_dashboard_support.sql
│   │   └── 096_add_granular_rbac_permissions.sql
│   └── scripts/
│       ├── seed_superadmins.sql
│       └── test-admin-setup.sh
├── docs/feature/admin-dashboard/
│   ├── README.md                           # This file
│   ├── SETUP.md                            # Setup guide
│   ├── TESTING.md                          # Testing guide
│   ├── TEST-CHECKLIST.md                   # QA checklist
│   └── QUICK-REFERENCE.md                  # Quick lookup
└── vercel.json                             # Updated (cron)
```

---

## Database Schema

### Tables
- `profiles` - Extended with admin fields (is_admin, admin_role, admin_permissions)
- `admin_role_permissions` - Default permissions per role
- `admin_user_permission_overrides` - User-specific permission overrides
- `admin_audit_logs` - Immutable audit trail
- `admin_activity_notifications` - Email notification queue
- `platform_statistics_daily` - Daily platform stats

### Functions
- `has_admin_permission(user_id, resource, action)` - Check if user has permission
- `get_user_admin_permissions(user_id)` - Get all user permissions as JSONB
- `log_admin_action()` - Trigger function for audit logging

### Enums
- `admin_role_type` - superadmin | admin | systemadmin | supportadmin

---

## What's Next?

Now that the foundation is complete, you can build:

### Phase 1: SEO Management (8-10 hours)
- SEO Hubs page (create, edit, publish, delete hubs)
- SEO Spokes page (manage spoke content)
- Citations page (manage local citations)
- SEO Config page (meta tags, sitemaps, robots.txt)

### Phase 2: Platform Management (12-15 hours)
- Users page (view, suspend, moderate users)
- Listings page (approve, moderate, feature listings)
- Bookings page (view, cancel, refund bookings)
- Reviews page (moderate, approve, remove reviews)
- Messages page (view support conversations)

### Phase 3: Business & System (10-12 hours)
- Reports page (analytics, custom reports)
- Financials page (revenue, payouts, disputes)
- Settings page (platform config, feature flags)
- Integrations page (third-party services)
- Audit Logs page (search, filter audit trail)

---

## Common Commands

### Setup
```bash
./tools/database/scripts/test-admin-setup.sh
```

### Check Admin Users
```sql
SELECT email, admin_role FROM profiles WHERE is_admin = true;
```

### Grant Superadmin
```sql
UPDATE profiles SET is_admin = true, admin_role = 'superadmin'
WHERE email = 'your-email@example.com';
```

### Process Notifications
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/admin/notifications/process
```

### View Audit Logs
```sql
SELECT action, actor_email, target_email, created_at
FROM admin_audit_logs ORDER BY created_at DESC LIMIT 10;
```

---

## Support & Help

1. **Read the docs**: Start with [SETUP.md](SETUP.md)
2. **Check the checklist**: Use [TEST-CHECKLIST.md](TEST-CHECKLIST.md) for testing
3. **Quick lookup**: See [QUICK-REFERENCE.md](QUICK-REFERENCE.md)
4. **Check audit logs**: See what actions were taken and when
5. **Check browser console**: Look for errors or permission failures

---

## Architecture Decisions

### Why Granular Permissions?
- More flexible than simple role-based access
- Allows fine-tuning per user via overrides
- Scales better as features grow
- Database-level enforcement

### Why Database Functions?
- Single source of truth for permissions
- Enforced even with direct database access
- Prevents permission bypass via API
- Faster than application-level checks

### Why Queue-based Emails?
- Decouples email sending from user actions
- Prevents slow responses due to email API calls
- Automatic retry on failure
- Easy to swap email providers

### Why Audit Triggers?
- Automatic - no way to forget to log
- Immutable - no accidental deletions
- Complete - captures all admin actions
- Database-level - can't be bypassed

---

## Testing Status

| Test Category | Status | Notes |
|--------------|--------|-------|
| Database Migrations | ✅ Ready | Migrations 095, 096 created |
| Seed Scripts | ✅ Ready | Superadmin seed script ready |
| Permission System | ⏳ Needs Testing | Functions created, needs verification |
| Admin UI | ⏳ Needs Testing | All components built, needs QA |
| Email System | ⏳ Needs Integration | Queue working, needs Resend/SendGrid |
| Audit Logging | ⏳ Needs Testing | Triggers created, needs verification |
| Middleware | ⏳ Needs Testing | Routes protected, needs testing |

**Next Step**: Run through [TEST-CHECKLIST.md](TEST-CHECKLIST.md)

---

## Version History

### v1.0 (2025-12-23)
- ✅ Initial release
- ✅ Foundation complete (Phase 0)
- ✅ RBAC system implemented (Option B)
- ✅ Admin user management UI
- ✅ Email notification system
- ✅ Complete documentation

---

## Contributors

- **Michael Quan** - Initial implementation
- **Claude Sonnet 4.5** - AI-assisted development

---

## License

Proprietary - Tutorwise Platform

---

**Last Updated**: 2025-12-23
