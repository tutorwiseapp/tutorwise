# Profile Graph - Implementation Guide

**Version**: v4.6 (Unified Relationship Management)
**Date**: 2025-12-12
**Target Audience**: Developers implementing profile-graph features

---

## File Structure

```
apps/web/src/
├─ lib/api/
│   └─ profile-graph.ts                  # ProfileGraphService (411 lines)
│
apps/api/migrations/
├─ 061_add_profile_graph_v4_6.sql        # Create profile_graph table
├─ 062_migrate_connections_to_profile_graph.sql  # Data migration
├─ 061_add_profile_graph_v4_6_rollback.sql       # Rollback script
└─ 062_migrate_connections_to_profile_graph_rollback.sql
```

---

## Setup Instructions

### Database Setup

```bash
# Run migrations
psql $DATABASE_URL -f apps/api/migrations/061_add_profile_graph_v4_6.sql
psql $DATABASE_URL -f apps/api/migrations/062_migrate_connections_to_profile_graph.sql

# Verify
psql $DATABASE_URL -c "\d profile_graph"
```

### Development Workflow

```bash
cd apps/web
npm install
npm run dev
```

---

## Common Tasks

### Task 1: Create a Social Connection Request

```typescript
import { ProfileGraphService } from '@/lib/api/profile-graph';

// Send connection request
await ProfileGraphService.sendConnectionRequest(userId, friendId);

// Check connection requests
const requests = await ProfileGraphService.getPendingSocialRequests(userId);
```

### Task 2: Create a Guardian Link

```typescript
// Parent creates link to student
await ProfileGraphService.createLink({
  sourceId: parentId,
  targetId: studentId,
  type: 'GUARDIAN',
  status: 'ACTIVE',
  metadata: {
    student_email: 'student@example.com',
    invitation_sent_at: new Date().toISOString()
  }
});

// Get all students
const students = await ProfileGraphService.getGuardianLinks(parentId);
```

### Task 3: Create a Booking Link

```typescript
// After booking completion
await ProfileGraphService.createLink({
  sourceId: clientId,
  targetId: tutorId,
  type: 'BOOKING',
  status: 'COMPLETED',
  metadata: {
    booking_id: bookingId,
    student_id: studentId
  }
});

// Check if client has booked tutor
const hasBooked = await ProfileGraphService.linkExists(
  clientId,
  tutorId,
  'BOOKING'
);
```

### Task 4: Query All Relationships

```typescript
// Get all SOCIAL connections (bidirectional)
const connections = await ProfileGraphService.getSocialLinks(userId);

// Get outgoing links only
const outgoing = await ProfileGraphService.getOutgoingLinks(userId, 'GUARDIAN');

// Get incoming links only
const incoming = await ProfileGraphService.getIncomingLinks(userId, 'AGENT_REFERRAL');
```

### Task 5: Update or Delete Relationships

```typescript
// Accept connection request
await ProfileGraphService.acceptConnectionRequest(linkId);

// Block user
await ProfileGraphService.blockUser(linkId);

// Delete relationship
await ProfileGraphService.deleteLink(linkId);
```

---

## API Reference

### ProfileGraphService.createLink()

**Purpose**: Create a new relationship between two users

**Parameters**:
```typescript
interface CreateLinkParams {
  sourceId: string;      // UUID of source profile
  targetId: string;      // UUID of target profile
  type: RelationshipType;
  status?: RelationshipStatus;
  metadata?: Record<string, any>;
}
```

**Returns**: `Promise<ProfileGraphLink | null>`

**Example**:
```typescript
const link = await ProfileGraphService.createLink({
  sourceId: userId,
  targetId: friendId,
  type: 'SOCIAL',
  status: 'PENDING'
});
```

### ProfileGraphService.getUserLinks()

**Purpose**: Get all relationships for a user (bidirectional)

**Parameters**:
- `profileId` (string, required)
- `type` (RelationshipType, optional)
- `status` (RelationshipStatus, optional)

**Returns**: `Promise<ProfileGraphLink[]>`

**Example**:
```typescript
// Get all active social links
const links = await ProfileGraphService.getUserLinks(userId, 'SOCIAL', 'ACTIVE');
```

### ProfileGraphService.linkExists()

**Purpose**: Check if a relationship exists

**Parameters**:
- `sourceId` (string, required)
- `targetId` (string, required)
- `type` (RelationshipType, required)
- `status` (RelationshipStatus, optional)

**Returns**: `Promise<boolean>`

**Example**:
```typescript
const exists = await ProfileGraphService.linkExists(
  parentId,
  studentId,
  'GUARDIAN',
  'ACTIVE'
);
```

---

## Database Queries

### Get All Connections (Bidirectional)

```sql
SELECT * FROM profile_graph
WHERE (source_profile_id = $1 OR target_profile_id = $1)
  AND relationship_type = 'SOCIAL'
  AND status = 'ACTIVE'
ORDER BY created_at DESC;
```

### Get Outgoing Links Only

```sql
SELECT * FROM profile_graph
WHERE source_profile_id = $1
  AND relationship_type = 'GUARDIAN'
  AND status = 'ACTIVE'
ORDER BY created_at DESC;
```

### Check if Relationship Exists

```sql
SELECT EXISTS (
  SELECT 1 FROM profile_graph
  WHERE source_profile_id = $1
    AND target_profile_id = $2
    AND relationship_type = 'BOOKING'
) AS link_exists;
```

---

## Testing

### Manual Testing Checklist

- [ ] Create SOCIAL link with PENDING status
- [ ] Accept SOCIAL link → status changes to ACTIVE
- [ ] Create GUARDIAN link (parent → student)
- [ ] Create BOOKING link with COMPLETED status
- [ ] Create AGENT_REFERRAL link
- [ ] Query bidirectional SOCIAL links
- [ ] Query outgoing GUARDIAN links
- [ ] Query incoming AGENT_REFERRAL links
- [ ] Block user → status changes to BLOCKED
- [ ] Delete link → row removed from table
- [ ] Verify RLS: User can only see their own links
- [ ] Verify constraint: Cannot create self-link
- [ ] Verify constraint: Cannot duplicate (source, target, type)

---

**Last Updated**: 2025-12-12
**Version**: v4.6
**Maintainer**: Platform Team
