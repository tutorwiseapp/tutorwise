# TUTOR-8: Apply Migrations and Extend Schema

**Status**: Done
**Assignee**: Michael Quan
**Priority**: Medium
**Type**: Sub-task

**Created**: 9/15/2025
**Updated**: 9/19/2025



## Description
Apply Vinite migrations and add Tutorwise-specific schema changes.


*Steps*:

# Initialize Supabase CLI: npx supabase init.
# Link project: supabase link --project-ref [project-id].
# Apply Vinite migrations: supabase db push.
# Execute SQL to extend schema:
{noformat}ALTER TABLE users ADD COLUMN roles TEXT[] DEFAULT ARRAY['client']::TEXT[];
ALTER TABLE users ADD COLUMN dob DATE;
ALTER TABLE users ADD COLUMN verification_flags JSONB DEFAULT '{}';
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own" ON users FOR ALL USING (auth.uid() = id);
CREATE INDEX idx_users_roles ON users USING GIN(roles);{noformat}

## Links
- [View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-8)

---
*Auto-generated from Jira on 2025-09-26T05:45:54.821Z*
