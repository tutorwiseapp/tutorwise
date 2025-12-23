# Database Migrations

This directory contains database migration scripts and related tools for the Tutorwise platform.

## Important Notice

**DEPRECATED**: This migration folder is no longer the primary location for migrations. All new migrations should be added to `apps/api/migrations/` with sequential numbering.

**Current Status**:
- **Primary migration folder**: `apps/api/migrations/` (migrations 001-137+)
- **This folder** (`tools/database/`): Contains utility scripts, seed data, and archived migrations
- **Seed scripts**: Located in `tools/database/scripts/`
- **Archived migrations**: Located in `tools/database/migrations-archive/`

## Folder Structure

```
tools/database/
├── README.md                          # This file
├── migrations-archive/                # Archived legacy migrations (reference only)
│   ├── README.md                      # Archive documentation
│   ├── 001_add_onboarding_system.sql
│   ├── 092_migrate_group_members_to_profile_graph.sql
│   ├── 093_drop_legacy_connections_table.sql
│   ├── 094_create_help_support_snapshots.sql → apps/api/migrations/134_...
│   ├── 095_add_admin_dashboard_support.sql → apps/api/migrations/135_...
│   ├── 096_add_granular_rbac_permissions.sql → apps/api/migrations/136_...
│   └── 097_add_updated_at_to_profiles.sql → apps/api/migrations/137_...
├── scripts/
│   ├── seed_superadmins.sql           # Seed initial superadmin users
│   └── test-admin-setup.sh            # Test admin dashboard setup
└── test_migration_compatibility.sql    # Migration validation tests
```

## Migration Files (Archived - Reference Only)

### Onboarding System (Migration 001)

#### Core Files
- `001_add_onboarding_system.sql` - Main migration to add onboarding system
- `001_add_onboarding_system_rollback.sql` - Rollback script (use with caution)
- `validate_onboarding_schema.sql` - Validation script to ensure migration worked

#### What This Migration Adds

**New Tables:**
- `role_details` - Stores detailed information for each role (seeker, provider, agent)
- `onboarding_sessions` - Tracks onboarding progress and form responses

**Extended Tables:**
- `profiles` - Adds `onboarding_completed`, `preferences`, `onboarding_progress` columns

**Helper Functions:**
- `get_onboarding_progress(user_id, role)` - Get current progress for a user/role
- `start_onboarding_session(user_id, role)` - Initialize new onboarding session
- `complete_onboarding(user_id, role, responses)` - Complete onboarding and save data
- `cleanup_abandoned_onboarding_sessions()` - Clean up old sessions

**Views:**
- `onboarding_status_view` - Easy querying of onboarding status across users

**Security:**
- Row Level Security (RLS) policies for user data protection
- Proper foreign key constraints and data validation

## How to Apply Migrations

All migrations are now in `apps/api/migrations/` and should be applied using the apply-migration scripts in the project root.

### Recommended Method: Apply Scripts

```bash
# Set environment variables (from .env.local)
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Apply a specific migration
node apply-migration-135.mjs
```

### Alternative: Direct psql

```bash
# Using POSTGRES_URL_NON_POOLING from .env.local
psql "$POSTGRES_URL_NON_POOLING" -f apps/api/migrations/135_add_admin_dashboard_support.sql
```

### For Admin Dashboard Setup

The admin dashboard requires migrations 135-137:

```bash
# 1. Basic admin support
node apply-migration-135.mjs

# 2. Granular RBAC permissions (31+ permissions seeded)
node apply-migration-136.mjs

# 3. Add updated_at field to profiles
node apply-migration-137.mjs

# 4. Seed initial superadmins
psql "$POSTGRES_URL_NON_POOLING" -f tools/database/scripts/seed_superadmins.sql
```

## Validation

After applying the migration, always run the validation script:

```sql
\i tools/database/migrations/validate_onboarding_schema.sql
```

This will check:
- ✅ All tables and columns were created
- ✅ All indexes are in place
- ✅ All functions and views exist
- ✅ RLS policies are properly configured
- ✅ Triggers are working

## Testing the Migration

### Basic Functionality Test

```sql
-- Test getting onboarding progress (should return empty for new user)
SELECT get_onboarding_progress('123e4567-e89b-12d3-a456-426614174000', 'seeker');

-- Test starting onboarding session
SELECT start_onboarding_session('123e4567-e89b-12d3-a456-426614174000', 'seeker');

-- Check session was created
SELECT * FROM onboarding_sessions WHERE profile_id = '123e4567-e89b-12d3-a456-426614174000';
```

### Sample Data for Development

```sql
-- Insert sample onboarding session (replace with real profile ID)
INSERT INTO onboarding_sessions (profile_id, role_type, current_step, responses) VALUES
    ('your-real-profile-id-here', 'seeker', 2, '{"subjects": ["math", "science"], "skillLevels": {"math": 3, "science": 2}}');

-- Insert sample role details
INSERT INTO role_details (profile_id, role_type, subjects, skill_levels, completed_at) VALUES
    ('your-real-profile-id-here', 'seeker', '{"math", "science"}', '{"math": 3, "science": 2}', NOW());
```

## Schema Overview

### role_details Table

Stores detailed information for each role a user has:

```sql
role_details (
    id UUID PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id),
    role_type TEXT ('seeker', 'provider', 'agent'),

    -- Common fields
    subjects TEXT[],
    skill_levels JSONB,
    goals TEXT[],

    -- Seeker-specific
    learning_style TEXT,
    budget_range JSONB,
    schedule_preferences JSONB,
    previous_experience BOOLEAN,

    -- Provider-specific
    teaching_experience JSONB,
    qualifications JSONB,
    availability JSONB,
    hourly_rate INTEGER,
    teaching_methods TEXT[],
    professional_background TEXT,

    -- Metadata
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    completed_at TIMESTAMP
)
```

### onboarding_sessions Table

Tracks onboarding progress and stores form responses:

```sql
onboarding_sessions (
    id UUID PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id),
    role_type TEXT,
    current_step INTEGER,
    total_steps INTEGER,
    completed_steps INTEGER[],
    responses JSONB,
    started_at TIMESTAMP,
    last_active TIMESTAMP,
    completed_at TIMESTAMP
)
```

### Data Flow

1. **Start Onboarding**: Call `start_onboarding_session(user_id, role_type)`
2. **Save Progress**: Update `onboarding_sessions.responses` as user progresses
3. **Complete Onboarding**: Call `complete_onboarding(user_id, role_type, final_responses)`
   - Creates/updates `role_details` record
   - Marks session as completed
   - Updates `profiles.roles` array if needed

## Troubleshooting

### Common Issues

**1. Foreign Key Constraint Errors**
```
ERROR: insert or update on table "role_details" violates foreign key constraint
```
- Ensure the `profile_id` exists in the `profiles` table
- Check that you're using the correct UUID format

**2. Check Constraint Violations**
```
ERROR: new row for relation "role_details" violates check constraint
```
- Ensure `role_type` is one of: 'seeker', 'provider', 'agent'
- Ensure `learning_style` is one of: 'visual', 'auditory', 'kinesthetic', 'reading'

**3. RLS Policy Errors**
```
ERROR: new row violates row-level security policy
```
- Ensure you're authenticated as the correct user
- Check that `auth.uid()` matches the `profile_id`

### Debug Queries

```sql
-- Check current onboarding status for all users
SELECT * FROM onboarding_status_view;

-- Find incomplete onboarding sessions
SELECT * FROM onboarding_sessions WHERE completed_at IS NULL;

-- Check role details completion status
SELECT
    profile_id,
    role_type,
    completed_at IS NOT NULL as is_completed,
    array_length(subjects, 1) as subject_count
FROM role_details;

-- Clean up test data
DELETE FROM onboarding_sessions WHERE profile_id = 'test-id';
DELETE FROM role_details WHERE profile_id = 'test-id';
```

## Rollback

⚠️ **WARNING**: Only use rollback in development. This will permanently delete all onboarding data.

```sql
\i tools/database/migrations/001_add_onboarding_system_rollback.sql
```

## Next Steps

After applying this migration:

1. ✅ Run validation script
2. ✅ Test basic functionality
3. ✅ Update your application code to use new tables
4. ✅ Implement API endpoints (see `/docs/features/role-management/onboarding-implementation-guide.md`)
5. ✅ Build frontend components
6. ✅ Add monitoring and analytics

## Support

For questions about this migration:
- Check the implementation guide: `/docs/features/role-management/onboarding-implementation-guide.md`
- Review the full specification: `/docs/features/role-management/user-onboarding-flow-specification.md`
- Check UX guidelines: `/docs/features/role-management/onboarding-ux-design.md`