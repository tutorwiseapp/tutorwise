# TUTOR-6: Configure Supabase for Tutorwise

**Status**: Done
**Assignee**: Michael Quan
**Priority**: Medium
**Type**: Story

**Created**: 9/15/2025
**Updated**: 9/19/2025



## Description
*As a developer*, I want to configure Supabase for Tutorwise, so that I can manage authentication, database, and storage with schemas tailored for roles and user data.


*BDD Format*:
Given I have a Supabase account and a new Tutorwise project,
When I create the project, apply initial migrations, and extend the schema for roles and user data,
Then the Supabase instance is fully configured with authentication, extended schema, and row-level security (RLS) policies, ready for Tutorwise role management.



*Acceptance Criteria*:

* Supabase project tutorwise-prod-db created with environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) in .env.local.
* Vinite migrations applied successfully.
* Schema extended with roles TEXT[], dob DATE, verification_flags JSONB, and RLS policies.
* Test query on users table returns expected fields (e.g., roles, DOB).

## Links
- [View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-6)

---
*Auto-generated from Jira on 2025-09-26T05:45:54.821Z*
