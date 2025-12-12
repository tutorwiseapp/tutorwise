# Organisation (My Organisation)

**Status**: Active
**Last Code Update**: 2025-12-03
**Last Doc Update**: 2025-12-12
**Priority**: High (Tier 2 - Agency/School Management)
**Architecture**: Virtual Entity Multi-Tenant System

## Quick Links
- [Solution Design](./organisation-solution-design.md) - Complete architecture, database schema, integration points
- [Implementation Guide](./organisation-implementation.md) - Developer guide, common tasks, API reference
- [AI Prompt Context](./organisation-prompt.md) - AI assistant context for organization feature

## Overview

The Organisation feature enables tutoring agencies, schools, and institutions to manage teams of tutors/teachers and aggregate client data under a unified organization account. This implements a **Virtual Entity** architecture where organisations are special-purpose connection groups owned by users with the agent role, eliminating the need for separate organizational authentication while providing enterprise-level features.

**Key Innovation**: Instead of creating a complex separate "Organisation User Type," we upgrade the existing Network Groups system (v4.4) to support "Business Identities." An organisation is simply a special type of group (`connection_groups.type = 'organisation'`) that owns branding, invites members, and aggregates data.

## Key Features

### Core Capabilities
- **Organization Creation**: Create and manage organizations (agent role required)
- **Team Management**: Add/remove tutors and teachers as organization members
- **Client Aggregation**: View all students taught by organization members
- **Commission Management**: Set default and individual commission rates for members
- **Member Analytics**: Track revenue, active students, and last session per member
- **Verification System**: DBS certificate and identity document tracking
- **Internal Notes**: Private notes per team member (visible only to owner)

### Hub Architecture (v3.2)
- **3-Tab Interface**: Team | Clients | Organisation Info
- **Context Sidebar**: Stats widget, help resources, video tutorials
- **Search & Filter**: Real-time search, multi-sort options
- **Pagination**: 4 items per page for optimal performance
- **Export**: CSV export functionality for team and clients
- **Empty States**: HubEmptyState component for zero-data scenarios

### Member Management
- **Invitation System**: Email-based member invites (integrates with wiselist invitations v5.0)
- **Role Assignment**: Default "Tutor" role for all members
- **Commission Rates**: Organization-level default + per-member overrides
- **Verification Status**: Track member verification completion
- **Analytics Dashboard**: Revenue, active students, last session per member

### Data Aggregation
- **Team View**: List all organization members with stats
- **Client Aggregation**: Derived relationship - organization "sees" all students taught by team members
- **Revenue Tracking**: Total revenue via `get_agency_member_analytics()` RPC function
- **Activity Tracking**: Last session timestamps for each member

## Implementation Status

### ✅ Completed (v6.1)
- Organization creation (agent role required)
- Member management (invite, remove, manage)
- Commission rate system (default + overrides)
- Analytics dashboard (revenue, students, sessions)
- Team tab with member cards
- Clients tab with aggregated students
- Info tab with organization settings
- Verification document tracking (DBS, ID)
- Internal notes per member
- Search and filtering
- Pagination (4 items per page)
- CSV export
- Empty state handling
- Hub layout integration (v3.2)

### 🚧 In Progress
- Public organization profiles (`/organisation/[slug]`)
- Advanced role-based access (beyond owner)
- Organization groups/sub-teams

### 📋 Planned (Future Enhancements)
- Unified billing at organization level
- Advanced analytics (conversion funnels, trends)
- Multi-role support (admin, manager, tutor)
- Organization-level branding (white-label)
- Automated onboarding workflows for new members

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    ORGANISATION ARCHITECTURE                      │
└──────────────────────────────────────────────────────────────────┘

1. Agent creates organization (agent role required)
   ↓
2. Organization entity created: connection_groups (type='organisation')
   ↓
3. Agent invites tutors via email
   ↓
4. Invitation creates wiselist_invitation record
   ↓
5. Tutor accepts → profile_graph relationship created (SOCIAL)
   ↓
6. group_members record created (links group ↔ connection)
   ↓
7. Organization views:
   - Team: All members with analytics
   - Clients: All students taught by team members (derived via profile_graph)
   - Info: Organization settings and branding
```

## Database Schema

### Core Tables

```sql
-- connection_groups (Organization entity)
connection_groups {
  id UUID PRIMARY KEY,
  profile_id UUID,                    -- Owner (agent)
  name TEXT,
  slug TEXT UNIQUE,                   -- URL-safe identifier
  type TEXT,                          -- 'organisation' (special type)
  avatar_url TEXT,                    -- Logo
  description TEXT,                   -- Public bio
  website TEXT,
  member_count INT,                   -- Denormalized count
  settings JSONB,                     -- {default_commission_rate: 10}
  -- Contact info
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  -- Address
  address_line1 TEXT,
  address_town TEXT,
  address_city TEXT,
  address_postcode TEXT,
  address_country TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
}

-- group_members (Team membership)
group_members {
  group_id UUID,                      -- FK to connection_groups
  connection_id UUID,                 -- FK to profile_graph
  added_at TIMESTAMPTZ,
  -- Agency management (v6.3)
  commission_rate NUMERIC(5,2),      -- Individual override (%)
  internal_notes TEXT,                -- Private notes
  is_verified BOOLEAN                 -- Verification status
}

-- profile_graph (Relationships)
profile_graph {
  id UUID PRIMARY KEY,
  source_profile_id UUID,             -- Agent or Tutor
  target_profile_id UUID,             -- Tutor or Student
  relationship_type TEXT,             -- 'SOCIAL' (Agent-Tutor), 'GUARDIAN' (Tutor-Student)
  created_at TIMESTAMPTZ
}
```

### Database Functions

```sql
-- Get member analytics
CREATE FUNCTION get_agency_member_analytics(org_id UUID)
RETURNS TABLE (
  member_id UUID,
  total_revenue NUMERIC,
  last_session_at TIMESTAMP,
  active_students INT
);
```

## API Routes

### Organization Management
```typescript
GET  /api/organisation              // Get current user's organization
POST /api/organisation/create       // Create new organization
PUT  /api/organisation/:id          // Update organization details
```

### Member Management
```typescript
GET    /api/organisation/:id/members     // List members
POST   /api/organisation/:id/invite      // Invite member
DELETE /api/organisation/:id/members/:id // Remove member
PUT    /api/organisation/:id/members/:id // Update member settings
```

### Analytics
```typescript
GET /api/organisation/:id/stats    // Get organization stats
GET /api/organisation/:id/clients  // Get aggregated clients
```

## Key Files

### Frontend
```
apps/web/src/app/
├── (authenticated)/organisation/
│   └── page.tsx                                  # Organization hub (730 lines)
│
├── components/feature/organisation/
│   ├── MemberCard.tsx                            # Team member card
│   ├── OrganisationStudentCard.tsx               # Client card
│   ├── OrganisationInfoTab.tsx                   # Settings tab
│   ├── OrganisationInviteMemberModal.tsx         # Invite UI
│   ├── ManageMemberModal.tsx                     # Member management
│   ├── OrganisationStatsWidget.tsx               # Sidebar stats
│   ├── OrganisationHelpWidget.tsx                # Help resources
│   ├── OrganisationTipWidget.tsx                 # Tips widget
│   └── OrganisationVideoWidget.tsx               # Video tutorials
│
└── lib/api/
    └── organisation.ts                           # API client (633 lines)
```

### Backend
```
apps/api/
└── migrations/
    └── 091_upgrade_network_groups.sql            # Organization schema
```

## System Integrations

The organisation system integrates with **8 major platform features**:

1. **Network Groups (v4.4)** - Organisations are connection_groups with special type
2. **Wiselist Invitations (v5.0)** - Member invitation system
3. **Profile Graph (v4.6)** - Agent-Tutor and Tutor-Student relationships
4. **Hub Architecture (v3.2)** - Standard hub layout with sidebar
5. **Bookings** - Member analytics via booking data
6. **Payments** - Commission rate management
7. **Auth** - Agent role verification for creation
8. **Referrals** - Commission delegation integration

See [organisation-solution-design.md](./organisation-solution-design.md) for detailed integration documentation.

## Routes

- `/organisation` - Organization dashboard (authenticated, agent role)

## Usage Examples

### Create Organization

```typescript
const organisation = await createOrganisation({
  name: "Michael's Tutoring Agency",
  description: "Premier maths tutoring in London",
  website: "https://example.com"
});
```

### Invite Team Member

```typescript
await inviteMember(organisationId, {
  email: "tutor@example.com",
  role: "tutor"
});
```

### View Team Members

```typescript
const members = await getOrganisationMembers(organisationId);
// Returns: OrganisationMember[] with analytics
```

### Update Member Commission Rate

```typescript
await updateMemberSettings(organisationId, connectionId, {
  commission_rate: 15, // Override default 10%
  internal_notes: "Top performer - increased rate"
});
```

### View Aggregated Clients

```typescript
const clients = await getOrganisationClients(organisationId);
// Returns all students taught by organization members
```

## Performance

### Database Optimization

```sql
-- Indexes for high-traffic queries
CREATE INDEX idx_connection_groups_type ON connection_groups(type);
CREATE INDEX idx_connection_groups_slug ON connection_groups(slug);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_profile_graph_source ON profile_graph(source_profile_id);
CREATE INDEX idx_profile_graph_type ON profile_graph(relationship_type);
```

### Caching Strategy

```typescript
// React Query caching
queryClient.setQueryData(['organisation', userId], organisation, {
  staleTime: 5 * 60 * 1000  // 5 minutes
});

queryClient.setQueryData(['organisation-members', orgId], members, {
  staleTime: 2 * 60 * 1000  // 2 minutes
});
```

### Lazy Loading

```typescript
// Clients tab only loads when active
const { data: clients } = useQuery({
  queryKey: ['organisation-clients', organisation?.id],
  queryFn: () => getOrganisationClients(organisation!.id),
  enabled: !!organisation && activeTab === 'clients', // ← Only when tab active
  staleTime: 5 * 60 * 1000
});
```

## Security & Access Control

### RLS Policies

```sql
-- Public can view organisations
CREATE POLICY "Public can view organisations"
  ON connection_groups FOR SELECT
  USING (type = 'organisation');

-- Only owner can manage
CREATE POLICY "Owner can manage organisation"
  ON connection_groups FOR UPDATE
  USING (profile_id = auth.uid());
```

### API Guards

```typescript
// All mutation functions verify ownership
const { data: org } = await supabase
  .from('connection_groups')
  .select('profile_id')
  .eq('id', organisationId)
  .single();

if (org.profile_id !== user.id) {
  throw new Error('Unauthorized');
}
```

### Role Requirements

```typescript
// Only agents can create organisations
const { data: profile } = await supabase
  .from('profiles')
  .select('roles')
  .eq('id', user.id)
  .single();

if (!profile.roles || !profile.roles.includes('agent')) {
  throw new Error('Only users with the agent role can create organisations');
}
```

## Monitoring

### Key Metrics

```typescript
{
  "total_organisations": 127,
  "avg_team_size": 8.4,
  "total_members": 1068,
  "total_clients_served": 4234,
  "avg_monthly_revenue_per_org": 3420.50,
  "member_retention_rate": 0.92
}
```

### Health Checks

```typescript
// Monitor organization health
if (org.member_count === 0) {
  alert('Empty organization - needs first member invite');
}

if (stats.total_clients === 0 && stats.team_size > 3) {
  alert('Large team with no clients - investigate');
}
```

## Troubleshooting

### Issue 1: Cannot Create Organization

**Symptoms**: "Only users with the agent role can create organisations" error

**Solution**: Verify user has agent role
```sql
SELECT roles FROM profiles WHERE id = :user_id;
-- Should include 'agent'
```

### Issue 2: Members Not Showing

**Symptoms**: Team tab shows empty despite invitations accepted

**Debug**:
```sql
-- Check group_members records
SELECT * FROM group_members WHERE group_id = :org_id;

-- Check profile_graph connections
SELECT * FROM profile_graph
WHERE id IN (SELECT connection_id FROM group_members WHERE group_id = :org_id);
```

### Issue 3: Clients Tab Empty

**Symptoms**: Clients tab shows no students despite members having students

**Debug**:
```sql
-- Check if members have GUARDIAN relationships
SELECT pg.* FROM profile_graph pg
JOIN group_members gm ON gm.connection_id = pg.id
WHERE gm.group_id = :org_id AND pg.relationship_type = 'GUARDIAN';
```

## Related Documentation

- [Network Solution Design](../network/network-solution-design.md) - Connection groups architecture
- [Hub Architecture](../hub/hub-solution-design.md) - Standard hub layout
- [Profile Graph](../profile-graph/profile-graph-solution-design.md) - Relationship tracking
- [Wiselist Invitations](../invitations/invitations-solution-design.md) - Invitation system

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-12 | v6.1 | Documentation complete with comprehensive guides |
| 2025-12-03 | v6.1 | Migrated Team and Clients tabs to HubEmptyState |
| 2025-11-29 | v6.1 | Migrated to Hub Layout Architecture |
| 2025-11-19 | v6.0 | Initial organisation implementation |

---

**Last Updated**: 2025-12-12
**Version**: v6.1
**Status**: Active - Feature Complete
**Architecture**: Virtual Entity Multi-Tenant System
