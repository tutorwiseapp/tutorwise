# Archived Legacy Migrations

This folder contains legacy migration files that have been superseded by migrations in `apps/api/migrations/`.

## Why These Are Archived

These migration files were originally in `tools/database/migrations/` but have been moved here because:

1. **Duplicate numbering**: They used numbers (001, 092, 093, 094) that conflicted with the main migration sequence in `apps/api/migrations/`
2. **Already applied**: Migrations 094-097 (now 134-137) have already been applied to production
3. **Legacy systems**: Some migrations (001, 092, 093) are for older systems or were one-off migrations

## Current Migration System

**All new migrations** should be added to `apps/api/migrations/` with sequential numbering.

Last migration number: **137** (as of 2025-12-23)

## Archived Migrations

### Admin Dashboard Migrations (Applied to Production)
- `095_add_admin_dashboard_support.sql` → Now `apps/api/migrations/135_add_admin_dashboard_support.sql`
- `096_add_granular_rbac_permissions.sql` → Now `apps/api/migrations/136_add_granular_rbac_permissions.sql`
- `097_add_updated_at_to_profiles.sql` → Now `apps/api/migrations/137_add_updated_at_to_profiles.sql`

### Help Support Snapshots (Applied to Production)
- `094_create_help_support_snapshots.sql` → Now `apps/api/migrations/134_create_help_support_snapshots.sql`

### Legacy Standalone Migrations
- `001_add_onboarding_system.sql` - Comprehensive onboarding system (may differ from apps/api/migrations/001)
- `092_migrate_group_members_to_profile_graph.sql` - Profile graph migration
- `093_drop_legacy_connections_table.sql` - Cleanup migration

## Reference Only

These files are kept for historical reference and should not be applied again.
If you need to reference the original migration logic, you can find it here.
