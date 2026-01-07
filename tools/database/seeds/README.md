# Database Seeds

This directory contains database seed scripts for setting up initial data and administrative access.

## Directory Structure

```
seeds/
├── README.md                                 # This file
├── 001_grant_superadmin_access.sql           # Grant superadmin access to platform owners
└── rollback/
    └── 001_revoke_superadmin_access.sql      # Emergency rollback for superadmin access
```

## Seed Scripts

### 001_grant_superadmin_access.sql

**Purpose**: Grant superadmin access to platform owners and key personnel

**What it does**:
1. Updates the profiles table to set `is_admin = true` and `admin_role = 'superadmin'`
2. Sets `admin_role_level = 4` (highest level)
3. Creates audit log entries for compliance
4. Queues email notifications to inform users
5. Displays verification output

**When to use**:
- Initial platform setup
- Granting superadmin access to new platform owners
- Disaster recovery (if admin access is lost)
- After database restore

**Security considerations**:
- This script grants FULL platform access
- Only run for trusted personnel
- All grants are logged in `admin_audit_logs` table
- Idempotent - safe to run multiple times

**Usage**:
```bash
# Using psql with connection pooler
PGPASSWORD="your_password" psql \
  "postgresql://postgres.project:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  -f tools/database/seeds/001_grant_superadmin_access.sql

# Or using direct connection
PGPASSWORD="your_password" psql \
  "postgresql://postgres.project:password@db.project.supabase.co:5432/postgres" \
  -f tools/database/seeds/001_grant_superadmin_access.sql
```

**Verification**:
After running, verify the grant:
```sql
SELECT
  id,
  email,
  is_admin,
  admin_role,
  admin_role_level,
  admin_granted_at
FROM profiles
WHERE email = 'micquan@gmail.com';
```

Expected output:
```
is_admin: true
admin_role: superadmin
admin_role_level: 4
```

## Rollback Scripts

### rollback/001_revoke_superadmin_access.sql

**Purpose**: Emergency rollback to revoke superadmin access

**When to use**:
- Testing seed scripts in development
- Emergency revocation of compromised account
- Decommissioning platform owners

**WARNING**: This script removes superadmin access. Only use in controlled situations.

**Usage**:
```bash
PGPASSWORD="your_password" psql \
  "postgresql://..." \
  -f tools/database/seeds/rollback/001_revoke_superadmin_access.sql
```

## Admin System Architecture

### Database Schema

The admin system uses these tables:

1. **profiles** - Stores admin flags
   - `is_admin` (boolean) - Whether user has admin access
   - `admin_role` (enum) - Role: superadmin, admin, systemadmin, supportadmin
   - `admin_role_level` (integer) - Hierarchy level (1-4)
   - `admin_permissions` (jsonb) - Custom permissions object
   - `admin_granted_by` (uuid) - Who granted admin access
   - `admin_granted_at` (timestamp) - When access was granted

2. **admin_role_permissions** - Role-based permissions
   - Defines what each role can do (resource + action)
   - Example: ('superadmin', '*', '*') = full access

3. **admin_user_permission_overrides** - User-specific overrides
   - Grant additional permissions to specific users
   - Revoke role permissions from specific users

4. **admin_audit_logs** - Audit trail
   - Logs ALL admin actions
   - Required for compliance and security audits

5. **admin_activity_notifications** - Email notifications
   - Queued emails for admin activity
   - Sent by background job

### Admin Roles Hierarchy

```
Level 4: Superadmin    - Full platform access, can manage all admins
Level 3: Admin         - SEO & content management, can manage lower admins
Level 2: System Admin  - Platform config & monitoring, can manage support admins
Level 1: Support Admin - User support & moderation
```

### Permission System

Permissions are checked in this order:
1. **User-specific overrides** (highest priority)
2. **Role-based permissions**
3. **Wildcard permissions** (*, *)

Example permission checks:
```sql
-- Check if user has specific permission
SELECT has_admin_permission(
  'user_id_here',
  'organisations',  -- resource
  'manage'          -- action
);

-- Get all permissions for a user
SELECT * FROM get_user_admin_permissions('user_id_here');
```

## Middleware Protection

The `/admin/*` routes are protected by middleware at [apps/web/src/middleware.ts:232-265](../../apps/web/src/middleware.ts#L232-L265):

```typescript
// Middleware checks:
1. User is authenticated
2. User has is_admin = true in profiles table
3. Updates last_admin_access timestamp
4. Logs access attempt
```

## API Route Protection

All admin API routes check `is_admin` flag:

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin, admin_role')
  .eq('id', user.id)
  .single();

if (!profile?.is_admin) {
  return NextResponse.json(
    { error: 'Forbidden - Admin access required' },
    { status: 403 }
  );
}
```

## Security Best Practices

1. **Restrict Access**
   - Only grant superadmin to trusted personnel
   - Use lower roles (admin, systemadmin, supportadmin) when possible
   - Review admin access regularly

2. **Audit Logs**
   - All admin actions are logged in `admin_audit_logs`
   - Review logs regularly for suspicious activity
   - Logs include: action, resource, IP address, user agent

3. **Version Control**
   - Seed scripts are version controlled
   - Track who runs them and when
   - Use rollback scripts for emergencies

4. **Database Credentials**
   - Never commit database passwords to git
   - Use environment variables or secure vaults
   - Rotate credentials regularly

5. **Testing**
   - Always test seed scripts in development first
   - Use rollback scripts to clean up after testing
   - Verify grants with SQL queries

## Troubleshooting

### Issue: "Middleware: Error fetching profile"

**Cause**: Database connection issue or profile doesn't exist

**Fix**:
```sql
-- Check if profile exists
SELECT id, email, is_admin FROM profiles WHERE email = 'your@email.com';

-- If missing, user needs to sign up first
```

### Issue: "Middleware: User attempted to access admin dashboard without admin privileges"

**Cause**: `is_admin` flag not set or set to false

**Fix**:
Run the seed script:
```bash
psql "postgresql://..." -f tools/database/seeds/001_grant_superadmin_access.sql
```

### Issue: Admin access works but specific actions fail

**Cause**: Role doesn't have permission for specific resource/action

**Fix**:
Check permissions:
```sql
-- View user's permissions
SELECT * FROM get_user_admin_permissions((
  SELECT id FROM profiles WHERE email = 'your@email.com'
));

-- Check if user has specific permission
SELECT has_admin_permission(
  (SELECT id FROM profiles WHERE email = 'your@email.com'),
  'organisations',
  'manage'
);
```

## Adding New Admins

To grant admin access to additional users:

1. Copy `001_grant_superadmin_access.sql` to a new file (e.g., `002_grant_admin_access.sql`)
2. Update the email address
3. Change the role if needed (superadmin, admin, systemadmin, or supportadmin)
4. Run the new seed script
5. Commit the script to version control

Example:
```sql
UPDATE profiles
SET
  is_admin = true,
  admin_role = 'admin',  -- Changed from 'superadmin'
  admin_role_level = 3,  -- Changed from 4
  -- ...
WHERE email = 'new.admin@example.com';
```

## Migration History

- **Migration 135**: Added admin system (is_admin, admin_role, audit logs)
- **Migration 136**: Added RBAC permissions system and role hierarchy
- **Seed 001**: Initial superadmin grant script

## Related Documentation

- [Admin Dashboard Specification](../../docs/admin-dashboard-spec.md)
- [RBAC System Design](../../docs/rbac-design.md)
- [Security Policy](../../docs/security-policy.md)
- [Audit Logging Guide](../../docs/audit-logging.md)

## Support

For questions or issues:
- Email: platform@tutorwise.com
- Slack: #platform-admin channel
- Emergency: Contact CTO directly
